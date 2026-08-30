import { AVATAR_ALLOWED_TYPES } from "@/lib/validation/profile";

export type AvatarImageType = (typeof AVATAR_ALLOWED_TYPES)[number];

/**
 * Identifies an image from its leading bytes.
 *
 * The mime type on an upload is supplied by the client and can say anything.
 * That matters here because the avatar route serves these bytes back to a
 * browser: a file claiming to be `image/png` while actually containing markup
 * is the classic way to turn an upload feature into stored XSS. Trusting the
 * content over the label closes that off at the point of storage, so nothing
 * downstream has to be careful.
 *
 * Returns `null` for anything that is not one of the formats we accept.
 */
export function sniffImageType(bytes: Uint8Array): AvatarImageType | null {
  if (bytes.byteLength < 12) return null;

  // FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // 89 "PNG" CR LF 1A LF
  if (
    matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }

  // "GIF87a" or "GIF89a"
  if (ascii(bytes, 0, 3) === "GIF") {
    const version = ascii(bytes, 3, 3);
    if (version === "87a" || version === "89a") return "image/gif";
  }

  // "RIFF" <4-byte length> "WEBP"
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }

  return null;
}

function matches(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let result = "";
  for (let index = offset; index < offset + length; index += 1) {
    result += String.fromCharCode(bytes[index]);
  }
  return result;
}
