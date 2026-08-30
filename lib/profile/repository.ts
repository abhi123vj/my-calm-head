import "server-only";
import type { Collection, IndexDescription } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  PROFILES_COLLECTION,
  PROFILE_METADATA_PROJECTION,
  emptyProfile,
  toProfile,
  toProfileAvatar,
  toStoredAvatar,
  type ProfileDocument,
  type ProfileMetadataDocument,
} from "@/models/profile";
import type { Profile, ProfileAvatar } from "@/types/profile";

/**
 * Data access for the account holder's profile. Pure persistence, no
 * authorization: callers verify the session first, exactly as
 * `lib/migraines/repository.ts` does.
 */

/**
 * Every read and write here is a lookup by username, and the unique constraint
 * is what makes the upserts safe - without it two concurrent first-time saves
 * could each insert their own document.
 */
const INDEXES: IndexDescription[] = [
  { key: { username: 1 }, name: "username_unique", unique: true },
];

let indexesReady: Promise<void> | null = null;

async function profiles(): Promise<Collection<ProfileDocument>> {
  const db = await getDb();
  const collection = db.collection<ProfileDocument>(PROFILES_COLLECTION);

  indexesReady ??= ensureIndexes(collection);
  await indexesReady;

  return collection;
}

async function ensureIndexes(
  collection: Collection<ProfileDocument>,
): Promise<void> {
  try {
    await collection.createIndexes(INDEXES);
  } catch (error) {
    console.warn("[profile] could not create indexes:", error);
  }
}

/**
 * The profile, or an empty one when nothing has been saved yet.
 *
 * Never returns `null`: "no document" and "a profile with nothing filled in"
 * are the same thing to every caller, and collapsing them here keeps that
 * branch out of the UI.
 */
export async function getProfile(username: string): Promise<Profile> {
  const collection = await profiles();
  const document = await collection.findOne<ProfileMetadataDocument>(
    { username },
    { projection: PROFILE_METADATA_PROJECTION },
  );

  return document ? toProfile(document) : emptyProfile(username);
}

/** The avatar bytes, or `null` when there is no picture. */
export async function getProfileAvatar(
  username: string,
): Promise<ProfileAvatar | null> {
  const collection = await profiles();
  const document = await collection.findOne(
    { username, avatar: { $ne: null } },
    { projection: { avatar: 1 } },
  );

  return document?.avatar ? toProfileAvatar(document.avatar) : null;
}

export async function saveDisplayName(
  username: string,
  displayName: string | null,
): Promise<void> {
  const collection = await profiles();
  await collection.updateOne(
    { username },
    {
      $set: { displayName, updatedAt: new Date() },
      // The avatar is only initialised on insert, so saving a name never
      // disturbs a picture that is already there.
      $setOnInsert: { username, avatar: null, createdAt: new Date() },
    },
    { upsert: true },
  );
}

export async function saveAvatar(
  username: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const collection = await profiles();
  await collection.updateOne(
    { username },
    {
      $set: {
        avatar: toStoredAvatar(bytes, contentType),
        updatedAt: new Date(),
      },
      $setOnInsert: { username, displayName: null, createdAt: new Date() },
    },
    { upsert: true },
  );
}

/** Returns `true` when a picture was actually removed. */
export async function clearAvatar(username: string): Promise<boolean> {
  const collection = await profiles();
  const result = await collection.updateOne(
    { username, avatar: { $ne: null } },
    { $set: { avatar: null, updatedAt: new Date() } },
  );

  return result.modifiedCount > 0;
}
