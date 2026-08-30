"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth/credentials";
import { createSession, deleteSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error?: string };

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter both a username and a password." };
  }

  // A single generic message: never reveal which half was wrong.
  if (!verifyCredentials(parsed.data.username, parsed.data.password)) {
    return { error: "Incorrect username or password." };
  }

  await createSession(parsed.data.username);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
