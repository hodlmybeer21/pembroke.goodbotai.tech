// app/settings/page.tsx — User profile + category preferences. Protected.

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) redirect("/sign-in");

  const profile = await getProfile(userId);
  const initialCategories = profile?.categories ?? [];
  const unsubscribeToken = profile?.unsubscribe_token ?? "";

  return (
    <div className="container-page">
      <h1 className="text-2xl font-semibold mb-1">Alert preferences</h1>
      <p className="text-sm text-stone-500 mb-6">
        Pick the topics you care about. New postings matching any of them will
        arrive in your inbox.
      </p>
      <SettingsForm
        email={email}
        initialCategories={initialCategories}
        unsubscribeToken={unsubscribeToken}
      />
    </div>
  );
}