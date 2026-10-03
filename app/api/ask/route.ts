// app/api/ask/route.ts — Ask-the-bot endpoint.
//
// Routes to a real LLM (Nous Research inference API) if NOUS_API_KEY is set;
// otherwise returns a deterministic stub that pulls answerable sentences
// out of the relevant town-info pages and only surfaces meetings that are
// topically related to the question.
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
  townPages: { slug: string; text: string; url?: string }[];
}

const PAGE_URL: Record<string, string> = {
  library: "https://www.pembroke-nh.com/1236/Library",
  library_catalog: "https://www.pembroke-nh.com/1238/Library-Catalog",
  library_trustees: "https://www.pembroke-nh.com/1239/Library-Trustees",
  public_works: "https://www.pembroke-nh.com/1277/Public-Works",
  recycling: "https://www.pembroke-nh.com/1291/Recycling",
  planning_building: "https://www.pembroke-nh.com/1242/Planning-and-Building-Department",
  fire_department: "https://www.pembroke-nh.com/1207/Fire-Department",
  police_department: "https://www.pembroke-nh.com/1251/Police-Department",
  town_info: "https://www.pembroke-nh.com/1470/Pembroke-Town-Information",
  vital_records: "https://www.pembroke-nh.com/1334/Vital-Records",
  voter_registration: "https://www.pembroke-nh.com/1335/Voter-Registration",
  assessing: "https://www.pembroke-nh.com/1193/Assessing-Department",
  cemetery: "https://www.pembroke-nh.com/1306/Cemetery",
  mercury_disposal: "https://www.pembroke-nh.com/1281/Disposing-of-Mercury",
  transfer_station_facility: "https://www.pembroke-nh.com/1299/Solid-Waste-Transfer-Facility",
  solid_waste_collection: "https://www.pembroke-nh.com/1298/Solid-Waste-Collection",
  spring_cleanup: "https://www.pembroke-nh.com/1300/Spring-Cleanup",
  winter_parking_snow: "https://www.pembroke-nh.com/1303/Winter-Parking-and-Snow-Emergency-Info",
  construction_demolition: "https://www.pembroke-nh.com/1280/Construction-and-Demolition-Debris",
  recycling_textiles: "https://www.pembroke-nh.com/1292/Recycling-Textiles",
  medical_waste: "https://www.pembroke-nh.com/1288/Medical-Waste-Disposal",
  facility_permit: "https://www.pembroke-nh.com/1284/Facility-Permit",
  roads_committee: "https://www.pembroke-nh.com/1415/Roads-Committee",
  roadwork_crews: "https://www.pembroke-nh.com/1294/Roadwork-Crews",
};

// Map question topic → committee names that are likely relevant.
// A "vote" question is relevant to Select Board (elections) and Budget
// Committee (town meeting). A "library" question is relevant to Library
// Trustees. A "recycling" question is relevant to Solid Waste Advisory
// Committee. Etc.
const TOPIC_COMMITTEES: Array<[RegExp, string[]]> = [
  [/vot|elect|ballot|absentee|polling|town.clerk/, ["Select Board", "Budget Committee"]],
  [/library|book|read/, ["Library Trustees"]],
  [/recycl|trash|rubbish|garbage|pickup|transfer.*station|curbside|compost|paint|mercury|hazard/, ["Solid Waste Advisory Committee", "Roads Committee"]],
  [/snow|plow|ice|winter|parking/, ["Roads Committee", "Select Board"]],
  [/fire|burn|smoke/, ["Select Board"]],
  [/police|crime|emergency|911/, ["Select Board"]],
  [/zoning|build.*permit|setback|easement|subdivision/, ["Planning Board", "Zoning Board"]],
  [/tax|assess|prop.*valu|abatement/, ["Select Board", "Budget Committee"]],
  [/cemetery|burial|grave/, ["Cemetery Commission"]],
  [/road|bridge|culvert|pothole/, ["Roads Committee"]],
  [/budget|spending|town meeting|appropriation/, ["Budget Committee", "Select Board"]],
  [/water|sewer/, ["Water Works", "Sewer Commission"]],
  [/recreation|park|playground|field/, ["Recreation Commission"]],
  [/conservation|trail|wetland|forest/, ["Conservation Commission"]],
  [/plan|zoning/, ["Planning Board", "Planning Board Workshop"]],
];

// Common boilerplate phrases that show up in CivicEngage page nav and
// should never appear in a stub answer.
const BOILERPLATE_PATTERNS = [
  /skip to main content/i,
  /create a website account/i,
  /manage notification subscriptions/i,
  /website sign in/i,
  /agendas & minutes/i,
  /contact us/i,
  /sign up for e-alerts/i,
  /e-reg/i,
  /dog licenses/i,
  /forms & documents/i,
  /departments? government/i,
  /recorded meetings/i,
  /town code/i,
  /find it fast/i,
  /view map/i,
  /physical address/i,
  /view full/i,
  /^[a-z\s]+ - [a-z\s]+ - [a-z\s]+ - /i,  // sequences like "Foo - Bar - Baz -"
];

function isBoilerplate(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 20) return true;  // too short, probably a label
  for (const p of BOILERPLATE_PATTERNS) {
    if (p.test(trimmed)) return true;
  }
  return false;
}

