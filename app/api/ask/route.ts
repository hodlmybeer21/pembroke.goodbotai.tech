// app/api/ask/route.ts — Ask-the-bot endpoint.
//
// Routes to a real LLM (Nous Research inference API) if NOUS_API_KEY is set;
// otherwise returns a deterministic stub that surfaces relevant town-info
// pages and upcoming meetings.
//
// Context sources:
//   - iCal feeds (upcoming meetings, 90d horizon)
//   - agenda center HTML (new postings)
//   - data/ocr-summaries.json (Tyler's Mac OCR cache, refreshed daily)
//   - data/town-info.json (Tyler's Mac scrape of pembroke-nh.com service pages,
//     refreshed daily) — this is the "where is the library / how does trash
//     pickup work" source

import { NextResponse } from "next/server";
import { fetchAgendaCenter, loadOcrExport } from "@/lib/agenda-center";
import { fetchAllFeeds, filterHorizon } from "@/lib/ical";
import { loadTownInfo, selectRelevantPages } from "@/lib/town-info";

export const runtime = "nodejs";
export const maxDuration = 10; // seconds

interface Meeting {
  committee: string;
  title: string;
  when: Date;
  url?: string;
}

interface AskContext {
  meetings: Meeting[];
  summaries: string[];
  townPages: { slug: string; text: string }[];
}

async function buildContext(q: string): Promise<AskContext> {
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const [events, docs, townInfo] = await Promise.all([
    fetchAllFeeds().catch(() => []),
    fetchAgendaCenter().catch(() => []),
    Promise.resolve(loadTownInfo()),
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
  const townPages = townInfo ? selectRelevantPages(q, townInfo) : [];
  return { meetings, summaries, townPages };
}

function isGeneralTownQuestion(q: string): boolean {
  const qLow = q.toLowerCase();
  return /(library|book|trash|rubbish|garbage|pickup|recycl|transfer.*station|curbside|snow|plow|fire|department|police|cemeter|stormwater|vital.record|marriage|death|birth|vot|elect|assess|tax|zoning|build.*permit|permit)/.test(
    qLow,
  );
}

function stubAnswer(q: string, ctx: AskContext): string {
  const lines: string[] = [];

  // 1) Town-info pages (general questions about services / how-to)
  if (ctx.townPages.length > 0) {
    lines.push(
      "Here's what the town's website says about that (excerpted from pembroke-nh.com):",
    );
    lines.push("");
    for (const p of ctx.townPages.slice(0, 3)) {
      const snippet = p.text.replace(/\s+/g, " ").trim().slice(0, 700);
      lines.push(`[${p.slug}] ${snippet}${p.text.length > 700 ? "…" : ""}`);
      lines.push("");
    }
  }

  // 2) Meeting matches if relevant
  const qLow = q.toLowerCase();
  const meetingHits = ctx.meetings.filter(
    (m) =>
      qLow.includes(m.committee.toLowerCase()) ||
      m.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && qLow.includes(w)),
  );
  if (meetingHits.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Related upcoming meetings:");
    for (const m of meetingHits.slice(0, 4)) {
      const when = m.when.toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      lines.push(`- ${m.committee} — ${m.title} — ${when}`);
    }
  }

  if (lines.length === 0) {
    lines.push(
      `I don't have a specific answer for "${q}" yet. Try browsing the daily brief or the agenda list.`,
    );
  }
  return lines.join("\n");
}

async function callLlm(q: string, ctx: AskContext): Promise<string> {
  const apiKey = process.env.NOUS_API_KEY;
  const apiUrl = process.env.NOUS_API_URL ?? "https://inference-api.nousresearch.com/v1/chat/completions";
  const model = process.env.NOUS_MODEL ?? "Hermes-4-405B";
  const isGeneral = isGeneralTownQuestion(q);
  const systemLines = [
    "You are the Pembroke NH town bot — a helpful assistant for Pembroke, NH residents.",
    `The user asked: "${q}".`,
    "Answer using ONLY the context below. Sources are:",
    "  - Town-info pages scraped from pembroke-nh.com (general how-to / hours / fees / services)",
    "  - Upcoming town-board meetings (next 90 days)",
    "  - OCR'd agenda + minutes summaries (most recent postings)",
    "",
    `The user's question is about: ${isGeneral ? "general town services (prioritize town-info pages)" : "town meetings or decisions (prioritize meeting / agenda context)"}.`,
    "Be brief, conversational, and specific. Cite the source where appropriate (e.g., 'pembroke-nh.com/library').",
    "If you don't know, say so — don't invent hours, phone numbers, fees, or dates.",
    "Format: short prose, optionally a bulleted list of 1-5 items.",
  ];

  const userParts: string[] = [];
  if (ctx.townPages.length > 0) {
    userParts.push("Town-info pages (excerpted from pembroke-nh.com):");
    for (const p of ctx.townPages) {
      userParts.push(`\n[${p.slug}]\n${p.text}\n`);
    }
  }
  if (ctx.meetings.length > 0) {
    userParts.push("\nUpcoming meetings (next 90 days):");
    for (const m of ctx.meetings) {
      const when = m.when.toISOString();
      userParts.push(`- ${when}  ${m.committee} — ${m.title}`);
    }
  }
  if (ctx.summaries.length > 0) {
    userParts.push("\nRecent agenda + minutes summaries:");
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
        { role: "system", content: systemLines.join(" ") },
        { role: "user", content: userParts.join("\n") || "(no context available)" },
      ],
      max_tokens: 500,
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

  const ctx = await buildContext(q);
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
    town_pages_in_context: ctx.townPages.map((p) => p.slug),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    llm_configured: Boolean(process.env.NOUS_API_KEY),
    town_info_loaded: Boolean(loadTownInfo()),
  });
}