import Link from "next/link";
import {
  HEADACHE_TYPES,
  MAX_SEVERITY,
  MIN_SEVERITY,
  POSSIBLE_TRIGGERS,
  SYMPTOMS,
  type CatalogItem,
} from "@/lib/migraines/catalog";
import { describeFilters, hasActiveFilters } from "@/lib/migraines/filters";
import type { MigraineFilter } from "@/types/migraine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Filters as a plain GET form.
 *
 * Submitting navigates to `/history?...`, which means no client JavaScript, a
 * shareable URL, and a working back button. The checkbox groups sit inside
 * `<details>` so the panel stays short until a group is actually needed.
 */
export function FilterPanel({ filter }: { filter: MigraineFilter }) {
  const active = hasActiveFilters(filter);

  return (
    <form method="GET" action="/history" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Filters</p>
        {active ? (
          <Link
            href="/history"
            className="text-muted-foreground text-xs underline underline-offset-4"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      {active ? (
        <div className="flex flex-wrap gap-1.5">
          {describeFilters(filter).map((part) => (
            <span
              key={part}
              className="bg-muted inline-flex items-center rounded-full px-2.5 py-0.5 text-xs"
            >
              {part}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={filter.from ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={filter.to ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minSeverity">Severity from</Label>
          <Input
            id="minSeverity"
            name="minSeverity"
            type="number"
            min={MIN_SEVERITY}
            max={MAX_SEVERITY}
            placeholder={String(MIN_SEVERITY)}
            defaultValue={filter.minSeverity ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxSeverity">Severity to</Label>
          <Input
            id="maxSeverity"
            name="maxSeverity"
            type="number"
            min={MIN_SEVERITY}
            max={MAX_SEVERITY}
            placeholder={String(MAX_SEVERITY)}
            defaultValue={filter.maxSeverity ?? ""}
          />
        </div>
      </div>

      <CheckboxGroup
        legend="Symptoms"
        name="symptoms"
        options={SYMPTOMS}
        selected={filter.symptoms ?? []}
      />
      <CheckboxGroup
        legend="Possible triggers"
        name="triggers"
        options={POSSIBLE_TRIGGERS}
        selected={filter.possibleTriggers ?? []}
      />
      <CheckboxGroup
        legend="Headache type"
        name="type"
        options={HEADACHE_TYPES}
        selected={filter.headacheType ?? []}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={filter.status ?? ""}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          >
            <option value="">All</option>
            <option value="complete">Completed</option>
            <option value="draft">Drafts</option>
          </select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="ongoing"
            value="1"
            defaultChecked={filter.ongoing === true}
            className="size-4"
          />
          Ongoing only
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="sort">Order</Label>
          <select
            id="sort"
            name="sort"
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <Button type="submit" className="ml-auto">
          Apply filters
        </Button>
      </div>
    </form>
  );
}

function CheckboxGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: readonly CatalogItem[];
  selected: string[];
}) {
  return (
    <details open={selected.length > 0} className="rounded-lg border px-3 py-2">
      <summary className="cursor-pointer text-sm">
        {legend}
        {selected.length > 0 ? (
          <span className="text-muted-foreground"> · {selected.length} selected</span>
        ) : null}
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={option.id}
              defaultChecked={selected.includes(option.id)}
              className="size-4"
            />
            {option.label}
          </label>
        ))}
      </div>
    </details>
  );
}
