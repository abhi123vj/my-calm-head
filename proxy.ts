import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decryptSession } from "@/lib/auth/token";

const LOGIN_PATH = "/login";

/**
 * Optimistic auth redirect.
 *
 * This only reads the session cookie — no database access — because Proxy runs
 * on every request including prefetches. It is a convenience, not the security
 * boundary: `requireSession()` in the Data Access Layer is what actually
 * protects data.
 */
export async function proxy(request: NextRequest) {
  const isLoginRoute = request.nextUrl.pathname === LOGIN_PATH;

  let session = null;
  try {
    session = await decryptSession(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
  } catch {
    // Misconfigured environment (e.g. missing SESSION_SECRET). Fail closed and
    // let the login page report the problem.
    session = null;
  }

  if (!session && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
