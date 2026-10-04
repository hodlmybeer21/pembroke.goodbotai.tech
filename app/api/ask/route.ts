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
import { loadArchive, selectArchiveEntries, isPastMeetingQuestion, type ArchiveEntry } from "@/lib/archive";
import { loadTrashRoutes, searchStreets, curbsideReminder } from "@/lib/trash";

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
  archiveEntries: ArchiveEntry[];
  trashRoutes: ReturnType<typeof loadTrashRoutes>;
  trashHits: ReturnType<typeof searchStreets>;
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
  /our new website is here/i,    // Pembroke site-wide banner on every page
  /^mission statement/i,         // sub-heading on every department page
  /^staff contacts/i,            // contact section header
  /^\d+ [a-z\s]+ street/i,      // street address lines
  /phone:?\s*\d/i,              // phone number lines
  /^email us:/i,                // library catalog UI text
  /refine search/i,             // library catalog UI text
  /my library account/i,         // library catalog UI text
  /advanced search/i,            // library catalog UI text
  /account info/i,
  /items out/i,
  /reserves \/ requests/i,
  /bookmarks/i,
  /password change/i,
  /more search options/i,
  /series search/i,
  /subject search/i,
  /field keywords/i,
  /accelerated reader/i,
  /lexile/i,
  /attraction pass/i,
  /^\d+\s*—\s*[a-z]/i,           // catalog classification lines
  /^[a-z\s]+ - [a-z\s]+ - [a-z\s]+ - /i,
];

