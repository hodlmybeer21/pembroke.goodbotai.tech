// app/api/ask/route.ts — Ask-the-bot endpoint.
//
// v1.1: routes to a real LLM if NOUS_API_KEY env var is set; falls back to a
// context-aware deterministic stub otherwise. The site is fully functional
// without an LLM key — the stub returns useful context (recent + upcoming
// meetings) so visitors see something real.

import { NextResponse } from "next/server";
import { fetchAgendaCenter, loadOcrExport } from "@/lib/agenda-center";
import { fetchAllFeeds, filterHorizon } from "@/lib/ical";

export const runtime = "nodejs";
export const maxDuration = 10; // seconds

interface Meeting {
  committee: string;
  title: string;
  when: Date;
  url?: string;
}

async function buildContext(): Promise<{ meetings: Meeting[]; summaries: string[] }> {
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const [events, docs] = await Promise.all([
    fetchAllFeeds().catch(() => []),
    fetchAgendaCenter().catch(() => []),
  ]);
  const upcoming = filterHorizon(events, now, horizonEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 12);
  const meetings: Meeting[] = upcoming.map((e) => ({
    committee: e.committee,
    title: e.summary,
    when: e.start,
  }));
  const ocr = loadOcrExport();
  const summaries = Object.values(ocr?.summaries ?? {})
    .map((s) => s.summary)
    .filter((s): s is string => Boolean(s))
    .slice(0, 6);
  return { meetings, summaries };
}

function stubAnswer(q: string, ctx: { meetings: Meeting[]; summaries: string[] }): string {
  const qLow = q.toLowerCase();
  const hits = ctx.meetings.filter(
    (m) =>
      qLow.includes(m.committee.toLowerCase()) ||
      m.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && qLow.includes(w)),
  );
  const lines: string[] = [];
  if (hits.length > 0) {
    lines.push(
      `Based on the town calendar, here are the most relevant upcoming meetings for "${q}":`,
    );
    for (const m of hits.slice(0, 5)) {
      const when = m.when.toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      lines.push(`- ${m.committee} — ${m.title} — ${when}`);
    }
    lines.push("");
    lines.push(
      "Note: ask-the-bot answers are part of v2 (LLM endpoint not wired yet). This stub returns meeting matches from the live calendar. Real natural-language answers ship once a model API key is added.",
    );
  } else if (ctx.meetings.length > 0) {
    lines.push(`I don't have a specific answer for "${q}", but here are the next few meetings:`);
    for (const m of ctx.meetings.slice(0, 5)) {
      const when = m.when.toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
      lines.push(`- ${when} — ${m.committee} — ${m.title}`);
    }
    lines.push("");
    lines.push(
      "Full natural-language answers ship in v2 (no LLM API key configured yet). Browse the daily brief and the agenda list for the same underlying data.",
    );
  } else {
    lines.push(
      "The town calendar is empty for the next 90 days. Try the agenda list or come back tomorrow when fresh meetings get posted.",
    );
  }
  return lines.join("\n");
}

async function callLlm(q: string, ctx: { meetings: Meeting[]; summaries: string[] }): Promise<string> {
  const apiKey = process.env.NOUS_API_KEY;
  const apiUrl = process.env.NOUS_API_URL ?? "https://inference-api.nousresearch.com/v1/chat/completions";
  const model = process.env.NOUS_MODEL ?? "Hermes-4-405B";
  const system = [
    "You are the Pembroke NH town bot. Answer the user's question using ONLY the",
    "context below (recent + upcoming meetings, OCR'd agenda summaries). Be brief,",
    "conversational, and specific. If you don't know, say so. Don't invent details.",
    "Format: short prose, optionally a bulleted list of 1-5 items.",
  ].join(" ");
  const userParts: string[] = [`Question: ${q}\n\nContext:`];
  if (ctx.meetings.length) {
    userParts.push("Upcoming meetings:");
    for (const m of ctx.meetings) {
      const when = m.when.toISOString();
      userParts.push(`- ${when}  ${m.committee} — ${m.title}`);
    }
  }
  if (ctx.summaries.length) {
    userParts.push("\nRecent agenda summaries:");
    for (const s of ctx.summaries) {
      userParts.push(`- ${s}`);
    }
  }
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userParts.join("\n") },
      ],
      max_tokens: 400,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`LLM upstream ${res.status}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: Request) {
  let q = "";
  try {
    const body = await req.json();
    q = typeof body?.q === "string" ? body.q.trim() : "";
  } catch {
    // fall through
  }
  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }
  if (q.length > 500) {
    return NextResponse.json({ error: "q too long" }, { status: 400 });
  }

  const ctx = await buildContext();
  let answer: string;
  let mode: "llm" | "stub" = "stub";

  if (process.env.NOUS_API_KEY) {
    try {
      answer = await callLlm(q, ctx);
      mode = "llm";
    } catch (ex) {
      console.error("LLM call failed, falling back to stub:", ex);
      answer = stubAnswer(q, ctx);
    }
  } else {
    answer = stubAnswer(q, ctx);
  }

  return NextResponse.json({
    answer,
    q,
    mode,
    meetings_in_context: ctx.meetings.length,
    summaries_in_context: ctx.summaries.length,
  });
}

export async function GET() {
  // Health probe so we can verify the route is live without POSTing.
  return NextResponse.json({
    ok: true,
    llm_configured: Boolean(process.env.NOUS_API_KEY),
  });
}