// app/settings/page.tsx — User profile + category preferences. Protected.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfile, listWatches } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";
import { WatchesForm } from "@/components/WatchesForm";

export const dynamic = "force-dynamic";

function clerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return false;
  if (key.startsWith("pk_test_local")) return false;
  if (key.includes("local_only")) return false;
  return true;
}

interface StreetOption {
  street: string;
  match_count_90d: number;
}

function loadStreets(): StreetOption[] {
  try {
    const p = join(process.cwd(), "data", "streets.json");
    if (!existsSync(p)) return [];
    const j = JSON.parse(readFileSync(p, "utf-8")) as { streets: StreetOption[] };
    return j.streets ?? [];
  } catch {
    return [];
  }
}

function loadMatchCounts(): Record<string, number> {
  try {
    const p = join(process.cwd(), "data", "watches.json");
    if (!existsSync(p)) return {};
    const j = JSON.parse(readFileSync(p, "utf-8")) as {
      by_user: Record<string, { street: string; match_count_90d?: number }[]>;
    };
    const out: Record<string, number> = {};
    for (const userWatches of Object.values(j.by_user ?? {})) {
      for (const w of userWatches) {
        if (typeof w.match_count_90d === "number") {
          out[w.street.toLowerCase()] = w.match_count_90d;
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

export default async function SettingsPage() {
  if (!clerkConfigured()) {
    return (
      <div className="container-page">
        <h1 className="text-2xl font-semibold mb-2">Alert preferences</h1>
        <p className="text-sm text-stone-600">
          Authentication isn't configured yet. Add{" "}
          <code className="px-1 py-0.5 bg-stone-100 rounded text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
          and{" "}
          <code className="px-1 py-0.5 bg-stone-100 rounded text-xs">CLERK_SECRET_KEY</code>{" "}
          to Vercel project env, redeploy, then come back here.
        </p>
      </div>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) redirect("/sign-in");

  // Load each piece independently so a single failure doesn't take down
  // the whole page. Log the error so we can debug from Vercel runtime
  // logs, and render whatever subset of features did load.
  let profile: Awaited<ReturnType<typeof getProfile>> = null;
  try {
    profile = await getProfile(userId);
  } catch (ex) {
    console.error(`[settings] getProfile failed for userId=${userId.slice(0, 12)}: ${String(ex).slice(0, 400)}`);
  }
  const initialCategories = profile?.categories ?? [];
  const initialTelegramEnabled = profile?.telegram_enabled ?? false;
  const unsubscribeToken = profile?.unsubscribe_token ?? "";

  let liveWatches: Awaited<ReturnType<typeof listWatches>> = [];
  try {
    liveWatches = await listWatches(userId);
  } catch (ex) {
    console.error(`[settings] listWatches failed for userId=${userId.slice(0, 12)}: ${String(ex).slice(0, 400)}`);
  }
  const matchCounts = loadMatchCounts();
  const initialWatches = liveWatches.map((w) => ({
    street: w.street,
    created_at: w.created_at instanceof Date ? w.created_at.toISOString() : String(w.created_at),
    match_count_90d: matchCounts[w.street.toLowerCase()] ?? 0,
  }));

  const streets = loadStreets();

  return (
    <div className="container-page">
      <h1 className="text-2xl font-semibold mb-1">Alert preferences</h1>
      <p className="text-sm text-stone-500 mb-6">
        Pick the topics you care about. New postings matching any of them will
        arrive in your inbox. You can also add a street watch below.
      </p>
      <SettingsForm
        email={email}
        initialCategories={initialCategories}
        initialTelegramEnabled={initialTelegramEnabled}
        unsubscribeToken={unsubscribeToken}
      />
      {streets.length > 0 && (
        <div className="mt-6">
          <WatchesForm initialWatches={initialWatches} streets={streets} />
        </div>
      )}
    </div>
  );
}