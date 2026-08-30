import { AVATAR_DIMENSION, AVATAR_MAX_BYTES } from "@/lib/validation/profile";

/**
 * Longest edge of the working copy the cropper pans and zooms.
 *
 * A photo off a phone is several thousand pixels wide, and dragging one around
 * at full size is where a cheap device starts to stutter. It also bounds what
 * the zoom ceiling can cost: a 16:9 photo capped here is 1152px on its short
 * edge, so even at the maximum {@link MAX_AVATAR_ZOOM} the crop covers 288
 * source pixels - still enough for the largest circle the app draws, 96px on a
 * screen at three device pixels to the CSS pixel.
 */
export const AVATAR_WORK_DIMENSION = 2048;

/** How far the cropper may zoom in, as a multiple of the fit-to-frame size. */
export const MAX_AVATAR_ZOOM = 4;

/**
 * A picked image, normalised into something the cropper can display and the
 * canvas can read back identically.
 *
 * `width` and `height` are the pixel size of what `url` points at, not of the
 * file that was picked, so the rectangle the cropper produces and the crop the
 * renderer draws are in the same coordinate space by construction.
 */
export type AvatarSource = {
  url: string;
  width: number;
  height: number;
  /**
   * The picked file, when storing it untouched beats re-encoding it. Only ever
   * used for a crop that covers the whole frame - see {@link renderAvatar}.
   */
  passthrough: File | null;
  /** Name of the picked file, so the stored one keeps a recognisable one. */
  name: string;
  /** Frees the object URL. Safe to call more than once. */
  release: () => void;
};

/** A square region of an {@link AvatarSource}, in that source's own pixels. */
export type CropRect = { x: number; y: number; size: number };

/**
 * Loads a picked photo into a form the cropper can work with.
 *
 * Everything but a GIF is redrawn once, up front: that bakes in the EXIF
 * orientation (without it a photo taken in portrait arrives on its side),
 * drops the metadata, and caps the size so panning stays smooth. Because the
 * cropper then displays those exact pixels, what is on screen and what is
 * written to the canvas cannot disagree about rotation.
 *
 * Failure falls back to showing the picked file as it is rather than throwing:
 * the server applies the same limits either way, so the worst case is an upload
 * rejected with a readable message instead of one that silently vanishes.
 */
export async function loadAvatarSource(file: File): Promise<AvatarSource> {
  // A GIF is left alone. Re-encoding one through a canvas keeps the first frame
  // and quietly discards the animation, so a small one is shown - and, when the
  // crop is left at the full frame, stored - exactly as it was picked.
  if (file.type === "image/gif" && file.size <= AVATAR_MAX_BYTES) {
    return await fromBlob(file, file, file.name);
  }

  try {
    return await fromBlob(await normalise(file), null, file.name);
  } catch {
    return await fromBlob(file, null, file.name);
  }
}

/**
 * The crop the cropper opens on: the largest centred square. It is also the
 * only crop that can pass a GIF through untouched, which is why both sides
 * compare against this function rather than against a literal.
 */
export function centredCrop(source: {
  width: number;
  height: number;
}): CropRect {
  const size = Math.min(source.width, source.height);
  return { x: (source.width - size) / 2, y: (source.height - size) / 2, size };
}

/** Whether `crop` is still the untouched {@link centredCrop} of `source`. */
export function isCentredCrop(
  source: { width: number; height: number },
  crop: CropRect,
): boolean {
  const centred = centredCrop(source);
  // A pixel of slack: the crop arrives from floating-point pan and zoom maths,
  // and a photo dragged to the edge and back should still count as untouched.
  return (
    Math.abs(crop.size - centred.size) <= 1 &&
    Math.abs(crop.x - centred.x) <= 1 &&
    Math.abs(crop.y - centred.y) <= 1
  );
}

/**
 * Draws the chosen square out of `source` and encodes it as a small avatar.
 *
 * The result is what the form submits, so the size ceiling is the point: what
 * the app draws is a 36px circle, and shrinking here is what keeps the Server
 * Function under its 1MB body limit, the Mongo document small, and the picture
 * quick to fetch on a phone connection.
 */
export async function renderAvatar(
  source: AvatarSource,
  crop: CropRect,
): Promise<File> {
  if (source.passthrough && isCentredCrop(source, crop)) {
    return source.passthrough;
  }

  const image = await decode(source.url);

  // Never scaled up: enlarging a small picture only makes a soft one heavier.
  const target = Math.max(1, Math.round(Math.min(AVATAR_DIMENSION, crop.size)));

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable.");

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.size,
    crop.size,
    0,
    0,
    target,
    target,
  );

  const encoded = await encode(canvas);
  return new File([encoded], renameFor(source.name, encoded.type), {
    type: encoded.type,
  });
}

/** Redraws a picked file upright, unpadded and no larger than it needs to be. */
async function normalise(file: File): Promise<Blob> {
  // `from-image` applies the EXIF orientation tag.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const scale = Math.min(
      1,
      AVATAR_WORK_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Encoded higher than the avatar itself: this copy is cropped and encoded
    // again afterwards, and compressing it twice at 0.85 would start to show.
    return await encode(canvas, 0.94);
  } finally {
    bitmap.close();
  }
}

/**
 * Wraps a blob as a source, measured through the same decode path the renderer
 * later uses, so the dimensions the crop maths is built on are the dimensions
 * the canvas will see.
 */
async function fromBlob(
  blob: Blob,
  passthrough: File | null,
  name: string,
): Promise<AvatarSource> {
  const url = URL.createObjectURL(blob);

  try {
    const image = await decode(url);
    let released = false;

    return {
      url,
      width: image.naturalWidth,
      height: image.naturalHeight,
      passthrough,
      name,
      release: () => {
        if (released) return;
        released = true;
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * An image element rather than an `ImageBitmap`: the cropper needs one on
 * screen in any case, and both it and this share the decoded object URL, so
 * the picture measured, the picture shown and the picture cropped are one.
 */
function decode(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be read."));
    image.src = url;
  });
}

/**
 * WebP first - it is roughly a third the size of the equivalent JPEG at this
 * quality. A browser that cannot encode it hands back some other format from
 * `toBlob`, which is why the result is checked rather than assumed.
 */
async function encode(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp?.type === "image/webp") return webp;

  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (jpeg?.type === "image/jpeg") return jpeg;

  const fallback = webp ?? jpeg;
  if (!fallback) throw new Error("Canvas produced no image.");
  return fallback;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renameFor(name: string, type: string): string {
  const extension = type === "image/webp" ? "webp" : "jpg";
  const base = name.replace(/\.[^.]+$/, "") || "avatar";
  return `${base}.${extension}`;
}
