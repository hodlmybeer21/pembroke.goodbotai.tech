// lib/digest.ts — Weekly digest builder for the "Your week in Pembroke" email.
//
// Composes a structured digest from the same data the home page brief
// uses (calendar + archive), filtered by the user's persona and
// selected categories. The result is rendered as HTML email and
// plain-text Telegram.
//
// Sections in order:
//  1. Snow emergency (if active — surfaced prominently at the top)
//  2. This week's meetings (filtered by user categories)
//  3. New agenda docs since last digest (filtered)
//  4. Personal "what's new for you" line based on persona
//
// "Filtered" means: only show items whose impact tag or committee
// matches the user's selected categories. This keeps the digest
// focused on what they care about instead of dumping the full
// 7-day brief.

import { loadCalendarEvents, dedupeByDateTitle, filterHorizon } from "./town-data";
import { fetchAgendaCenter, loadOcrExport } from "./agenda-center";
import { buildBrief, type BriefItem } from "./brief";
import { findPersona, type Persona } from "./categories";
import { loadArchive } from "./archive";
import { getActiveSnowNotice } from "./snow";
import { tag, type ImpactTag } from "./impact";

export interface DigestItem {
  committee: string;
  title: string;
  when: Date;
  url?: string;
  docType?: "Agenda" | "Minutes";
  tags: Set<ImpactTag>;
  // Match score: how strongly this item matches the user's persona.
  // Used to rank the "what's new for you" section.
  score: number;
}

export interface Digest {
  generatedAt: Date;
  weekStart: Date;
  weekEnd: Date;
  // Persona context — if the user has a persona, surface it.
  persona: Persona | null;
  // Section 1: snow emergency (if active)
  snow: Awaited<ReturnType<typeof getActiveSnowNotice>> | null;
  // Section 2: this week's meetings, filtered + sorted
  thisWeek: DigestItem[];
  // Section 3: new agenda docs since last digest, filtered + sorted
  newDocs: DigestItem[];
  // Section 4: "what's new for you" — top 3 items ranked by persona match
  forYou: DigestItem[];
}

export interface DigestInputs {
  userCategories: string[];
  personaId: string | null;
  // Optional: the "since" timestamp for new docs. First run uses
  // 7 days ago; subsequent runs use the last successful send.
  sinceDocsIso?: string | null;
}

function matchScore(
  item: BriefItem,
  userCategories: string[],
  persona: Persona | null,
): number {
  // Higher = more relevant to the user.
  let score = 0;
  // Tag-based scoring
  for (const t of item.tags) {
    if (persona?.primaryTags?.includes(t)) {
      // Persona primary tags get more weight
      const idx = persona.primaryTags.indexOf(t);
      score += Math.max(0, 5 - idx);
    } else {
      score += 1;
    }
  }
  // Committee-based bonus — if the committee appears in the user's
  // category bundle (e.g. parent category watches schools).
  return score;
}

function buildDigestItem(item: BriefItem, score: number): DigestItem {
  return {
    committee: item.committee,
    title: item.title,
    when: item.when,
    url: item.url,
    docType: item.docType,
    tags: item.tags,
    score,
  };
}

