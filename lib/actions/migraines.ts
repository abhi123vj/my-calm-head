"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/dal";
import {
  createMigraine,
  deleteMigraine,
  updateMigraine,
} from "@/lib/migraines/repository";
import { migraineInputSchema } from "@/lib/validation/migraine";

/**
 * Server Functions are reachable by direct POST, not only through the UI, so
 * each one verifies the session itself and re-validates its payload. The client
 * shapes the wizard state into a payload, but nothing about it is trusted here.
 */

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; errors: string[] };

export async function saveMigraine(payload: unknown): Promise<SaveResult> {
  await requireSession();

  const parsed = migraineInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: formatIssues(parsed.error.issues) };
  }

  const id = await createMigraine(parsed.data);
  revalidatePath("/");
  return { ok: true, id };
}

export async function saveMigraineEdit(
  id: string,
  payload: unknown,
): Promise<SaveResult> {
  await requireSession();

  const parsed = migraineInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: formatIssues(parsed.error.issues) };
  }

  const updated = await updateMigraine(id, parsed.data);
  if (!updated) {
    return { ok: false, errors: ["That episode no longer exists."] };
  }

  revalidatePath("/");
  return { ok: true, id };
}

export async function removeMigraine(id: string): Promise<SaveResult> {
  await requireSession();

  const deleted = await deleteMigraine(id);
  if (!deleted) {
    return { ok: false, errors: ["That episode no longer exists."] };
  }

  revalidatePath("/");
  return { ok: true, id };
}

function formatIssues(issues: { path: PropertyKey[]; message: string }[]): string[] {
  return issues.map((issue) => {
    const field = issue.path.map(String).join(".");
    return field.length > 0 ? `${field}: ${issue.message}` : issue.message;
  });
}
