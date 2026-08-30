/**
 * Predefined answer options.
 *
 * Every question that has common answers offers these, plus "Other" with a
 * free-text box. Stored values are plain strings: a catalogue `id` when the
 * user picked a listed option, or the raw text they typed when they did not.
 * Nothing is a closed enum, so a custom answer is a first-class value that
 * survives storage, filtering, and display unchanged.
 *
 * These live as constants for now. Moving them into a Settings-managed
 * collection later only changes where this data is read from - stored episodes
 * keep working, because they hold strings rather than foreign keys.
 */
export type CatalogItem = {
  readonly id: string;
  readonly label: string;
};

/** Sentinel used by the UI for the "Other" choice; never stored. */
export const OTHER_OPTION_ID = "__other__";

// --- Severity ---------------------------------------------------------------

/** Anchors shown at each end of the 1-10 scale. */
export const SEVERITY_ANCHOR_LOW = "Minimal";
export const SEVERITY_ANCHOR_HIGH = "Severe";
export const MIN_SEVERITY = 1;
export const MAX_SEVERITY = 10;

/**
 * Short labels for reading a stored value back. The logging form only asks for
 * the number - no textual description is ever required.
 */
export const SEVERITY_LABELS: Readonly<Record<number, string>> = {
  1: "Minimal",
  2: "Very mild",
  3: "Mild",
  4: "Noticeable",
  5: "Moderate",
  6: "Strong",
  7: "Very strong",
  8: "Severe",
  9: "Very severe",
  10: "Worst possible",
};

// --- Timing -----------------------------------------------------------------

export const TIME_PRECISIONS = ["exact", "approximate", "unknown"] as const;
export type TimePrecision = (typeof TIME_PRECISIONS)[number];

export const TIME_PRECISION_LABELS: Record<TimePrecision, string> = {
  exact: "I know the time",
  approximate: "Roughly this time",
  unknown: "Not sure what time",
};

// --- Duration ---------------------------------------------------------------

export type DurationBand = CatalogItem & {
  readonly minMinutes: number;
  readonly maxMinutes: number | null;
  /**
   * A single number standing in for the band in averages and charts. Always
   * reported as an estimate so it is never mistaken for a measured duration.
   */
  readonly estimateMinutes: number;
};

export const DURATION_BANDS: readonly DurationBand[] = [
  { id: "lt-1h", label: "Less than 1 hour", minMinutes: 0, maxMinutes: 60, estimateMinutes: 30 },
  { id: "1-2h", label: "1-2 hours", minMinutes: 60, maxMinutes: 120, estimateMinutes: 90 },
  { id: "2-4h", label: "2-4 hours", minMinutes: 120, maxMinutes: 240, estimateMinutes: 180 },
  { id: "4-8h", label: "4-8 hours", minMinutes: 240, maxMinutes: 480, estimateMinutes: 360 },
  { id: "8-12h", label: "8-12 hours", minMinutes: 480, maxMinutes: 720, estimateMinutes: 600 },
  { id: "12-24h", label: "12-24 hours", minMinutes: 720, maxMinutes: 1440, estimateMinutes: 1080 },
  // Open-ended, so the estimate is a stated convention rather than a midpoint.
  { id: "gt-24h", label: "More than 24 hours", minMinutes: 1440, maxMinutes: null, estimateMinutes: 1800 },
] as const;

export const DURATION_KINDS = [
  "calculated",
  "band",
  "custom",
  "ongoing",
  "unknown",
] as const;
export type DurationKind = (typeof DURATION_KINDS)[number];

export function durationBand(id: string): DurationBand | undefined {
  return DURATION_BANDS.find((band) => band.id === id);
}

// --- Headache type ----------------------------------------------------------

/**
 * How the user personally classifies the episode. This is self-description for
 * their own records, not a diagnosis, and the UI says so.
 */
export const HEADACHE_TYPES: readonly CatalogItem[] = [
  { id: "migraine", label: "Migraine" },
  { id: "tension-type", label: "Tension-type headache" },
  { id: "cluster", label: "Cluster headache" },
  { id: "sinus", label: "Sinus headache" },
  { id: "ice-pick", label: "Ice-pick headache" },
  { id: "medication-overuse", label: "Medication-overuse headache" },
] as const;

// --- Pain location ----------------------------------------------------------

export const PAIN_LOCATIONS: readonly CatalogItem[] = [
  { id: "left-side", label: "Left side" },
  { id: "right-side", label: "Right side" },
  { id: "both-sides", label: "Both sides" },
  { id: "front-of-head", label: "Front of head" },
  { id: "back-of-head", label: "Back of head" },
  { id: "forehead", label: "Forehead" },
  { id: "temple", label: "Temple" },
  { id: "behind-the-eye", label: "Behind the eye" },
  { id: "around-the-eye", label: "Around the eye" },
  { id: "top-of-head", label: "Top of head" },
  { id: "neck", label: "Neck" },
] as const;

// --- Symptoms ---------------------------------------------------------------

