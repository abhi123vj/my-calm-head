import Link from "next/link";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/**
 * Filters as a plain GET form.
 *
 * Submitting navigates to `/history?...`, which means no client JavaScript, a
 * shareable URL, and a working back button.
 *
 * The whole panel is now a disclosure rather than an always-open form. On a
 * phone the expanded version was four inputs, three checkbox groups and two
 * selects sitting above the results - the filters occupied the screen the list
 * was supposed to be on. Collapsed, the summary row still shows what is applied,
 * so nothing is hidden; it opens by default whenever a filter is active.
 */
export function FilterPanel({ filter }: { filter: MigraineFilter }) {
  const active = hasActiveFilters(filter);

  return (
    <details
      open={active}
      className="group/filters border-border bg-card overflow-hidden rounded-xl border shadow-card"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal aria-hidden className="text-primary size-4 shrink-0" />
        <span className="text-body-sm font-medium">Filters</span>
        {active ? (
          <span className="min-w-0 flex-1">
            <span className="sr-only">Active filters:</span>
            <span className="flex flex-wrap gap-1.5">
              {describeFilters(filter).map((part) => (
                <Badge key={part} variant="lavender">
                  {part}
                </Badge>
              ))}
            </span>
          </span>
        ) : (
          <span className="text-caption text-muted-foreground flex-1">None applied</span>
        )}
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open/filters:rotate-180"
        />
      </summary>

      <form
        method="GET"
        action="/history"
        className="border-border space-y-5 border-t p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={filter.from ?? ""} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={filter.to ?? ""} />
          </Field>
          <Field label="Severity from" htmlFor="minSeverity">
            <Input
              id="minSeverity"
              name="minSeverity"
              type="number"
              min={MIN_SEVERITY}
              max={MAX_SEVERITY}
              placeholder={String(MIN_SEVERITY)}
              defaultValue={filter.minSeverity ?? ""}
            />
          </Field>
          <Field label="Severity to" htmlFor="maxSeverity">
            <Input
              id="maxSeverity"
              name="maxSeverity"
              type="number"
              min={MIN_SEVERITY}
              max={MAX_SEVERITY}
              placeholder={String(MAX_SEVERITY)}
              defaultValue={filter.maxSeverity ?? ""}
            />
          </Field>
        </div>

        <div className="space-y-2">
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={filter.status ?? ""}>
              <option value="">All</option>
              <option value="complete">Completed</option>
              <option value="draft">Drafts</option>
            </Select>
          </Field>

          <Field label="Order" htmlFor="sort">
            <Select id="sort" name="sort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          </Field>
        </div>

        <CheckboxField
          className="-ml-2"
          label="Ongoing episodes only"
          name="ongoing"
          value="1"
          defaultChecked={filter.ongoing === true}
        />

        <div className="border-border flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          {active ? (
            <Link href="/history" className={buttonVariants({ variant: "ghost" })}>
              Clear all
            </Link>
          ) : null}
          <Button type="submit">Apply filters</Button>
        </div>
      </form>
    </details>
  );
}

/**
 * A nested disclosure per group, so the panel stays short until a group is
 * actually needed. Two columns from `sm` - a single 320px column of twenty
 * symptoms is a lot of scrolling, but two columns of them at that width is
 * unreadable.
 */
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
    <details
      open={selected.length > 0}
      className="group/group border-border bg-surface-sunken/50 overflow-hidden rounded-lg border"
    >
      <summary className="text-body-sm flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open/group:rotate-180"
        />
        <span className="font-medium">{legend}</span>
        {selected.length > 0 ? (
          <Badge variant="lavender" className="ml-auto">
            {selected.length} selected
          </Badge>
        ) : null}
      </summary>
      <div className="border-border grid gap-0.5 border-t p-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <CheckboxField
            key={option.id}
            label={option.label}
            name={name}
            value={option.id}
            defaultChecked={selected.includes(option.id)}
          />
        ))}
      </div>
    </details>
  );
}