function isBoilerplate(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 20) return true;  // too short, probably a label
  for (const p of BOILERPLATE_PATTERNS) {
    if (p.test(trimmed)) return true;
  }
  // Drop sentences that are mostly numbers / data table rows. e.g.
  // "JANUARY 176.11 53.48 23.29% $154.32 ($1,946.14)".
  const digits = (trimmed.match(/\d/g) ?? []).length;
  if (digits > trimmed.length * 0.2) return true;
  // Drop sentences that are mostly uppercase abbreviations (table headers).
  const upper = (trimmed.match(/[A-Z]{2,}/g) ?? []).join("").length;
  if (upper > trimmed.length * 0.4 && trimmed.length < 80) return true;
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
function extractAnswer(pageText: string, question: string, maxSentences = 2, maxChars = 500): string {
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

  let out = top.map((s) => s.sentence).join(" ");
  if (out.length > maxChars) {
    out = out.slice(0, maxChars - 1).trimEnd() + "…";
  }
  return out;
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
  const [events, docs, townInfo, archive] = await Promise.all([
    fetchAllFeeds().catch(() => []),
    fetchAgendaCenter().catch(() => []),
    Promise.resolve(loadTownInfo()),
    Promise.resolve(loadArchive()),
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
  const archiveEntries = archive ? selectArchiveEntries(q, archive) : [];
  // Trash lookup. Only run if the question is plausibly about trash
  // pickup day — keeps the no-op path fast.
  const trashRoutes = loadTrashRoutes();
  const trashHits = /trash|rubbish|garbage|pickup|recycl/i.test(q) && trashRoutes
    ? searchStreets(q, trashRoutes, 3)
    : [];
  return { meetings, summaries, townPages, archiveEntries, trashRoutes, trashHits };
}

function stubAnswer(q: string, ctx: AskContext): string {
  const lines: string[] = [];

  // If the question names a committee directly, lead with the meeting
  // schedule for that committee (not a town-info page about something
  // unrelated). The user wants the next meeting, not a department page.
  // Match committee names from BOTH the iCal meetings list and the
  // archive — the archive covers past committees that may not be on
  // the upcoming calendar.
  const archiveCommittees = Array.from(
    new Set(ctx.archiveEntries.map((e) => e.committee)),
  );
  const namedCommittee = findNamedCommittee(q, ctx.meetings, archiveCommittees);

  // If the question is about a past meeting (what happened, last meeting,
  // etc.) and we have archive entries, lead with them. Also trigger when
  // a committee is named in the question but we have no upcoming meeting
  // for it — the user is likely asking about historical action.
  const committeeButNoUpcoming =
    namedCommittee !== null &&
    ctx.meetings.filter((m) => m.committee === namedCommittee).length === 0 &&
    ctx.archiveEntries.some((e) => e.committee === namedCommittee);
  const showArchive =
    ctx.archiveEntries.length > 0 &&
    (isPastMeetingQuestion(q) ||
      (ctx.townPages.length === 0 && !namedCommittee) ||
      committeeButNoUpcoming);

  // Trash lookup: if the question is about a specific street's trash
  // day and we found a match, lead with the day. This is the highest
  // signal answer the user can get — they're asking "when does my
  // street get picked up".
  const showTrash =
    ctx.trashHits.length > 0 &&
    /trash|rubbish|garbage|pickup|recycl|when.*(does|is|do)/i.test(q) &&
    !namedCommittee &&
    !showArchive;

  if (showTrash) {
    const hits = ctx.trashHits.slice(0, 3);
    lines.push(
      hits.length === 1
        ? `**${hits[0].street}** — pickup is on **${hits[0].day}**.`
        : `Closest matches in the town's route list:`,
    );
    if (hits.length > 1) {
      for (const h of hits) {
        lines.push(`- **${h.street}** — ${h.day}`);
      }
    }
    lines.push("");
    lines.push(curbsideReminder(hits[0].day));
    lines.push("");
    lines.push("Search the full route list at pembroke.goodbotai.tech/trash.");
  } else if (showArchive) {
    lines.push("Recent from the meeting archive:");
    for (const e of ctx.archiveEntries.slice(0, 4)) {
      lines.push("");
      lines.push(`**${e.committee} — ${e.meeting_date}** (${e.doc_type})`);
      // Trim summary to a single line if it has separators.
      const summary = e.summary.length > 400
        ? e.summary.slice(0, 399).trimEnd() + "…"
        : e.summary;
      lines.push(summary);
      lines.push(`Read the full ${e.doc_type.toLowerCase()}: ${e.url}`);
    }
  } else if (namedCommittee) {
    const matches = ctx.meetings.filter((m) => m.committee === namedCommittee).slice(0, 3);
    if (matches.length > 0) {
      lines.push(`Upcoming ${namedCommittee} meeting${matches.length > 1 ? "s" : ""}:`);
      for (const m of matches) {
        const when = m.when.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        lines.push(`- ${when} — ${m.title}`);
      }
    }
  } else if (ctx.townPages.length > 0) {
    // Otherwise, lead with the answer from the most-relevant town-info page.
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
      const url = top.url ?? PAGE_URL[top.slug];
      if (url) {
        lines.push(`See ${url} for the most up-to-date info.`);
      }
    }
  }

  // Also surface topically-related meetings (only if we didn't already lead
  // with meetings). For example, a "vote" question gets a town-info page
  // AND a "next Select Board meeting" line.
  if (!namedCommittee && !showArchive) {
    const relevantCommittees = topicCommittees(q);
    let meetingHits: Meeting[] = [];
    if (relevantCommittees.length > 0) {
      meetingHits = ctx.meetings
        .filter((m) => relevantCommittees.some((c) => m.committee === c))
        .slice(0, 3);
    } else if (ctx.townPages.length === 0) {
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
  }

  if (lines.length === 0) {
    lines.push(
      `I don't have a specific answer for that yet. Try browsing the daily brief or the agenda list.`,
    );
  }
  return lines.join("\n");
}

/**
 * If the question names a specific committee (e.g. "When is the next
 * Select Board meeting?"), return the canonical committee name. Returns
 * null if no committee is named.
 */
function findNamedCommittee(
  q: string,
  meetings: Meeting[],
  archiveCommittees: string[] = [],
): string | null {
  const qLow = q.toLowerCase();
  // Match the question against each known committee's lowercase name. Pick
  // the longest match to avoid "Board" matching "Planning Board" before
  // "Board" has a chance to be tested. Pull from both the iCal meetings
  // list (upcoming only) and the archive (historical), so a question like
  // "When did the Cemetery Commission last raise burial fees" still
  // resolves to a known committee even if there's no upcoming meeting.
  const known = new Set([
    ...meetings.map((m) => m.committee),
    ...archiveCommittees,
  ]);
  let best: { name: string; len: number } | null = null;
  for (const name of known) {
    const low = name.toLowerCase();
    if (qLow.includes(low) && (!best || low.length > best.len)) {
      best = { name, len: low.length };
    }
  }
  return best?.name ?? null;
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
  if (ctx.archiveEntries.length > 0) {
    userParts.push("\nPast meeting summaries from the archive (most recent first):");
    for (const e of ctx.archiveEntries) {
      userParts.push(`\n[${e.committee} ${e.doc_type}, ${e.meeting_date}]\n${e.summary}\n`);
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
    archive_entries_in_context: ctx.archiveEntries.length,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    llm_configured: Boolean(process.env.NOUS_API_KEY),
    town_info_loaded: Boolean(loadTownInfo()),
  });
}