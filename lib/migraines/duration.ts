import {
  durationBand,
  type DurationKind,
} from "@/lib/migraines/catalog";
import { durationMinutesBetween, formatDuration } from "@/lib/time";
import type { MigraineDuration } from "@/types/migraine";

/**
 * What actually gets stored for duration. Anything derivable is left out:
 * a calculated duration is recomputed from the timing, and a band's
 * representative minutes come from the catalogue, so editing either later
 * updates every existing episode instead of leaving stale copies behind.
 */
export type StoredDuration = {
  kind: DurationKind;
  /** Catalogue band id, when `kind` is `"band"`. */
  band: string | null;
  /** User-entered minutes, when `kind` is `"custom"`. */
  customMinutes: number | null;
};

export const UNKNOWN_DURATION: StoredDuration = {
  kind: "unknown",
  band: null,
  customMinutes: null,
};

/**
 * Expands the stored form into everything the UI and the statistics need.
 *
 * `minutes` is only ever populated for durations that were actually measured or
 * entered. A band selection reports `estimateMinutes` with `isEstimate` set, so
 * callers can choose to exclude estimates from a calculation rather than
 * silently averaging a guess with a measurement.
 */
export function resolveDuration(
  stored: StoredDuration,
  timing: { startedAt: Date | string; endedAt: Date | string | null },
): MigraineDuration {
  switch (stored.kind) {
    case "calculated": {
      const minutes = timing.endedAt
        ? durationMinutesBetween(toDate(timing.startedAt), toDate(timing.endedAt))
        : null;
      return {
        kind: "calculated",
        band: null,
        minutes,
        estimateMinutes: minutes,
        isEstimate: false,
        label: formatDuration(minutes) ?? "Unknown",
      };
    }

    case "custom": {
      const minutes = stored.customMinutes;
      return {
        kind: "custom",
        band: null,
        minutes,
        estimateMinutes: minutes,
        isEstimate: false,
        label: formatDuration(minutes) ?? "Unknown",
      };
    }

    case "band": {
      const band = stored.band ? durationBand(stored.band) : undefined;
      return {
        kind: "band",
        band: stored.band,
        minutes: null,
        estimateMinutes: band?.estimateMinutes ?? null,
        isEstimate: true,
        label: band?.label ?? "Unknown",
      };
    }

    case "ongoing":
      return {
        kind: "ongoing",
        band: null,
        minutes: null,
        estimateMinutes: null,
        isEstimate: false,
        label: "Still ongoing",
      };

    case "unknown":
    default:
      return {
        kind: "unknown",
        band: null,
        minutes: null,
        estimateMinutes: null,
        isEstimate: false,
        label: "Unknown",
      };
  }
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Elapsed time for an episode still in progress. Kept separate from
 * `resolveDuration` because it depends on the current time, so it must be
 * computed where it is displayed rather than baked into a cached record.
 *
 * Returns `null` when the start is in the future - from a mistyped date or a
 * skewed clock - because "0 minutes ago" would state something false. Callers
 * omit the line rather than print a duration that has not happened yet.
 */
export function elapsedMinutesSince(
  startedAt: Date | string,
  now: Date = new Date(),
): number | null {
  const minutes = durationMinutesBetween(toDate(startedAt), now);
  return minutes >= 0 ? minutes : null;
}
