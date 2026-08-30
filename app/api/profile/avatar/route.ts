import type { NextRequest } from "next/server";

import { getSession } from "@/lib/auth/dal";
import { getProfileAvatar } from "@/lib/profile/repository";

/**
 * Serves the account holder's avatar.
 *
 * The picture is stored as binary in Mongo, so it needs a URL of its own: an
 * image cannot be streamed inline with a server-rendered page, and routing it
 * through a route handler keeps the bytes out of every RSC payload that merely
 * needs to draw a 36px circle.
 *
 * It is not public. `getSession` is checked here rather than relied upon from
 * the proxy, which only redirects optimistically.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const avatar = await getProfileAvatar(session.username);
  if (!avatar) {
    return new Response(null, { status: 404 });
  }

  const etag = `"${avatar.updatedAt}-${avatar.size}"`;
  const headers = new Headers({
    "Content-Type": avatar.contentType,
    ETag: etag,
    // The bytes were type-checked on upload, but a browser must not be left to
    // second-guess the content type of a file someone uploaded either way.
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
    "Cache-Control": cacheControl(request, avatar.updatedAt),
  });

  // A revalidation on an unchanged picture costs a round trip and no bytes.
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  headers.set("Content-Length", String(avatar.size));
  return new Response(avatar.data, { status: 200, headers });
}

/**
 * `private` throughout: this is one person's photo and no shared cache should
 * hold it.
 *
 * Callers append `?v=<updatedAt>`, which makes the URL change whenever the
 * picture does. When that version matches what is stored, the response can be
 * cached hard - the header avatar then costs nothing on every navigation, and a
 * new upload is picked up because the URL itself is different. Without the
 * parameter the URL is not versioned, so the browser has to revalidate.
 */
function cacheControl(request: NextRequest, updatedAt: string): string {
  const requestedVersion = request.nextUrl.searchParams.get("v");
  return requestedVersion === updatedAt
    ? "private, max-age=31536000, immutable"
    : "private, max-age=0, must-revalidate";
}
