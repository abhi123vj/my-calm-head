"use client";

import {
  MIDAS_QUESTIONS,
  MIDAS_RECALL_DAYS,
  MIDAS_SUPPLEMENTARY_QUESTIONS,
  scoreMidas,
} from "@/lib/midas";
import {
  isMidasDraftEmpty,
  toMidasAnswers,
  type MidasDraft,
  type MidasField,
} from "@/components/log/wizard-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The MIDAS questionnaire.
 *
 * Kept visually separate from the rest of the episode because it asks about the
 * last three months rather than about this episode. Only the answers are ever
 * stored; the score below is recalculated from them every time it is displayed.
 */
export function MidasEditor({
  midas,
  onChange,
}: {
  midas: MidasDraft;
  onChange: (next: MidasDraft) => void;
}) {
  const set = (field: MidasField, value: string) => {
    onChange({ ...midas, [field]: value });
  };

  const result = isMidasDraftEmpty(midas) ? null : scoreMidas(toMidasAnswers(midas));

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        These questions ask about the last {MIDAS_RECALL_DAYS} days rather than
        this single episode. Every one is optional.
      </p>

      <div className="space-y-4">
        {MIDAS_QUESTIONS.map((question, index) => (
          <div key={question.id} className="space-y-1.5">
            <Label htmlFor={question.id} className="items-start leading-snug">
              <span>
                {index + 1}. {question.prompt}
                {question.scored ? null : (
                  <span className="text-muted-foreground"> (not scored)</span>
                )}
              </span>
            </Label>
            <Input
              id={question.id}
              type="number"
              inputMode="numeric"
              min={0}
              max={MIDAS_RECALL_DAYS}
              value={midas[question.id]}
              placeholder="Days"
              onChange={(event) => set(question.id, event.target.value)}
              className="max-w-32"
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t pt-4">
        <p className="text-muted-foreground text-xs font-medium uppercase">
          Additional questions (not scored)
        </p>
        {MIDAS_SUPPLEMENTARY_QUESTIONS.map((question) => (
          <div key={question.id} className="space-y-1.5">
            <Label htmlFor={question.id} className="items-start leading-snug">
              {question.prompt}
            </Label>
            <Input
              id={question.id}
              type="number"
              inputMode="numeric"
              min={0}
              max={question.max}
              value={midas[question.id]}
              onChange={(event) => set(question.id, event.target.value)}
              className="max-w-32"
            />
          </div>
        ))}
      </div>

      {result ? <MidasScoreCard result={result} /> : null}
    </div>
  );
}

export function MidasScoreCard({
  result,
}: {
  result: NonNullable<ReturnType<typeof scoreMidas>>;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold tabular-nums">{result.score}</span>
        <span className="text-muted-foreground text-sm">
          MIDAS score &middot; Grade {result.grade.grade} ({result.grade.range})
        </span>
      </div>
      <p className="text-sm">{result.grade.label}</p>
      {result.partial ? (
        <p className="text-muted-foreground text-xs">
          Based on {result.answeredCount} of {result.totalScoredQuestions} scored
          questions. Unanswered questions count as zero days.
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        This is the questionnaire&rsquo;s own scoring of the days you recorded.
        It is not a diagnosis or a medical assessment.
      </p>
    </div>
  );
}
