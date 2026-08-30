import type {
  DurationKind,
  HelpedValue,
  SleepQuality,
  TimePrecision,
} from "@/lib/migraines/catalog";
import type { MidasAnswers } from "@/lib/midas";
import type { MigraineInputRaw } from "@/lib/validation/migraine";
import type { Migraine, MigraineStatus } from "@/types/migraine";

/**
 * The wizard's working copy of an episode.
 *
 * Deliberately shaped for the form rather than for storage: dates and times are
 * separate strings because that is what `<input type="date">` and
 * `<input type="time">` produce, and numbers stay as text so a half-typed value
 * does not get coerced to 0. `toInput` converts to the shape the server
 * validates, which is the only place the two representations meet.
 */
export type WizardState = {
  startDate: string;
  startTime: string;
  startPrecision: TimePrecision;

  knowsEnd: boolean;
  endDate: string;
  endTime: string;
  endPrecision: TimePrecision;

  durationKind: DurationKind;
  durationBand: string;
  customHours: string;
  customMinutes: string;

  severity: number | null;
  headacheType: string | null;

  painLocations: string[];
  symptoms: string[];
  possibleTriggers: string[];

  medications: MedicationDraft[];
  reliefMethods: ReliefDraft[];

  /** Kept as text so a half-typed "6." is not coerced to a number. */
  sleepHours: string;
  sleepQuality: SleepQuality | null;

  midas: MidasDraft;
  notes: string;
};

export type MedicationDraft = {
  /** Stable across re-renders so React keys survive reordering and removal. */
  key: string;
  name: string;
  dosage: string;
  takenDate: string;
  takenTime: string;
  helped: HelpedValue | null;
  notes: string;
};

export type ReliefDraft = {
  method: string;
  helped: HelpedValue | null;
};

export type MidasField = keyof MidasAnswers;

export type MidasDraft = Record<MidasField, string>;

export const EMPTY_MIDAS_DRAFT: MidasDraft = {
  workDaysMissed: "",
  workDaysReduced: "",
  householdDaysMissed: "",
  householdDaysReduced: "",
  leisureDaysMissed: "",
  leisureDaysReduced: "",
  headacheDays: "",
  averagePainSeverity: "",
};

/** Placeholder stored when the user says they do not know the time. */
const UNKNOWN_TIME = "12:00";

export function createInitialState(now: Date = new Date()): WizardState {
  return {
    startDate: toDateInput(now),
    startTime: toTimeInput(now),
    startPrecision: "approximate",

    knowsEnd: false,
    endDate: "",
    endTime: "",
    endPrecision: "approximate",

    durationKind: "unknown",
    durationBand: "",
    customHours: "",
    customMinutes: "",

    severity: null,
    headacheType: null,

    painLocations: [],
    symptoms: [],
    possibleTriggers: [],

    medications: [],
    reliefMethods: [],

    sleepHours: "",
    sleepQuality: null,

    midas: { ...EMPTY_MIDAS_DRAFT },
    notes: "",
  };
}

/** Rehydrates the wizard from a saved episode, for editing and resuming drafts. */
export function stateFromMigraine(migraine: Migraine): WizardState {
  const { timing, duration } = migraine;

  return {
    startDate: timing.startedAtLocal.slice(0, 10),
    startTime: timing.startedAtLocal.slice(11, 16),
    startPrecision: timing.startPrecision,

    knowsEnd: timing.endedAtLocal !== null,
    endDate: timing.endedAtLocal?.slice(0, 10) ?? "",
    endTime: timing.endedAtLocal?.slice(11, 16) ?? "",
    endPrecision: timing.endPrecision ?? "approximate",

    durationKind: duration.kind,
    durationBand: duration.band ?? "",
    customHours:
      duration.kind === "custom" && duration.minutes !== null
        ? String(Math.floor(duration.minutes / 60))
        : "",
    customMinutes:
      duration.kind === "custom" && duration.minutes !== null
        ? String(duration.minutes % 60)
        : "",

    severity: migraine.severity,
    headacheType: migraine.headacheType,

    painLocations: [...migraine.painLocations],
    symptoms: [...migraine.symptoms],
    possibleTriggers: [...migraine.possibleTriggers],

    medications: migraine.medications.map((medication, index) => ({
      key: `med-${index}`,
      name: medication.name,
      dosage: medication.dosage ?? "",
      takenDate: medication.takenAtLocal?.slice(0, 10) ?? "",
      takenTime: medication.takenAtLocal?.slice(11, 16) ?? "",
      helped: medication.helped,
      notes: medication.notes ?? "",
    })),
    reliefMethods: migraine.reliefMethods.map((relief) => ({
      method: relief.method,
      helped: relief.helped,
    })),

    sleepHours:
      migraine.sleep?.durationHours === null ||
      migraine.sleep?.durationHours === undefined
        ? ""
        : String(migraine.sleep.durationHours),
    sleepQuality: migraine.sleep?.quality ?? null,

    midas: migraine.midas
      ? (Object.fromEntries(
          Object.entries(migraine.midas).map(([field, value]) => [
            field,
            value === null ? "" : String(value),
          ]),
        ) as MidasDraft)
      : { ...EMPTY_MIDAS_DRAFT },

    notes: migraine.notes ?? "",
  };
}

