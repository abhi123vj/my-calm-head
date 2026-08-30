import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/auth/token";

/**
 * Data Access Layer entry point for authorization.
 *
 * `proxy.ts` only performs an optimistic redirect; this is the real check and
 * every server component, server action, and route handler that touches app
 * data must call it. Memoized with React `cache` so one render decrypts the
 * cookie once.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  return readSession();
});

export const requireSession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});