/**
 * Pull the most answerable 1-3 sentences out of a page's text.
 *
 * Strategy:
 *   1. Split the page into sentences.
 *   2. Drop boilerplate (nav, contact, "skip to...").
 *   3. Score remaining sentences by how many question keywords they contain.
 *   4. Take the top 2-3 sentences, preserve original order.
 */
function extractAnswer(pageText: string, question: string, maxSentences = 3): string {
  const text = pageText.replace(/\s+/g, " ").trim();
  // Split on sentence terminators (.!?) followed by space + capital letter.
  // Keep things simple — we're summarizing civic-page prose.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);

  const qWords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const scored = sentences
    .map((s, i) => {
      if (isBoilerplate(s)) return null;
      const sLow = s.toLowerCase();
      let score = 0;
      for (const w of qWords) {
        if (sLow.includes(w)) score++;
      }
      // Prefer early sentences a little (they tend to be the lede).
      score += Math.max(0, 1 - i / 8) * 0.3;
      return { sentence: s.trim(), score, index: i };
    })
    .filter((x): x is { sentence: string; score: number; index: number } => x !== null);

  if (scored.length === 0) return "";

  // Take top N by score, then re-sort by original position to preserve flow.
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index);

  return top.map((s) => s.sentence).join(" ");
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can",
  "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
  "how", "its", "may", "new", "now", "old", "see", "way", "who", "did",
  "let", "say", "she", "too", "use", "what", "when", "why", "how", "can",
  "i", "me", "my", "we", "us", "to", "of", "in", "on", "at", "by", "is",
  "this", "that", "with", "from", "have", "had",
]);

/** Which committees are topically relevant to this question? */
function topicCommittees(q: string): string[] {
  const qLow = q.toLowerCase();
  const matched = new Set<string>();
  for (const [pat, names] of TOPIC_COMMITTEES) {
    if (pat.test(qLow)) {
      for (const n of names) matched.add(n);
    }
  }
  return [...matched];
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
  const townPages = townInfo
    ? selectRelevantPages(q, townInfo).map((p) => ({ ...p, url: PAGE_URL[p.slug] }))
    : [];
  return { meetings, summaries, townPages };
}

function stubAnswer(q: string, ctx: AskContext): string {
  // If the most-relevant town-info page has extractable content, lead with it.
  // Otherwise lead with the meeting list (for meeting-style questions).
  const lines: string[] = [];

  if (ctx.townPages.length > 0) {
    const top = ctx.townPages[0];
    const answer = extractAnswer(top.text, q);
    if (answer) {
      lines.push(answer);
      const url = top.url ?? PAGE_URL[top.slug];
      if (url) {
        lines.push("");
        lines.push(`Source: ${url}`);
      }
    } else {
      // Fallback: just point to the page.
      const url = top.url ?? PAGE_URL[top.slug];
      if (url) {
        lines.push(`See ${url} for the most up-to-date info.`);
      }
    }
  }

  // Only surface meetings that are topically related to the question.
  // If no specific topic matches, surface nothing (the town-info page is
  // a better answer than a list of unrelated meetings).
  const relevantCommittees = topicCommittees(q);
  let meetingHits: Meeting[] = [];
  if (relevantCommittees.length > 0) {
    meetingHits = ctx.meetings
      .filter((m) => relevantCommittees.some((c) => m.committee === c))
      .slice(0, 3);
  } else if (ctx.townPages.length === 0) {
    // No town-info, no topic. Fall back to the next 3 upcoming meetings.
    meetingHits = ctx.meetings.slice(0, 3);
  }
  if (meetingHits.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Next related meeting" + (meetingHits.length > 1 ? "s" : "") + ":");
    for (const m of meetingHits) {
      const when = m.when.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      lines.push(`- ${m.committee} — ${when}`);
    }
  }

  if (lines.length === 0) {
    lines.push(
      `I don't have a specific answer for that yet. Try browsing the daily brief or the agenda list.`,
    );
  }
  return lines.join("\n");
}

async function callLlm(q: string, ctx: AskContext): Promise<string> {
  const apiKey = process.env.NOUS_API_KEY;
  const apiUrl = process.env.NOUS_API_URL ?? "https://inference-api.nousresearch.com/v1/chat/completions";
  const model = process.env.NOUS_MODEL ?? "Hermes-4-405B";
  const systemLines = [
    "You are the Pembroke NH town bot — a helpful assistant for Pembroke, NH residents.",
    `The user asked: "${q}".`,
    "Answer using ONLY the context below. Sources are:",
    "  - Town-info pages scraped from pembroke-nh.com (general how-to / hours / fees / services)",
    "  - Upcoming town-board meetings (next 90 days)",
    "  - OCR'd agenda + minutes summaries (most recent postings)",
    "",
    "Be brief, conversational, and specific. Cite the source where appropriate (e.g., 'pembroke-nh.com/library').",
    "If you don't know, say so — don't invent hours, phone numbers, fees, or dates.",
    "Format: short prose, optionally a bulleted list of 1-5 items. No preamble, no 'Here is what...' — just the answer.",
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