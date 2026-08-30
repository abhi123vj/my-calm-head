import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + hint, wired together.
 *
 * The label/control/hint stack was repeated inline in every form in the app,
 * and the hint was never associated with the input. Here the hint gets an id
 * and the caller points the control at it with `aria-describedby`, so a screen
 * reader reads the guidance along with the field.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-caption text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A labelled group of controls that is not a single input, e.g. a chip set. */
export function FieldGroup({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-body-sm mb-2 font-medium text-foreground">
        {label}
      </legend>
      {children}
      {hint ? (
        <p className="text-caption text-muted-foreground">{hint}</p>
      ) : null}
    </fieldset>
  );
}