export async function buildDigest(inputs: DigestInputs): Promise<Digest> {
  const persona = inputs.personaId ? findPersona(inputs.personaId) : null;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000);
  // For "new docs since", use the provided timestamp or default to
  // 7 days back (so the first run catches the past week).
  const sinceDocs = inputs.sinceDocsIso
    ? new Date(inputs.sinceDocsIso)
    : new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // Pull the same data the home page uses.
  const [events, docs] = await Promise.all([
    Promise.resolve(loadCalendarEvents()),
    fetchAgendaCenter().catch(() => []),
  ]);
  const deduped = dedupeByDateTitle(
    filterHorizon(events, now, new Date(now.getTime() + 14 * 24 * 3600 * 1000)),
  );
  const brief = buildBrief(deduped, docs, { now });

  // Filter items by the user's selected categories. A category
  // matches if any of the category's impact tags is in the item's
  // tag set, OR if the committee name contains a category-related
  // term (e.g. "parent" matches "school").
  const catMatch = (item: BriefItem): boolean => {
    if (inputs.userCategories.length === 0) return false;
    for (const cat of inputs.userCategories) {
      // School-related categories
      if (
        (cat === "parent" || cat === "voter") &&
        /school|recreation|playground|library|youth/i.test(item.committee)
      ) {
        return true;
      }
      if (cat === "homeowner" && /select|planning|zoning|budget|cip/i.test(item.committee)) {
        return true;
      }
      if (cat === "commuter" && /road|bridge|highway|dpw|traffic/i.test(item.committee)) {
        return true;
      }
      if (cat === "senior" && /senior|recreation|community/i.test(item.committee)) {
        return true;
      }
      if (cat === "renter" && /select|budget|water|sewer/i.test(item.committee)) {
        return true;
      }
      if (cat === "business" && /select|planning|road|zoning/i.test(item.committee)) {
        return true;
      }
    }
    return false;
  };

  // This week: meetings in [now, now+7d] matching the user's
  // categories, sorted by persona match score.
  const thisWeekRaw = brief.thisWeek.filter(catMatch);
  const thisWeek: DigestItem[] = thisWeekRaw
    .map((i) => buildDigestItem(i, matchScore(i, inputs.userCategories, persona)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // New docs since the last digest. We filter the archive entries
  // directly (not from buildBrief.newDocs) because the brief caps
  // at 12 most recent, but the digest may want a wider window.
  const archive = loadArchive();
  const newDocsRaw: DigestItem[] = [];
  if (archive) {
    for (const m of archive.months) {
      for (const e of m.entries) {
        const firstArchived = new Date(e.first_archived ?? 0);
        if (Number.isNaN(firstArchived.getTime())) continue;
        if (firstArchived < sinceDocs) continue;
        if (firstArchived > now) continue;
        const tags = tag(e.title, e.committee);
        const item: BriefItem = {
          kind: "doc",
          committee: e.committee,
          title: e.title,
          when: new Date(e.meeting_date),
          tags,
          url: e.url,
          docType: e.doc_type as "Agenda" | "Minutes",
        };
        if (!catMatch(item)) continue;
        const score = matchScore(item, inputs.userCategories, persona);
        newDocsRaw.push(buildDigestItem(item, score));
      }
    }
  }
  // Sort by date desc, then by score
  newDocsRaw.sort((a, b) => {
    const dt = b.when.getTime() - a.when.getTime();
    if (dt !== 0) return dt;
    return b.score - a.score;
  });
  const newDocs = newDocsRaw.slice(0, 8);

  // "What's new for you" — top 3 items by persona match score
  // (combines thisWeek and newDocs, deduplicated by URL/title).
  const seen = new Set<string>();
  const combined: DigestItem[] = [];
  for (const item of [...newDocsRaw, ...thisWeekRaw.map((i) =>
    buildDigestItem(i, matchScore(i, inputs.userCategories, persona)),
  )]) {
    const key = `${item.title}|${item.committee}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }
  combined.sort((a, b) => b.score - a.score);
  const forYou = combined.slice(0, 3);

  // Snow emergency (if active) — top of the digest if there is one.
  const snow = await getActiveSnowNotice().catch(() => null);

  return {
    generatedAt: now,
    weekStart,
    weekEnd,
    persona,
    snow,
    thisWeek,
    newDocs,
    forYou,
  };
}

// Format helpers used by the email + Telegram templates.
export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtTimeShort(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function startOfWeek(d: Date): Date {
  // Sunday-start week. We want the digest to cover the upcoming
  // Sunday → Saturday, so weekStart is the next Sunday after now.
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay(); // 0 = Sunday
  if (day !== 0) {
    out.setDate(out.getDate() + (7 - day));
  }
  return out;
}
