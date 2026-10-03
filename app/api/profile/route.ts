// app/api/profile/route.ts — Read/write user profile + categories.

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getProfile, upsertProfile, setTelegramCreds } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";

const VALID_IDS = new Set(CATEGORIES.map((c) => c.id));

function isValidCategoryList(ids: unknown): ids is string[] {
  if (!Array.isArray(ids)) return false;
  return ids.every((x) => typeof x === "string" && VALID_IDS.has(x));
}

function publicProfile(p: Awaited<ReturnType<typeof getProfile>>) {
  if (!p) return null;
  // Never include unsubscribe_token or any *_encrypted column. telegram_enabled
  // is the only state we expose about the user's Telegram setup.
  return {
    email: p.email,
    categories: p.categories,
    telegram_enabled: p.telegram_enabled,
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const profile = await getProfile(userId);
  return NextResponse.json({ profile: publicProfile(profile) });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "no email" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const cats = (body as { categories?: unknown })?.categories;
  if (!isValidCategoryList(cats)) {
    return NextResponse.json({ error: "invalid categories" }, { status: 400 });
  }
  const profile = await upsertProfile(userId, email, cats);
  return NextResponse.json({ profile: publicProfile(profile) });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Zero out the categories — keep the row so unsubscribe still resolves,
  // but stop any future alerts. Hard delete would also work; this is gentler.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  if (!email) {
    return NextResponse.json({ error: "no email" }, { status: 400 });
  }
  await upsertProfile(userId, email, []);
  return NextResponse.json({ ok: true });
}