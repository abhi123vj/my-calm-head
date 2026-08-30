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
import type { Migraine } from "@/types/migraine";

/**
 * The full record of one episode.
 *
 * Sections that were never filled in are omitted rather than shown empty, so
 * the page reads as an account of what happened instead of a form with gaps.
 * The exceptions are timing, duration, and severity, which always appear
 * because "not recorded" is itself worth knowing there.
 */
export function EpisodeSummary({ migraine }: { migraine: Migraine }) {
  return (
    <div className="space-y-8">
      <Section label="Timing">
        <p>{describeStart(migraine.timing)}</p>
        {describeEnd(migraine.timing) ? (
          <p className="text-muted-foreground">
            Ended {describeEnd(migraine.timing)}
          </p>
        ) : null}
      </Section>

      <Section label="Duration">
        <p className="text-lg">{migraine.duration.label}</p>
        {migraine.duration.kind === "ongoing" ? (
          <ElapsedSoFar startedAt={migraine.timing.startedAt} />
        ) : null}
        {migraine.duration.isEstimate ? (
          <p className="text-muted-foreground text-sm">
            Recorded as a range, not a measured time.
          </p>
        ) : null}
      </Section>

      <Section label="Severity">
        {migraine.severity === null ? (
          <NotRecorded />
        ) : (
          <p className="text-lg">
            {migraine.severity} / 10
            <span className="text-muted-foreground ml-2 text-sm">
              {SEVERITY_LABELS[migraine.severity]}
            </span>
          </p>
        )}
      </Section>

      {migraine.headacheType ? (
        <Section label="Headache type">
          <p>{labelFor(migraine.headacheType)}</p>
          <p className="text-muted-foreground text-xs">
            How you classified this episode, not a diagnosis.
          </p>
        </Section>
      ) : null}

      {migraine.painLocations.length > 0 ? (
        <Section label="Where it hurt">
          <BulletList values={migraine.painLocations} />
        </Section>
      ) : null}

      {migraine.symptoms.length > 0 ? (
        <Section label="Symptoms">
          <BulletList values={migraine.symptoms} />
        </Section>
      ) : null}

      {migraine.possibleTriggers.length > 0 ? (
        <Section label="Recorded possible triggers">
          <BulletList values={migraine.possibleTriggers} />
          <p className="text-muted-foreground text-xs">
            Things noted around this episode. Not a statement of cause.
          </p>
        </Section>
      ) : null}

      {migraine.sleep ? (
        <Section label="Sleep beforehand">
          <p>
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
          <ul className="space-y-3">
            {migraine.medications.map((medication, index) => (
              <li key={`${medication.name}-${index}`} className="space-y-0.5">
                <p className="font-medium">
                  {medication.name}
                  {medication.dosage ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {medication.dosage}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-sm">
                  {medication.takenAtLocal
                    ? `Taken ${formatLocalDate(medication.takenAtLocal)} at ${formatLocalTime(medication.takenAtLocal)}`
                    : "Time not recorded"}
                  {medication.helped
                    ? ` · ${HELPED_LABELS[medication.helped]}`
                    : ""}
                </p>
                {medication.notes ? (
                  <p className="text-sm">{medication.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {migraine.reliefMethods.length > 0 ? (
        <Section label="Relief methods tried">
          <ul className="space-y-1">
            {migraine.reliefMethods.map((relief) => (
              <li key={relief.method} className="flex flex-wrap gap-x-2">
                <span>{labelFor(relief.method)}</span>
                {relief.helped ? (
                  <span className="text-muted-foreground text-sm">
                    {HELPED_LABELS[relief.helped]}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {migraine.midasResult ? (
        <Section label="Activity impact (MIDAS)">
          <MidasScoreCard result={migraine.midasResult} />
        </Section>
      ) : null}

      {migraine.notes ? (
        <Section label="Notes">
          <p className="whitespace-pre-wrap">{migraine.notes}</p>
        </Section>
      ) : null}

      <Section label="Record">
        <p className="text-muted-foreground text-sm">
          Logged {formatLocalDate(toLocalish(migraine.createdAt))}
          {migraine.updatedAt !== migraine.createdAt
            ? ` · last edited ${formatLocalDate(toLocalish(migraine.updatedAt))}`
            : ""}
        </p>
      </Section>
    </div>
  );
}

/** Omitted entirely when the start has not happened yet. */
function ElapsedSoFar({ startedAt }: { startedAt: string }) {
  const elapsed = formatDuration(elapsedMinutesSince(startedAt));
  if (elapsed === null) return null;

  return (
    <p className="text-muted-foreground text-sm">Started {elapsed} ago.</p>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function BulletList({ values }: { values: string[] }) {
  return (
    <ul className="space-y-0.5">
      {values.map((value) => (
        <li key={value} className="flex items-baseline gap-2">
          <span aria-hidden className="text-muted-foreground">
            &bull;
          </span>
          <span>{labelFor(value)}</span>
          {isCustomValue(value) ? (
            <span className="text-muted-foreground text-xs">(your own)</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function NotRecorded() {
  return <p className="text-muted-foreground">Not recorded</p>;
}

/**
 * Audit stamps are true UTC instants, unlike the episode's own wall-clock
 * fields. Trimming to the date is enough for "logged on", and avoids implying
 * a precision the timezone of the reader would not support.
 */
function toLocalish(iso: string): string {
  return iso.slice(0, 16);
}
