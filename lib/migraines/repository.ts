import "server-only";
import { ObjectId, type Collection, type Filter, type IndexDescription } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { MigraineInput } from "@/lib/validation/migraine";
import {
  MIGRAINES_COLLECTION,
  toMigraine,
  toMigraineContent,
  type MigraineDocument,
} from "@/models/migraine";
import type {
  Migraine,
  MigraineFilter,
  MigraineListOptions,
} from "@/types/migraine";

/**
 * Data access for migraine episodes. Pure persistence: no authorization and no
 * business rules, so it stays testable and has exactly one job. Callers verify
 * the session before reaching this layer.
 */

/**
 * Driven by the queries the app actually makes:
 *  - every list and calendar view sorts or range-scans on the local start time
 *  - history filtering matches against the symptom and trigger arrays
 * Severity is deliberately left unindexed - it is always a secondary predicate
 * on an already narrow result set.
 */
const INDEXES: IndexDescription[] = [
  { key: { "timing.startedAtLocal": -1 }, name: "startedAtLocal_desc" },
  { key: { symptoms: 1 }, name: "symptoms_multikey" },
  { key: { possibleTriggers: 1 }, name: "possibleTriggers_multikey" },
];

let indexesReady: Promise<void> | null = null;

async function migraines(): Promise<Collection<MigraineDocument>> {
  const db = await getDb();
  const collection = db.collection<MigraineDocument>(MIGRAINES_COLLECTION);

  // Runs once per process, before the first query. `createIndexes` is
  // idempotent, so repeating it across restarts costs nothing.
  indexesReady ??= ensureIndexes(collection);
  await indexesReady;

  return collection;
}

async function ensureIndexes(
  collection: Collection<MigraineDocument>,
): Promise<void> {
  try {
    await collection.createIndexes(INDEXES);
  } catch (error) {
    // Indexes are an optimisation, not a correctness requirement. A database
    // user without index privileges should still get a working app.
    console.warn("[migraines] could not create indexes:", error);
  }
}

function buildFilter(filter: MigraineFilter): Filter<MigraineDocument> {
  const query: Filter<MigraineDocument> = {};

  if (filter.from !== undefined || filter.to !== undefined) {
    const range: { $gte?: string; $lte?: string } = {};
    // Wall-clock strings sort lexicographically, so date bounds are plain
    // string comparisons. "2026-08-01" precedes "2026-08-01T00:00", which
    // makes a bare date an inclusive lower bound as-is.
    if (filter.from !== undefined) range.$gte = filter.from;
    // Stored values have minute precision, so 23:59 really is the last
    // possible value within a day.
    if (filter.to !== undefined) range.$lte = `${filter.to}T23:59`;
    query["timing.startedAtLocal"] = range;
  }

  if (filter.minSeverity !== undefined || filter.maxSeverity !== undefined) {
    const range: { $gte?: number; $lte?: number } = {};
    if (filter.minSeverity !== undefined) range.$gte = filter.minSeverity;
    if (filter.maxSeverity !== undefined) range.$lte = filter.maxSeverity;
    query.severity = range;
  }

  if (filter.symptoms && filter.symptoms.length > 0) {
    query.symptoms = { $in: filter.symptoms };
  }

  if (filter.possibleTriggers && filter.possibleTriggers.length > 0) {
    query.possibleTriggers = { $in: filter.possibleTriggers };
  }

  if (filter.headacheType && filter.headacheType.length > 0) {
    query.headacheType = { $in: filter.headacheType };
  }

  if (filter.ongoing !== undefined) {
    query["duration.kind"] = filter.ongoing ? "ongoing" : { $ne: "ongoing" };
  }

  if (filter.status !== undefined) {
    query.status = filter.status;
  }

  return query;
}

export async function createMigraine(input: MigraineInput): Promise<string> {
  const collection = await migraines();
  const now = new Date();

  const result = await collection.insertOne({
    ...toMigraineContent(input),
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toHexString();
}

export async function getMigraineById(id: string): Promise<Migraine | null> {
  if (!ObjectId.isValid(id)) return null;

  const collection = await migraines();
  const document = await collection.findOne({ _id: new ObjectId(id) });
  return document ? toMigraine(document) : null;
}

export async function listMigraines(
  options: MigraineListOptions = {},
): Promise<Migraine[]> {
  const { limit, skip, sort = "newest", ...filter } = options;
  const collection = await migraines();

  let cursor = collection
    .find(buildFilter(filter))
    .sort({ "timing.startedAtLocal": sort === "newest" ? -1 : 1 });

  if (skip !== undefined && skip > 0) cursor = cursor.skip(skip);
  if (limit !== undefined && limit > 0) cursor = cursor.limit(limit);

  const documents = await cursor.toArray();
  return documents.map(toMigraine);
}

export async function countMigraines(
  filter: MigraineFilter = {},
): Promise<number> {
  const collection = await migraines();
  return collection.countDocuments(buildFilter(filter));
}

/** The episode still in progress, if there is one. */
export async function getOngoingMigraine(): Promise<Migraine | null> {
  const [ongoing] = await listMigraines({ ongoing: true, limit: 1 });
  return ongoing ?? null;
}

/** Returns `false` when no episode with that id exists. */
export async function updateMigraine(
  id: string,
  input: MigraineInput,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;

  const collection = await migraines();
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...toMigraineContent(input), updatedAt: new Date() } },
  );

  return result.matchedCount === 1;
}

/** Returns `false` when no episode with that id exists. */
export async function deleteMigraine(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;

  const collection = await migraines();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
