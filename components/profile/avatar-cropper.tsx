"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

import {
  centredCrop,
  MAX_AVATAR_ZOOM,
  type AvatarSource,
  type CropRect,
} from "@/lib/profile/image";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Fit-to-frame. Zooming out past it would letterbox the square. */
const MIN_ZOOM = 1;

/** How far one arrow-key press moves the photo, as a fraction of the frame. */
const NUDGE = 0.02;

/**
 * Where the photo sits under the crop frame.
 *
 * `x` and `y` are the offset of the photo's centre from the frame's centre,
 * measured in frame widths rather than pixels. That one choice is what keeps
 * the whole component free of layout measurement: the frame is a square that
 * fills whatever width it is given, every size below is a percentage of it, and
 * a rotation or a resize needs no recalculation because nothing is stored in
 * device pixels. Only pointer deltas are converted, at the moment they arrive.
 */
type View = { zoom: number; x: number; y: number };

type Point = { x: number; y: number };

/**
 * The step between picking a photo and uploading it: position and zoom the
 * square that actually gets stored.
 *
 * Built for a thumb first - drag to move, pinch to zoom, and a slider wide
 * enough to use one-handed for when pinching is awkward. The pointer handlers
 * cover mouse, touch and pen through one code path, so the desktop affordances
 * (wheel to zoom, arrow keys to nudge) are additions rather than a second
 * implementation.
 */
