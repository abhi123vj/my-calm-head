import {
  HELPED_LABELS,
  SEVERITY_LABELS,
  SLEEP_QUALITY_LABELS,
  isCustomValue,
  labelFor,
} from "@/lib/migraines/catalog";
import {
  describeEnd,
  describeStart,
  formatLocalDate,
  formatLocalTime,
} from "@/lib/migraines/format";
import { elapsedMinutesSince } from "@/lib/migraines/duration";
import { formatDuration } from "@/lib/time";
import { MidasScoreCard } from "@/components/log/midas-editor";
import { SeverityMark } from "@/components/migraines/severity-mark";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Migraine } from "@/types/migraine";

/**
 * The full record of one episode.
 *
 * Sections that were never filled in are omitted rather than shown empty, so
 * the page reads as an account of what happened instead of a form with gaps.
 * The exceptions are timing, duration, and severity, which always appear
 * because "not recorded" is itself worth knowing there - and those three are
 * lifted into a single summary card at the top, since they are what anyone
 * opening an episode is looking for first.
 */
export function EpisodeSummary({ migraine }: { migraine: Migraine }) {
  return (
    <div className="space-y-4">
      <Card className="border-lavender-deep/50 from-lavender/60 to-card bg-gradient-to-br">
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <SeverityMark severity={migraine.severity} size="lg" />
            <div className="min-w-0">
              <p className="eyebrow">Severity</p>
              {migraine.severity === null ? (
                <p className="text-subheading text-muted-foreground">Not recorded</p>
              ) : (
                <>
                  <p className="text-title">{migraine.severity} / 10</p>
                  <p className="text-body-sm text-muted-foreground">
                    {SEVERITY_LABELS[migraine.severity]}
                  </p>
                </>
              )}
            </div>
          </div>

          <dl className="border-lavender-deep/40 grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="eyebrow">Timing</dt>
              <dd className="text-body-sm mt-1">
                {describeStart(migraine.timing)}
                {describeEnd(migraine.timing) ? (
                  <span className="text-muted-foreground block">
                    Ended {describeEnd(migraine.timing)}
                  </span>
                ) : null}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="eyebrow">Duration</dt>
              <dd className="text-body-sm mt-1">
                {migraine.duration.label}
                {migraine.duration.kind === "ongoing" ? (
                  <ElapsedSoFar startedAt={migraine.timing.startedAt} />
                ) : null}
                {migraine.duration.isEstimate ? (
                  <span className="text-muted-foreground block">
                    Recorded as a range, not a measured time.
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {migraine.headacheType ? (
        <Section
          label="Headache type"
          note="How you classified this episode, not a diagnosis."
        >
          <p className="text-body-sm">{labelFor(migraine.headacheType)}</p>
        </Section>
      ) : null}

      {migraine.painLocations.length > 0 ? (
        <Section label="Where it hurt">
          <ValueList values={migraine.painLocations} />
        </Section>
      ) : null}

      {migraine.symptoms.length > 0 ? (
        <Section label="Symptoms">
          <ValueList values={migraine.symptoms} />
        </Section>
      ) : null}

      {migraine.possibleTriggers.length > 0 ? (
        <Section
          label="Recorded possible triggers"
          note="Things noted around this episode. Not a statement of cause."
        >
          <ValueList values={migraine.possibleTriggers} />
        </Section>
      ) : null}

      {migraine.sleep ? (
        <Section label="Sleep beforehand">
          <p className="text-body-sm">
            {migraine.sleep.durationHours !== null
              ? `${migraine.sleep.durationHours} hour${migraine.sleep.durationHours === 1 ? "" : "s"}`
              : "Duration not recorded"}
            {migraine.sleep.quality ? (
              <span className="text-muted-foreground">
                {" "}
                &middot; {SLEEP_QUALITY_LABELS[migraine.sleep.quality]}
              </span>
            ) : null}
          </p>
        </Section>
      ) : null}

      {migraine.medications.length > 0 ? (
        <Section label="Medication">
          <ul className="divide-border -my-2 divide-y">
            {migraine.medications.map((medication, index) => (
              <li key={`${medication.name}-${index}`} className="space-y-0.5 py-3">
                <p className="text-body-sm font-medium">
                  {medication.name}
                  {medication.dosage ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {medication.dosage}
                    </span>
                  ) : null}
                </p>
                <p className="text-caption text-muted-foreground">
                  {medication.takenAtLocal
                    ? `Taken ${formatLocalDate(medication.takenAtLocal)} at ${formatLocalTime(medication.takenAtLocal)}`
                    : "Time not recorded"}
                  {medication.helped
                    ? ` · ${HELPED_LABELS[medication.helped]}`
                    : ""}
                </p>
                {medication.notes ? (
                  <p className="text-body-sm">{medication.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {migraine.reliefMethods.length > 0 ? (
        <Section label="Relief methods tried">
          <ul className="space-y-2">
            {migraine.reliefMethods.map((relief) => (
              <li
                key={relief.method}
                className="text-body-sm flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                <span>{labelFor(relief.method)}</span>
                {relief.helped ? (
                  <Badge variant="lavender">{HELPED_LABELS[relief.helped]}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {migraine.midasResult ? (
        <Section label="Activity impact (MIDAS)" bare>
          <MidasScoreCard result={migraine.midasResult} />
        </Section>
      ) : null}

      {migraine.notes ? (
        <Section label="Notes">
          <p className="text-body-sm whitespace-pre-wrap">{migraine.notes}</p>
        </Section>
      ) : null}

      <p className="text-caption text-muted-foreground px-1">
        Logged {formatLocalDate(toLocalish(migraine.createdAt))}
        {migraine.updatedAt !== migraine.createdAt
          ? ` · last edited ${formatLocalDate(toLocalish(migraine.updatedAt))}`
          : ""}
      </p>
    </div>
  );
}

/** Omitted entirely when the start has not happened yet. */
function ElapsedSoFar({ startedAt }: { startedAt: string }) {
  const elapsed = formatDuration(elapsedMinutesSince(startedAt));
  if (elapsed === null) return null;

  return <span className="text-muted-foreground block">Started {elapsed} ago.</span>;
}

function Section({
  label,
  note,
  bare = false,
  children,
}: {
  label: string;
  note?: string;
  /** For content that is already a surface of its own, e.g. the MIDAS card. */
  bare?: boolean;
  children: React.ReactNode;
}) {
  if (bare) {
    return (
      <section className="space-y-2">
        <h2 className="eyebrow px-1">{label}</h2>
        {children}
      </section>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle as="h2" className="eyebrow">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
        {note ? (
          <p className="text-caption text-muted-foreground">{note}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ValueList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant={isCustomValue(value) ? "custom" : "lavender"}>
          {labelFor(value)}
          {isCustomValue(value) ? (
            <span className="text-muted-foreground">(your own)</span>
          ) : null}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Audit stamps are true UTC instants, unlike the episode's own wall-clock
 * fields. Trimming to the date is enough for "logged on", and avoids implying
 * a precision the timezone of the reader would not support.
 */
function toLocalish(iso: string): string {
  return iso.slice(0, 16);
}
