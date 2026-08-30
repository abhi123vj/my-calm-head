/**
 * MIDAS (Migraine Disability Assessment).
 *
 * The published instrument asks five scored questions about the last three
 * months and sums the day counts. Two further questions (A and B) are recorded
 * alongside it but are deliberately NOT part of the score.
 *
 * This project's requirements also ask for a sixth activity category - leisure
 * or social activities that were substantially reduced. It is collected and
 * stored, but kept out of the total, because adding it would push scores above
 * what the published grade bands were built for and make them incomparable.
 *
 * Only raw answers are ever stored. The score is derived on read, so changing
 * anything here re-scores the whole history rather than leaving stale numbers
 * behind.
 */

export type MidasQuestionId =
  | "workDaysMissed"
  | "workDaysReduced"
  | "householdDaysMissed"
  | "householdDaysReduced"
  | "leisureDaysMissed"
  | "leisureDaysReduced";

export type MidasSupplementaryId = "headacheDays" | "averagePainSeverity";

export type MidasQuestion = {
  readonly id: MidasQuestionId;
  readonly prompt: string;
  /** Whether the answer contributes to the total. */
  readonly scored: boolean;
};

/** Recall window the questions ask about. */
export const MIDAS_RECALL_DAYS = 90;

export const MIDAS_QUESTIONS: readonly MidasQuestion[] = [
  {
    id: "workDaysMissed",
    prompt:
      "On how many days in the last 3 months did you miss work or school because of your headaches?",
    scored: true,
  },
  {
    id: "workDaysReduced",
    prompt:
      "On how many days in the last 3 months was your productivity at work or school reduced by half or more because of your headaches? (Do not include days you already counted above.)",
    scored: true,
  },
  {
    id: "householdDaysMissed",
    prompt:
      "On how many days in the last 3 months did you not do household work because of your headaches?",
    scored: true,
  },
  {
    id: "householdDaysReduced",
    prompt:
      "On how many days in the last 3 months was your productivity in household work reduced by half or more because of your headaches? (Do not include days you already counted above.)",
    scored: true,
  },
  {
    id: "leisureDaysMissed",
    prompt:
      "On how many days in the last 3 months did you miss family, social, or leisure activities because of your headaches?",
    scored: true,
  },
  {
    id: "leisureDaysReduced",
    prompt:
      "On how many days in the last 3 months were family, social, or leisure activities substantially reduced because of your headaches?",
    // Recorded for this project, but outside the published scored instrument.
    scored: false,
  },
] as const;

export const MIDAS_SUPPLEMENTARY_QUESTIONS = [
  {
    id: "headacheDays" as const,
    prompt: "On how many days in the last 3 months did you have a headache?",
    max: MIDAS_RECALL_DAYS,
  },
  {
    id: "averagePainSeverity" as const,
    prompt: "On a scale of 0-10, how painful were these headaches on average?",
    max: 10,
  },
] as const;

export type MidasAnswers = Record<MidasQuestionId, number | null> &
  Record<MidasSupplementaryId, number | null>;

export const EMPTY_MIDAS_ANSWERS: MidasAnswers = {
  workDaysMissed: null,
  workDaysReduced: null,
  householdDaysMissed: null,
  householdDaysReduced: null,
  leisureDaysMissed: null,
  leisureDaysReduced: null,
  headacheDays: null,
  averagePainSeverity: null,
};

const SCORED_IDS = MIDAS_QUESTIONS.filter((question) => question.scored).map(
  (question) => question.id,
);

export type MidasGrade = {
  readonly grade: "I" | "II" | "III" | "IV";
  readonly label: string;
  readonly range: string;
};

/**
 * The grade bands published with the questionnaire. Presented as what the
 * instrument itself reports for a score - the app draws no conclusion from it.
 */
export const MIDAS_GRADES: readonly (MidasGrade & { readonly max: number })[] = [
  { grade: "I", label: "Little or no disability", range: "0-5", max: 5 },
  { grade: "II", label: "Mild disability", range: "6-10", max: 10 },
  { grade: "III", label: "Moderate disability", range: "11-20", max: 20 },
  { grade: "IV", label: "Severe disability", range: "21+", max: Infinity },
] as const;

export type MidasResult = {
  /** Sum of the five scored questions. */
  score: number;
  grade: MidasGrade;
  /** True when at least one scored question was left blank. */
  partial: boolean;
  /** Which scored questions were answered. */
  answeredCount: number;
  totalScoredQuestions: number;
};

/**
 * Scores the five standard questions. Blank answers count as zero days but are
 * reported through `partial`, so a half-filled questionnaire is never presented
 * as a complete result.
 *
 * Returns `null` when nothing scored was answered at all.
 */
export function scoreMidas(answers: Partial<MidasAnswers> | null): MidasResult | null {
  if (!answers) return null;

  const values = SCORED_IDS.map((id) => answers[id] ?? null);
  const answered = values.filter((value) => value !== null);
  if (answered.length === 0) return null;

  const score = answered.reduce<number>((total, value) => total + (value ?? 0), 0);

  return {
    score,
    grade: gradeFor(score),
    partial: answered.length < SCORED_IDS.length,
    answeredCount: answered.length,
    totalScoredQuestions: SCORED_IDS.length,
  };
}

export function gradeFor(score: number): MidasGrade {
  const match =
    MIDAS_GRADES.find((band) => score <= band.max) ??
    MIDAS_GRADES[MIDAS_GRADES.length - 1];
  return { grade: match.grade, label: match.label, range: match.range };
}

/** True when every question, scored or not, was left blank. */
export function isMidasEmpty(answers: Partial<MidasAnswers> | null): boolean {
  if (!answers) return true;
  return Object.values(answers).every((value) => value === null || value === undefined);
}
