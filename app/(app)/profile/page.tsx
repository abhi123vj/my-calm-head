import type { Metadata } from "next";

import { ProfileForm } from "@/components/profile/profile-form";
import { SignOutButton } from "@/components/profile/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { logout } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/profile/dal";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  // Reads the session itself, and is the same memoized read the header used.
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="Profile"
        description={`Signed in as ${profile.username}. This is how you appear in the app.`}
      />

      <Card>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <p className="text-caption text-muted-foreground">
        Your name and picture are stored in your own database, alongside your
        episodes, and are never shown to anyone else. Signing in always uses the
        username {profile.username}, whatever name you choose here.
      </p>

      {/* Signing out lives here, at the end of the one screen that is about the
          account, rather than in the header: it is a session-ending action, and
          the two taps it now takes are the point. The card is last on the page
          so the thing you came here to do - your name and your picture - is
          still what you land on. */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">Session</CardTitle>
          <CardDescription>
            You will stay signed in on this device until you sign out.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <form action={logout} className="max-sm:w-full">
            <SignOutButton />
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
