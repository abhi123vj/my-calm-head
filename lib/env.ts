import { z } from "zod";

/**
 * Server-side environment configuration.
 *
 * Every value here is a secret or a deployment detail and must never reach the
 * browser. This module deliberately avoids `server-only` so that `proxy.ts`
 * can import it, and guards against browser evaluation at runtime instead.
 */
const serverEnvSchema = z.object({
  MONGODB_URI: z
    .string()
    .min(1, { error: "MONGODB_URI is required." })
    .refine((value) => /^mongodb(\+srv)?:\/\//.test(value), {
      error: "MONGODB_URI must start with mongodb:// or mongodb+srv://.",
    }),
  MONGODB_DATABASE: z.string().min(1).default("migraine_tracker"),
  APP_USERNAME: z.string().min(1, { error: "APP_USERNAME is required." }),
  APP_PASSWORD: z.string().min(1, { error: "APP_PASSWORD is required." }),
  SESSION_SECRET: z.string().min(32, {
    error:
      "SESSION_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32",
  }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

function parseEnv() {
  if (typeof window !== "undefined") {
    throw new Error("lib/env.ts was imported from the browser bundle.");
  }
  return serverEnvSchema.safeParse(process.env);
}

/**
 * Returns validated environment configuration, throwing a readable error when
 * something is missing. Parsing is lazy and memoized so a build never fails
 * just because secrets are absent from the build environment.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = parseEnv();
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(parsed).join("\n")}\n\n` +
        "Copy .env.example to .env and fill in the missing values.",
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Non-throwing variant used by UI that wants to explain a misconfiguration
 * rather than crash. Returns an empty array when the environment is valid.
 */
export function serverEnvIssues(): string[] {
  if (cached) return [];
  const parsed = parseEnv();
  if (parsed.success) {
    cached = parsed.data;
    return [];
  }
  return formatIssues(parsed);
}

function formatIssues(parsed: { error: z.ZodError }): string[] {
  return parsed.error.issues.map(
    (issue) => `${issue.path.join(".") || "env"}: ${issue.message}`,
  );
}
