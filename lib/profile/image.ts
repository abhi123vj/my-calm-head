import { AVATAR_DIMENSION, AVATAR_MAX_BYTES } from "@/lib/validation/profile";

/**
 * Turns a picked photo into a small square avatar, in the browser.
 *
 * A photo off a phone is several megabytes and several thousand pixels wide;
 * what the app draws is a 36px circle. Shrinking before upload is what keeps
 * the Server Function under its 1MB body limit, keeps the Mongo document small,
 * and keeps the picture quick to fetch on a phone connection.
 *
 * Every failure path returns the original file rather than throwing: the server
 * validates size and type regardless, so the worst case is an upload that is
 * rejected with a readable message instead of one that silently vanishes.
 */
export async function shrinkAvatar(file: File): Promise<File> {
  // Re-encoding an animated GIF through a canvas would keep the first frame
  // and quietly discard the animation, so a small one is left exactly as it is.
  if (file.type === "image/gif" && file.size <= AVATAR_MAX_BYTES) {
    return file;
  }

  try {
    return await drawSquare(file);
  } catch {
    return file;
  }
}

async function drawSquare(file: File): Promise<File> {
  // `from-image` applies the EXIF orientation tag. Without it a photo taken in
  // portrait on a phone arrives on its side.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    // Centre crop to a square, then scale down. Never up: enlarging a small
    // picture only makes a soft one heavier.
    const crop = Math.min(bitmap.width, bitmap.height);
    const target = Math.min(AVATAR_DIMENSION, crop);

    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable.");

    context.drawImage(
      bitmap,
      (bitmap.width - crop) / 2,
      (bitmap.height - crop) / 2,
      crop,
      crop,
      0,
      0,
      target,
      target,
    );

    const encoded = await encode(canvas);
    return new File([encoded], renameFor(file.name, encoded.type), {
      type: encoded.type,
    });
  } finally {
    bitmap.close();
  }
}

/**
 * WebP first - it is roughly a third the size of the equivalent JPEG at this
 * quality. A browser that cannot encode it hands back some other format from
 * `toBlob`, which is why the result is checked rather than assumed.
 */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(canvas, "image/webp", 0.85);
  if (webp?.type === "image/webp") return webp;

  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
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
