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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The MIDAS questionnaire.
 *
 * Kept visually separate from the rest of the episode because it asks about the
 * last three months rather than about this episode. Only the answers are ever
 * stored; the score below is recalculated from them every time it is displayed.
 *
 * Each question is a row with the number field pinned to the right rather than
 * stacked underneath: at thirteen questions the stacked form was twice the
 * scroll length on a phone, and the answer is only ever two digits.
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
      <Alert variant="info">
        <AlertDescription>
          These questions ask about the last {MIDAS_RECALL_DAYS} days rather than
          this single episode. Every one is optional.
        </AlertDescription>
      </Alert>

      <div className="border-border bg-card divide-border divide-y rounded-xl border shadow-card">
        {MIDAS_QUESTIONS.map((question, index) => (
          <QuestionRow
            key={question.id}
            id={question.id}
            prompt={`${index + 1}. ${question.prompt}`}
            suffix={question.scored ? null : "not scored"}
            max={MIDAS_RECALL_DAYS}
            value={midas[question.id]}
            onChange={(value) => set(question.id, value)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <p className="eyebrow">Additional questions (not scored)</p>
        <div className="border-border bg-card divide-border divide-y rounded-xl border shadow-card">
          {MIDAS_SUPPLEMENTARY_QUESTIONS.map((question) => (
            <QuestionRow
              key={question.id}
              id={question.id}
              prompt={question.prompt}
              max={question.max}
              value={midas[question.id]}
              onChange={(value) => set(question.id, value)}
            />
          ))}
        </div>
      </div>

      {result ? <MidasScoreCard result={result} /> : null}
    </div>
  );
}

function QuestionRow({
  id,
  prompt,
  suffix,
  max,
  value,
  onChange,
}: {
  id: string;
  prompt: string;
  suffix?: string | null;
  max: number;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
      <Label htmlFor={id} className="min-w-0 flex-1 items-start leading-snug">
        <span className="text-pretty">
          {prompt}
          {suffix ? (
            <span className="text-muted-foreground font-normal"> ({suffix})</span>
          ) : null}
        </span>
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        placeholder="0"
        aria-label={`${prompt} — number of days`}
        onChange={(event) => onChange(event.target.value)}
        className="w-16 shrink-0 text-center tabular-nums sm:w-20"
      />
    </div>
  );
}

export function MidasScoreCard({
  result,
}: {
  result: NonNullable<ReturnType<typeof scoreMidas>>;
}) {
  return (
    <div className="border-lavender-deep/50 from-lavender/70 to-card space-y-2 rounded-xl border bg-gradient-to-br p-4 sm:p-5">
      <p className="eyebrow">MIDAS score</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-display text-primary-strong tabular-nums">
          {result.score}
        </span>
        <span className="text-body-sm text-muted-foreground">
          Grade {result.grade.grade} ({result.grade.range})
        </span>
      </div>
      <p className="text-body-sm text-foreground">{result.grade.label}</p>
      {result.partial ? (
        <p className="text-caption text-muted-foreground">
          Based on {result.answeredCount} of {result.totalScoredQuestions} scored
          questions. Unanswered questions count as zero days.
        </p>
      ) : null}
      <p className="text-caption text-muted-foreground">
        This is the questionnaire&rsquo;s own scoring of the days you recorded. It
        is not a diagnosis or a medical assessment.
      </p>
    </div>
  );
}