export function AvatarCropper({
  source,
  initialCrop,
  open,
  onOpenChange,
  onConfirm,
}: {
  /** The picked photo, already decoded and turned upright. */
  source: AvatarSource | null;
  /** The crop to reopen on, so adjusting a staged photo resumes where it was. */
  initialCrop?: CropRect;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (crop: CropRect) => void;
}) {
  return (
    <Dialog open={open && source !== null} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          {/* Keyed on the photo, because the starting zoom and offset are
              seeded once at mount from `initialCrop`: a second pick has to
              mount a fresh view rather than keep the last photo's framing. */}
          {source ? (
            <CropStage
              key={source.url}
              source={source}
              initialCrop={initialCrop}
              onConfirm={onConfirm}
              onCancel={() => onOpenChange(false)}
            />
          ) : null}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

function CropStage({
  source,
  initialCrop,
  onConfirm,
  onCancel,
}: {
  source: AvatarSource;
  initialCrop?: CropRect;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  // Every live pointer on the stage, by id: one is a drag, two are a pinch.
  const pointers = useRef(new Map<number, Point>());

  /** The side of the largest square the photo can fill, in source pixels. */
  const cover = Math.min(source.width, source.height);
  const wide = source.width / cover;
  const tall = source.height / cover;

  const [view, setView] = useState<View>(() =>
    clampView(viewFromCrop(initialCrop ?? centredCrop(source))),
  );

  /**
   * The one place a view is made legal, so nothing downstream has to ask
   * whether it is: the zoom is in range, and the photo still covers the frame
   * on every side. A crop that leaves the photo is what would otherwise store
   * an avatar with a transparent edge.
   */
  function clampView(next: View): View {
    const zoom = clamp(next.zoom, MIN_ZOOM, MAX_AVATAR_ZOOM);
    // How far the photo may slide before an edge would enter the frame.
    const limitX = Math.max(0, (zoom * wide - 1) / 2);
    const limitY = Math.max(0, (zoom * tall - 1) / 2);
    return {
      zoom,
      x: clamp(next.x, -limitX, limitX),
      y: clamp(next.y, -limitY, limitY),
    };
  }

  function viewFromCrop(crop: CropRect): View {
    return {
      zoom: cover / crop.size,
      x: (source.width / 2 - crop.x) / crop.size - 0.5,
      y: (source.height / 2 - crop.y) / crop.size - 0.5,
    };
  }

  function cropFromView(next: View): CropRect {
    const size = cover / next.zoom;
    return {
      x: clamp(source.width / 2 - (0.5 + next.x) * size, 0, source.width - size),
      y: clamp(
        source.height / 2 - (0.5 + next.y) * size,
        0,
        source.height - size,
      ),
      size,
    };
  }

  /**
   * Zooms to `zoom` while holding `focal` still, then pans by `by`.
   *
   * Keeping the focal point fixed is what makes a pinch feel like the photo is
   * being stretched between two fingers rather than jumping to the centre; the
   * wheel reuses it with the cursor, and the slider passes the centre.
   */
  function zoomAt(current: View, zoom: number, focal: Point, by?: Point): View {
    // Clamped before the ratio is taken, not after: pinching past the ceiling
    // should stop zooming, not carry on dragging the photo out from under the
    // fingers holding it.
    const next = clamp(zoom, MIN_ZOOM, MAX_AVATAR_ZOOM);
    const ratio = next / current.zoom;
    return clampView({
      zoom: next,
      x: focal.x - (focal.x - current.x) * ratio + (by?.x ?? 0),
      y: focal.y - (focal.y - current.y) * ratio + (by?.y ?? 0),
    });
  }

  function pan(by: Point) {
    setView((current) =>
      clampView({ ...current, x: current.x + by.x, y: current.y + by.y }),
    );
  }

  // React registers `wheel` passively at the root, so preventing the page from
  // zooming or scrolling behind the dialog needs the listener attached by hand.
  useEffect(() => {
    const node = stage.current;
    if (!node) return;

    // An arrow rather than a declaration so `node` stays narrowed past the
    // early return above.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      if (rect.width === 0) return;

      // `deltaMode` 1 is lines rather than pixels, which a mouse wheel on
      // Firefox still reports; 16 is the usual line height it stands in for.
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      setView((current) =>
        zoomAt(current, current.zoom * Math.exp(-delta / 320), {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        }),
      );
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // A right-click opens the context menu and never reports a release, which
    // would leave a phantom pointer in the map and turn the next ordinary drag
    // into a pinch against a finger that is not there.
    if (event.pointerType === "mouse" && event.button !== 0) return;

    // Capture so a finger that slides off the frame keeps driving the drag
    // instead of the gesture dying at the edge - which on a phone is most of
    // them. Each pointer is captured separately, so a pinch still works.
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const live = pointers.current;
    const previous = live.get(event.pointerId);
    if (!previous) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;

    const before = [...live.values()];
    live.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = [...live.values()];

    if (before.length < 2) {
      pan({
        x: (event.clientX - previous.x) / rect.width,
        y: (event.clientY - previous.y) / rect.height,
      });
      return;
    }

    // A pinch is a zoom about the midpoint plus whatever that midpoint itself
    // moved, so two fingers can reframe and resize in the same gesture.
    const from = pinch(before);
    const to = pinch(after);
    const focal = {
      x: (from.x - rect.left) / rect.width - 0.5,
      y: (from.y - rect.top) / rect.height - 0.5,
    };
    const by = {
      x: (to.x - from.x) / rect.width,
      y: (to.y - from.y) / rect.height,
    };
    const ratio = from.spread > 0 ? to.spread / from.spread : 1;

    setView((current) => zoomAt(current, current.zoom * ratio, focal, by));
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Arrows move the photo the way a drag would, so the two agree.
    const step = event.shiftKey ? NUDGE * 5 : NUDGE;
    const centre = { x: 0, y: 0 };

    switch (event.key) {
      case "ArrowLeft":
        pan({ x: -step, y: 0 });
        break;
      case "ArrowRight":
        pan({ x: step, y: 0 });
        break;
      case "ArrowUp":
        pan({ x: 0, y: -step });
        break;
      case "ArrowDown":
        pan({ x: 0, y: step });
        break;
      case "+":
      case "=":
        setView((current) => zoomAt(current, current.zoom * 1.15, centre));
        break;
      case "-":
      case "_":
        setView((current) => zoomAt(current, current.zoom / 1.15, centre));
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  return (
    <>
      <div className="space-y-1">
        <DialogTitle>Position your photo</DialogTitle>
        <DialogDescription>
          Drag to move it, pinch or use the slider to zoom. The circle is how it
          will appear.
        </DialogDescription>
      </div>

      {/* `dvh` rather than `vh` so the frame shrinks with the visible viewport
          on a phone instead of pushing the buttons under the URL bar, and
          `min` so a tall screen still gets a frame no wider than the sheet. */}
      <div
        ref={stage}
        tabIndex={0}
        role="group"
        aria-label="Photo position. Drag to move it, or use the arrow keys."
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="relative mx-auto aspect-square w-full max-w-[min(100%,48dvh)] cursor-grab touch-none overflow-hidden rounded-xl bg-surface-sunken select-none active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source.url}
          alt=""
          draggable={false}
          // The width is a percentage of the frame and the height follows from
          // the photo's own ratio, so the picture is laid out entirely in frame
          // units - see `View`. `max-w-none` stops the global image reset from
          // capping a zoomed photo at the frame width.
          style={{
            width: `${view.zoom * wide * 100}%`,
            aspectRatio: `${source.width} / ${source.height}`,
            // Anchored at the frame's centre, then shifted by half its own size
            // to centre it and by the offset to place it. A transform
            // percentage is relative to the element, which is why the offset -
            // held in frame widths - is divided by the photo's size in those
            // same units.
            transform: `translate(${
              (view.x / (view.zoom * wide)) * 100 - 50
            }%, ${(view.y / (view.zoom * tall)) * 100 - 50}%)`,
          }}
          className="pointer-events-none absolute top-1/2 left-1/2 h-auto max-w-none"
        />

        {/* The stored image is the whole square; the circle is what the app
            actually draws. Dimming the corners with an outsized shadow on the
            circle - clipped by the frame's own overflow - shows both at once
            without a second masked element. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(37_38_58/0.45)] ring-1 ring-white/70 ring-inset"
        />
      </div>

      <div className="flex items-center gap-3">
        <ZoomOut aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_AVATAR_ZOOM}
          step={0.01}
          value={view.zoom}
          aria-label="Zoom"
          onChange={(event) =>
            setView((current) =>
              zoomAt(current, Number(event.target.value), { x: 0, y: 0 }),
            )
          }
          className="h-11 w-full cursor-pointer"
        />
        <ZoomIn aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onConfirm(cropFromView(view))}>
          Use photo
        </Button>
      </DialogFooter>
    </>
  );
}

/** Midpoint and separation of the first two fingers down. */
function pinch(points: Point[]): Point & { spread: number } {
  const [a, b] = points;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    spread: Math.hypot(b.x - a.x, b.y - a.y),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
