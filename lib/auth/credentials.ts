import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Compares two strings without leaking their contents through timing.
 * Both sides are hashed first so the buffers are always the same length —
 * `timingSafeEqual` throws on length mismatch, and the length itself would
 * otherwise leak the password length.
 */
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

export function verifyCredentials(username: string, password: string): boolean {
  const env = serverEnv();
  // Both comparisons always run; `&&` would short-circuit and reveal whether
  // the username matched.
  const usernameMatches = safeEqual(username, env.APP_USERNAME);
  const passwordMatches = safeEqual(password, env.APP_PASSWORD);
  return usernameMatches && passwordMatches;
}