export const SYMPTOMS: readonly CatalogItem[] = [
  { id: "nausea", label: "Nausea" },
  { id: "vomiting", label: "Vomiting" },
  { id: "light-sensitivity", label: "Light sensitivity" },
  { id: "sound-sensitivity", label: "Sound sensitivity" },
  { id: "smell-sensitivity", label: "Smell sensitivity" },
  { id: "dizziness", label: "Dizziness" },
  { id: "fatigue", label: "Fatigue" },
  { id: "visual-disturbances", label: "Visual disturbances" },
  { id: "aura", label: "Aura" },
  { id: "blurred-vision", label: "Blurred vision" },
  { id: "brain-fog", label: "Brain fog" },
  { id: "difficulty-concentrating", label: "Difficulty concentrating" },
  { id: "neck-pain", label: "Neck pain" },
  { id: "tingling-numbness", label: "Tingling / numbness" },
  { id: "movement-sensitivity", label: "Sensitivity to movement" },
] as const;

// --- Possible triggers ------------------------------------------------------

/**
 * Recorded as things the user noticed around the episode. Nothing in the app
 * treats a selection here as a cause.
 */
export const POSSIBLE_TRIGGERS: readonly CatalogItem[] = [
  { id: "poor-sleep", label: "Poor sleep" },
  { id: "too-much-sleep", label: "Too much sleep" },
  { id: "irregular-sleep", label: "Irregular sleep" },
  { id: "stress", label: "Stress" },
  { id: "dehydration", label: "Dehydration" },
  { id: "skipped-meal", label: "Skipped meal" },
  { id: "hunger", label: "Hunger" },
  { id: "caffeine", label: "Caffeine" },
  { id: "caffeine-withdrawal", label: "Caffeine withdrawal" },
  { id: "alcohol", label: "Alcohol" },
  { id: "exercise", label: "Exercise" },
  { id: "screen-time", label: "Screen time" },
  { id: "bright-light", label: "Bright light" },
  { id: "loud-noise", label: "Loud noise" },
  { id: "strong-smell", label: "Strong smell" },
  { id: "weather-change", label: "Weather change" },
  { id: "heat", label: "Heat" },
  { id: "cold", label: "Cold" },
  { id: "travel", label: "Travel" },
  { id: "work", label: "Work" },
  { id: "unknown", label: "Unknown" },
] as const;

// --- Medications ------------------------------------------------------------

/**
 * Quick-entry names only. The app records what was taken; it never suggests a
 * medication and never says anything about dosage.
 */
export const COMMON_MEDICATIONS: readonly CatalogItem[] = [
  { id: "paracetamol", label: "Paracetamol / Acetaminophen" },
  { id: "ibuprofen", label: "Ibuprofen" },
  { id: "aspirin", label: "Aspirin" },
  { id: "naproxen", label: "Naproxen" },
  { id: "diclofenac", label: "Diclofenac" },
  { id: "sumatriptan", label: "Sumatriptan" },
  { id: "rizatriptan", label: "Rizatriptan" },
  { id: "zolmitriptan", label: "Zolmitriptan" },
  { id: "combination-analgesic", label: "Combination analgesic" },
  { id: "anti-nausea", label: "Anti-nausea medication" },
] as const;

// --- Relief methods ---------------------------------------------------------

export const RELIEF_METHODS: readonly CatalogItem[] = [
  { id: "rest", label: "Rest" },
  { id: "sleep", label: "Sleep" },
  { id: "dark-room", label: "Dark room" },
  { id: "quiet-room", label: "Quiet room" },
  { id: "hydration", label: "Hydration" },
  { id: "cold-compress", label: "Cold compress" },
  { id: "warm-compress", label: "Warm compress" },
  { id: "shower", label: "Shower" },
  { id: "exercise", label: "Exercise" },
  { id: "relaxation", label: "Relaxation" },
  { id: "meditation", label: "Meditation" },
  { id: "massage", label: "Massage" },
  { id: "stretching", label: "Stretching" },
  { id: "reduced-screen-time", label: "Reduced screen time" },
  { id: "caffeine", label: "Caffeine" },
  { id: "food", label: "Food" },
] as const;

// --- Did it help? -----------------------------------------------------------

export const HELPED_VALUES = ["yes", "no", "unsure"] as const;
export type HelpedValue = (typeof HELPED_VALUES)[number];

export const HELPED_LABELS: Record<HelpedValue, string> = {
  yes: "Helped",
  no: "Did not help",
  unsure: "Unsure",
};

// --- Lookup -----------------------------------------------------------------

const CATALOGUES_BY_FIELD = {
  headacheType: HEADACHE_TYPES,
  painLocations: PAIN_LOCATIONS,
  symptoms: SYMPTOMS,
  possibleTriggers: POSSIBLE_TRIGGERS,
  reliefMethods: RELIEF_METHODS,
  medications: COMMON_MEDICATIONS,
} as const;

export type CatalogField = keyof typeof CATALOGUES_BY_FIELD;

const LABELS_BY_ID = new Map<string, string>(
  Object.values(CATALOGUES_BY_FIELD)
    .flat()
    .map((item) => [item.id, item.label]),
);

/** Display name for a stored value. Custom answers render as themselves. */
export function labelFor(value: string): string {
  return LABELS_BY_ID.get(value) ?? value;
}

/** True when the value was typed by the user rather than picked from a list. */
export function isCustomValue(value: string): boolean {
  return !LABELS_BY_ID.has(value);
}

export function catalogFor(field: CatalogField): readonly CatalogItem[] {
  return CATALOGUES_BY_FIELD[field];
}
