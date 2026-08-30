/**
 * A single headline figure.
 *
 * `note` is where a figure states what it excluded - how many episodes had no
 * severity recorded, whether an average blends estimates - so a number is never
 * shown more confidently than the data behind it.
 */
export function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="space-y-0.5 rounded-lg border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
    </div>
  );
}
