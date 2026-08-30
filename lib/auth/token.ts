import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

export const SESSION_COOKIE_NAME = "mch_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const sessionPayloadSchema = z.object({
  username: z.string().min(1),
  expiresAt: z.iso.datetime(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function signingKey(): Uint8Array {
  return new TextEncoder().encode(serverEnv().SESSION_SECRET);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(signingKey());
}

/**
 * Verifies a session token. Returns `null` for anything that is missing,
 * tampered with, expired, or malformed — callers treat that as "signed out".
 *
 * Kept free of `server-only` and `next/headers` so `proxy.ts` can use it.
 */
export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
    });
    const parsed = sessionPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
