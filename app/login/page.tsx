import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { CalmMark } from "@/components/layout/calm-mark";
import { getSession } from "@/lib/auth/dal";
import { serverEnvIssues } from "@/lib/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  if (await getSession()) {
    redirect("/");
  }

  const issues = serverEnvIssues();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10 sm:px-6">
      {/* A single soft lavender wash behind the card, rather than decorative
          shapes: it gives the screen some depth without anything to look at. */}
      <div
        aria-hidden
        className="from-lavender/70 pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b to-transparent"
      />

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden
            className="from-lavender-strong to-lavender-deep text-primary-strong flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-card"
          >
            <CalmMark className="size-7" />
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-title">
              My Calm Head
            </CardTitle>
            <CardDescription>Sign in to your migraine log.</CardDescription>
          </CardHeader>
          <CardContent>
            {issues.length > 0 ? (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden />
                <AlertTitle>Configuration incomplete</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Copy <code className="font-mono">.env.example</code> to{" "}
                    <code className="font-mono">.env</code> and fill in the
                    missing values, then restart the dev server.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <LoginForm />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

