import {
  HEADACHE_TYPES,
  MAX_SEVERITY,
  MIN_SEVERITY,
  POSSIBLE_TRIGGERS,
  SYMPTOMS,
} from "@/lib/migraines/catalog";
import { isValidLocalDate } from "@/lib/time";
import type { MigraineFilter, MigraineStatus } from "@/types/migraine";

/**
 * History filters live in the URL, so a filtered view can be bookmarked, shared
 * with yourself, and survives the back button without any client state.
 *
 * Parsing is deliberately forgiving: an unusable parameter is dropped rather
 * than rejected, because a hand-edited or stale URL should still render a page.
 */

export const HISTORY_PAGE_SIZE = 25;

export type SearchParams = Record<string, string | string[] | undefined>;

export type HistoryQuery = {
  filter: MigraineFilter;
  page: number;
  sort: "newest" | "oldest";
};

export function parseHistoryQuery(params: SearchParams): HistoryQuery {
  const filter: MigraineFilter = {};

  const from = single(params.from);
  if (from && isValidLocalDate(from)) filter.from = from;

  const to = single(params.to);
  if (to && isValidLocalDate(to)) filter.to = to;

  const minSeverity = severity(single(params.minSeverity));
  if (minSeverity !== undefined) filter.minSeverity = minSeverity;

  const maxSeverity = severity(single(params.maxSeverity));
  if (maxSeverity !== undefined) filter.maxSeverity = maxSeverity;

  // A reversed range would silently match nothing; treat it as unset instead.
  if (
    filter.minSeverity !== undefined &&
    filter.maxSeverity !== undefined &&
    filter.minSeverity > filter.maxSeverity
  ) {
    delete filter.minSeverity;
    delete filter.maxSeverity;
  }

  const symptoms = known(params.symptoms, SYMPTOMS);
  if (symptoms.length > 0) filter.symptoms = symptoms;

  const triggers = known(params.triggers, POSSIBLE_TRIGGERS);
  if (triggers.length > 0) filter.possibleTriggers = triggers;

  const types = known(params.type, HEADACHE_TYPES);
  if (types.length > 0) filter.headacheType = types;

  const status = single(params.status);
  if (status === "draft" || status === "complete") {
    filter.status = status as MigraineStatus;
  }

  if (single(params.ongoing) === "1") filter.ongoing = true;

  return {
    filter,
    page: pageNumber(single(params.page)),
    sort: single(params.sort) === "oldest" ? "oldest" : "newest",
  };
}

/** Rebuilds a `/history` URL, so paging keeps every active filter. */
export function historyHref(query: HistoryQuery, overrides: { page?: number } = {}): string {
  const params = new URLSearchParams();
  const { filter } = query;

  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.minSeverity !== undefined) params.set("minSeverity", String(filter.minSeverity));
  if (filter.maxSeverity !== undefined) params.set("maxSeverity", String(filter.maxSeverity));
  for (const value of filter.symptoms ?? []) params.append("symptoms", value);
  for (const value of filter.possibleTriggers ?? []) params.append("triggers", value);
  for (const value of filter.headacheType ?? []) params.append("type", value);
  if (filter.status) params.set("status", filter.status);
  if (filter.ongoing) params.set("ongoing", "1");
  if (query.sort === "oldest") params.set("sort", "oldest");

  const page = overrides.page ?? query.page;
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search.length > 0 ? `/history?${search}` : "/history";
}

export function hasActiveFilters(filter: MigraineFilter): boolean {
  return Object.keys(filter).length > 0;
}

/** Human-readable summary of what is currently being filtered on. */
export function describeFilters(filter: MigraineFilter): string[] {
  const parts: string[] = [];

  if (filter.from && filter.to) parts.push(`${filter.from} to ${filter.to}`);
  else if (filter.from) parts.push(`From ${filter.from}`);
  else if (filter.to) parts.push(`Up to ${filter.to}`);

  if (filter.minSeverity !== undefined && filter.maxSeverity !== undefined) {
    parts.push(`Severity ${filter.minSeverity}-${filter.maxSeverity}`);
  } else if (filter.minSeverity !== undefined) {
    parts.push(`Severity ${filter.minSeverity}+`);
  } else if (filter.maxSeverity !== undefined) {
    parts.push(`Severity up to ${filter.maxSeverity}`);
  }

  if (filter.symptoms?.length) parts.push(`${filter.symptoms.length} symptom filter(s)`);
  if (filter.possibleTriggers?.length) parts.push(`${filter.possibleTriggers.length} trigger filter(s)`);
  if (filter.headacheType?.length) parts.push(`${filter.headacheType.length} type filter(s)`);
  if (filter.status) parts.push(filter.status === "draft" ? "Drafts only" : "Completed only");
  if (filter.ongoing) parts.push("Ongoing only");

  return parts;
}

// --- Parsing primitives -----------------------------------------------------

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Restricts a multi-select parameter to ids that actually exist. Custom
 * answers are not offered as filters, so anything unrecognised is a stale or
 * hand-edited URL rather than a real selection.
 */
function known(
  value: string | string[] | undefined,
  catalog: readonly { id: string }[],
): string[] {
  const ids = new Set(catalog.map((item) => item.id));
  return [...new Set(toArray(value).filter((entry) => ids.has(entry)))];
}

function severity(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return parsed >= MIN_SEVERITY && parsed <= MAX_SEVERITY ? parsed : undefined;
}

function pageNumber(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}
