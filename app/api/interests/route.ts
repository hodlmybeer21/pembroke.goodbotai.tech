// app/api/interests/route.ts — Proactive suggestions for the ask bot.
//
// Returns new archive entries that match the visitor's recorded
// interests. Called on /ask mount. The visitor is identified by an
// opaque sessionId stored in their localStorage; the server has no
// PII, no auth, no cross-site tracking.

import { NextResponse } from "next/server";
import { findProactiveHits, type ProactiveHit } from "@/lib/interests";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
  const since = url.searchParams.get("since")?.trim() ?? null;
  if (!sessionId) {
    return NextResponse.json({ hits: [] as ProactiveHit[] });
  }
  if (sessionId.length > 64) {
    // Refuse obviously invalid IDs.
    return NextResponse.json({ hits: [] as ProactiveHit[] });
  }
  const hits = await findProactiveHits(sessionId, since, 5);
  return NextResponse.json({ hits });
}