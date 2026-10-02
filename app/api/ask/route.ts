// app/api/ask/route.ts — Stub endpoint for v1.
// v2 will route to a real LLM (Hermes Cloud) with the live agenda + calendar
// context. v1 returns a graceful placeholder so the UI works end-to-end.

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let q = "";
  try {
    const body = await req.json();
    q = typeof body?.q === "string" ? body.q.trim() : "";
  } catch {
    // fall through with empty q
  }
  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }
  return NextResponse.json({
    answer:
      "Ask-the-bot answers are part of v2 (LLM endpoint not live yet). " +
      "Browse the daily brief and the agenda list on the home page — same data, " +
      "without the chat. Real answers ship once Tyler wires one in.",
    q,
    _internal_capability: true,
  });
}