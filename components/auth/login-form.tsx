"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert } from "lucide-react";

import { login, type LoginState } from "@/lib/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);
  const invalid = Boolean(state.error);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Username" htmlFor="username">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "login-error" : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "login-error" : undefined}
        />
      </Field>

      {state.error ? (
        // `aria-live` matters here: the error arrives after submit without a
        // navigation, so nothing else would announce it.
        <Alert variant="destructive" id="login-error" aria-live="polite">
          <CircleAlert aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton />
    </form>
  );
}
