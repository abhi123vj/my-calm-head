import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
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
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>My Calm Head</CardTitle>
          <CardDescription>Sign in to your migraine log.</CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Configuration incomplete</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Copy <code>.env.example</code> to <code>.env</code> and fill
                  in the missing values, then restart the dev server.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <LoginForm />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
