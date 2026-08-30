/**
 * Colour scale for severity on the calendar.
 *
 * Severity is magnitude, so this is a sequential single-hue ramp (blue, light to
 * dark) rather than a red "bad" scale - status colours are reserved for actual
 * status and would imply a judgement the app does not make.
 *
 * Ten discrete shades of one hue are not separable at a glance in a small
 * calendar cell, so the ten levels collapse into four bands with wide lightness
 * gaps. That is also what the requirement actually asks for: a severity 8 day
 * has to be obviously different from a severity 3 day.
 *
 * Every cell also prints its number, so colour is never the only encoding.
 *
 * Steps are taken from the validated blue ramp and checked as an ordinal scale:
 * monotone lightness, adjacent gaps >= 0.06 L, the lightest step clearing 2:1
 * against the page surface, and a single hue. Foregrounds are the higher
 * contrast of ink or white against each band - the weakest pair is 5.41:1.
 */
export type SeverityBand = {
  readonly id: string;
  readonly min: number;
  readonly max: number;
  readonly label: string;
  readonly background: string;
  readonly foreground: string;
};

export const SEVERITY_BANDS: readonly SeverityBand[] = [
  { id: "mild", min: 1, max: 3, label: "1-3", background: "#86b6ef", foreground: "#0b0b0b" },
  { id: "moderate", min: 4, max: 5, label: "4-5", background: "#3987e5", foreground: "#0b0b0b" },
  { id: "strong", min: 6, max: 7, label: "6-7", background: "#1c5cab", foreground: "#ffffff" },
  { id: "severe", min: 8, max: 10, label: "8-10", background: "#0d366b", foreground: "#ffffff" },
] as const;

/** Used when an episode was recorded but its severity was not. */
export const NO_SEVERITY_BAND: Omit<SeverityBand, "min" | "max"> = {
  id: "unrecorded",
  label: "Not recorded",
  background: "#e8e8e5",
  foreground: "#0b0b0b",
};

export function severityBand(severity: number | null): Omit<SeverityBand, "min" | "max"> {
  if (severity === null) return NO_SEVERITY_BAND;
  return (
    SEVERITY_BANDS.find((band) => severity >= band.min && severity <= band.max) ??
    NO_SEVERITY_BAND
  );
}
