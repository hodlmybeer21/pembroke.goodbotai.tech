// app/api/persona/route.ts — Set the user's persona + apply the
// persona's default category bundle.
//
// Auth: Clerk. Used by the onboarding modal on first visit and by
// the settings page when the user changes their persona.

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { findPersona } from "@/lib/categories";
import { setPersona } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "no email" }, { status: 400 });
  }
  let body: { persona?: string; categories?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const personaId = (body.persona ?? "").trim();
  if (!personaId) {
    return NextResponse.json({ error: "missing persona" }, { status: 400 });
  }
  const persona = findPersona(personaId);
  if (!persona) {
    return NextResponse.json({ error: "unknown persona" }, { status: 400 });
  }
  // If the request specifies categories, validate they're a subset of
  // the persona's defaults. If not, just use the persona's defaults.
  // This lets the frontend either commit-on-pick or commit-with-edits.
  const requestedCategories = Array.isArray(body.categories) ? body.categories : null;
  const isValidSubset =
    requestedCategories !== null &&
    requestedCategories.every((c) => persona.categories.includes(c));
  const finalCategories = isValidSubset ? requestedCategories! : persona.categories;
  const profile = await setPersona(user.id, email, persona.id, finalCategories);
  return NextResponse.json({
    profile: {
      email: profile.email,
      categories: profile.categories,
      telegram_enabled: profile.telegram_enabled,
      persona: profile.persona,
    },
  });
}