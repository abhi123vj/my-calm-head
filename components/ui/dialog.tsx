"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

/**
 * A modal, styled the way the rest of the app is: a bottom sheet on a phone,
 * a centred card from `sm` up.
 *
 * The two layouts are one element rather than two, so there is a single focus
 * trap and a single piece of content to keep in step. Only the positioning
 * classes change at the breakpoint; the entry animation is split with `max-sm`
 * so the sheet's slide never fights the centred card's own translate.
 */
function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        // `absolute` under `-webkit-touch-callout` is the iOS fix Base UI
        // documents: on iOS 26 a fixed backdrop stops short of the visible
        // viewport once the URL bar collapses.
        "fixed inset-0 z-50 min-h-dvh bg-[#25263a]/45 backdrop-blur-[2px] transition-opacity duration-200 supports-[-webkit-touch-callout:none]:absolute",
        "data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogPopup({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-popup"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex max-h-dvh flex-col gap-4 overflow-y-auto rounded-t-2xl border border-border bg-card p-4 text-body text-card-foreground shadow-pop outline-none",
        // Keeps the buttons clear of the home indicator, which is the reason a
        // sheet gets its bottom padding from the inset rather than a constant.
        "pb-[calc(--spacing(4)+env(safe-area-inset-bottom,0px))]",
        "transition-[opacity,translate] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0",
        "max-sm:data-ending-style:translate-y-6 max-sm:data-starting-style:translate-y-6",
        "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5 sm:pb-5",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-heading text-foreground", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Actions stack full-width on a phone - two 44px targets one above the other
 * are easier to hit than two half-width ones - and sit on one row from `sm` up.
 * The confirming action goes last in the DOM, which puts it under the thumb at
 * the bottom of the sheet and on the right of the desktop row, without either
 * layout having to reverse the order.
 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

const DialogPortal = DialogPrimitive.Portal;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