/**
 * Form state -> the payload the server validates.
 *
 * Nothing here is trusted: the server re-validates the result with
 * `migraineInputSchema`. This only reshapes.
 */
export function toInput(
  state: WizardState,
  status: MigraineStatus,
): MigraineInputRaw {
  const startedAtLocal = combine(
    state.startDate,
    state.startPrecision === "unknown" ? UNKNOWN_TIME : state.startTime,
  );
  const hasEnd = state.knowsEnd && state.endDate.length > 0;
  const endedAtLocal = hasEnd
    ? combine(
        state.endDate,
        state.endPrecision === "unknown" ? UNKNOWN_TIME : state.endTime,
      )
    : null;

  return {
    status,

    timing: {
      startedAtLocal,
      startPrecision: state.startPrecision,
      endedAtLocal,
      endPrecision: hasEnd ? state.endPrecision : null,
      // Read for the episode's own date, so an episode logged after a DST
      // change still resolves to the offset that was in effect at the time.
      timezoneOffsetMinutes: offsetForLocal(startedAtLocal),
    },

    duration: {
      kind: state.durationKind,
      band: state.durationKind === "band" ? state.durationBand : null,
      customMinutes:
        state.durationKind === "custom" ? customToMinutes(state) : null,
    },

    severity: state.severity,
    headacheType: state.headacheType,

    painLocations: state.painLocations,
    symptoms: state.symptoms,
    possibleTriggers: state.possibleTriggers,

    medications: state.medications
      // A row with no name is an empty row the user never filled in.
      .filter((medication) => medication.name.trim().length > 0)
      .map((medication) => ({
        name: medication.name,
        dosage: medication.dosage,
        takenAtLocal:
          medication.takenDate.length > 0
            ? combine(medication.takenDate, medication.takenTime || UNKNOWN_TIME)
            : null,
        helped: medication.helped,
        notes: medication.notes,
      })),

    reliefMethods: state.reliefMethods.map((relief) => ({
      method: relief.method,
      helped: relief.helped,
    })),

    sleep: {
      durationHours: parseSleepHours(state.sleepHours),
      quality: state.sleepQuality,
    },

    midas: isMidasDraftEmpty(state.midas) ? null : toMidasAnswers(state.midas),

    notes: state.notes,
  };
}

export function customToMinutes(state: WizardState): number | null {
  const hours = Number.parseInt(state.customHours, 10);
  const minutes = Number.parseInt(state.customMinutes, 10);
  const total =
    (Number.isNaN(hours) ? 0 : hours) * 60 + (Number.isNaN(minutes) ? 0 : minutes);
  return total > 0 ? total : null;
}

/** Blank or unparseable means "not recorded", never 0 hours of sleep. */
export function parseSleepHours(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isMidasDraftEmpty(draft: MidasDraft): boolean {
  return Object.values(draft).every((value) => value.trim().length === 0);
}

export function toMidasAnswers(draft: MidasDraft): MidasAnswers {
  return Object.fromEntries(
    Object.entries(draft).map(([field, value]) => {
      const parsed = Number.parseInt(value, 10);
      return [field, Number.isNaN(parsed) ? null : parsed];
    }),
  ) as MidasAnswers;
}

function combine(date: string, time: string): string {
  return `${date}T${time || UNKNOWN_TIME}`;
}

/**
 * `getTimezoneOffset()` for a specific local moment. Parsing without a zone
 * suffix makes the runtime interpret it as local time, which is exactly the
 * moment whose offset we want.
 */
function offsetForLocal(local: string): number {
  const parsed = new Date(local);
  return Number.isNaN(parsed.getTime())
    ? new Date().getTimezoneOffset()
    : parsed.getTimezoneOffset();
}

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
