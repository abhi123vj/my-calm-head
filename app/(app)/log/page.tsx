import type { Metadata } from "next";
import { LogWizard } from "@/components/log/log-wizard";
import { requireSession } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Log an episode",
};

export default async function LogPage() {
  await requireSession();

  return <LogWizard />;
}
