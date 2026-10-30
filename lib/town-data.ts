import "server-only";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Loader for the town's own published material: the archive index (630
// documents with OCR summaries) and the upcoming calendar.
//
// Both are committed JSON files rather than live fetches. The live
// Agenda Center landing page only exposes 13 documents - one stale row
// per committee - so the archive index is a far better source for the
// agendas page. The calendar is scraped by
// ~/.hermes/scripts/pembroke_calendar_scrape.py because the town's iCal
// endpoints are dead.

export interface ArchiveDoc {
  guid: string;
  committee: string;
  doc_type: "Agenda" | "Minutes" | string;
  meeting_date: string;
  title: string;
  url: string;
  summary: string;
}

export interface ArchiveMonth {
  month: string;
  label: string;
  count: number;
  entries: ArchiveDoc[];
}

export interface ArchiveIndex {
  generated_at: string;
  count: number;
  committees: string[];
  months: ArchiveMonth[];
}

export interface CalendarEvent {
  date: string;
  time: string;
  all_day: boolean;
  title: string;
  eid: string | null;
  url: string;
  is_meeting: boolean;
  last_meeting: string | null;
  last_minutes_url: string | null;
}

export interface CalendarFile {
  generated_at: string;
  source: string;
  today: string;
  counts: { events: number; meetings: number; other: number; errors: number };
  meetings: CalendarEvent[];
  other: CalendarEvent[];
}

export interface UpcomingMeeting {
  committee: string;
  title: string;
  when: Date;
  time: string;
  url: string;
  last_meeting: string | null;
}

/**
 * Map a calendar title onto the name the archive uses for that body.
 * The town calls its calendar "Select Board Meetings" and its agenda
 * center "Board of Selectmen".
 */
const CALENDAR_TO_ARCHIVE: Array<[RegExp, string]> = [
  [/select board/i, "Board of Selectmen"],
  [/planning board workshop/i, "Planning Board Workshop"],
  [/planning board public hearing/i, "Planning Board Public Hearing"],
  [/planning board/i, "Planning Board"],
  [/budget committee/i, "Budget Committee"],
  [/capital improvement/i, "Capital Improvement Program"],
  [/roads committee/i, "Roads Committee"],
  [/range roads/i, "Range Roads Subcommittee"],
  [/water works/i, "Water Works"],
  [/sewer/i, "Sewer Commission"],
  [/recreation/i, "Recreation Commission"],
  [/conservation/i, "Conservation Commission"],
  [/energy committee/i, "Energy Committee"],
  [/economic development/i, "Economic Development Committee"],
  [/joint loss/i, "Joint Loss Management Committee"],
  [/cemetery/i, "Cemetery Commission"],
  [/solid waste/i, "Solid Waste Advisory Committee"],
  [/trust funds/i, "Trustees of Trust Funds"],
  [/zoning/i, "Zoning Board"],
  [/meet me in suncook/i, "Meet Me In Suncook"],
];

export function committeeLabel(title: string): string {
  for (const [re, name] of CALENDAR_TO_ARCHIVE) {
    if (re.test(title)) return name;
  }
  return normalizeCommittee(
    title.replace(/\s*meetings?\s*$/i, "").trim()
  );
}

/**
 * Upcoming meetings from the town's published calendar, in the shape the
 * ask route wants.
 */
export function loadUpcomingMeetings(limit = 12): UpcomingMeeting[] {
  const cal = loadCalendar();
  if (!cal) return [];
  return cal.meetings.slice(0, limit).map((e) => ({
    committee: committeeLabel(e.title),
    title: e.title,
    when: new Date(e.date + "T12:00:00"),
    time: e.time,
    url: e.url,
    last_meeting: e.last_meeting,
  }));
}

/**
 * Every event on the town's calendar, in the shape lib/ical.ts used to
 * return. The iCal endpoints are dead, so this is the replacement that
 * keeps lib/brief.ts, lib/snow.ts, lib/digest.ts and the pages working
 * without rewriting their logic.
 */
export interface LegacyCalendarEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  location: string;
  committee: string;
  isHoliday: boolean;
}

const HOLIDAY_KEYWORDS = [
  "holiday", "office closed", "closed", "columbus", "indigenous peoples",
  "veterans day", "thanksgiving", "christmas", "new year", "memorial day",
  "independence day", "labor day", "presidents day",
  "martin luther king", "juneteenth",
];

export function loadCalendarEvents(): LegacyCalendarEvent[] {
  const cal = loadCalendar();
  if (!cal) return [];
  const out: LegacyCalendarEvent[] = [];
  for (const e of [...cal.meetings, ...cal.other]) {
    const start = new Date(e.date + "T12:00:00");
    if (isNaN(start.getTime())) continue;
    const low = e.title.toLowerCase();
    out.push({
      uid: `${e.eid ?? e.date}-${e.title}`,
      summary: e.title,
      start,
      end: start,
      location: "",
      committee: committeeLabel(e.title),
      isHoliday:
        !e.is_meeting ||
        HOLIDAY_KEYWORDS.some((k) => low.includes(k)),
    });
  }
  return out;
}

export function filterHorizon(
  events: LegacyCalendarEvent[],
  start: Date,
  end: Date,
): LegacyCalendarEvent[] {
  return events
    .filter((e) => e.start >= start && e.start < end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function dedupeByDateTitle(
  events: LegacyCalendarEvent[],
): LegacyCalendarEvent[] {
  // The same event can appear under more than one committee. Event
  // identity is the date plus the title, not the committee that listed
  // it.
  const byKey = new Map<string, LegacyCalendarEvent>();
  for (const e of events) {
    const dayKey = e.start.toISOString().slice(0, 10);
    const key = `${dayKey}|${e.summary}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, e);
      continue;
    }
    if (existing.committee !== "Main Calendar" && e.committee === "Main Calendar") {
      byKey.set(key, e);
    }
  }
  return Array.from(byKey.values());
}

export interface MeetingPattern {
  committee: string;
  meetings: number;
  /** Median days between meetings, rounded. */
  gap: number;
  /** Human phrase, e.g. "every 2 weeks". */
  cadence: string;
  /** The weekday most of that body's meetings fall on. */
  weekday: string | null;
  last_met: string | null;
}

let archiveCache: ArchiveIndex | null = null;
let calendarCache: CalendarFile | null = null;
let patternsCache: MeetingPattern[] | null = null;

function readJson<T>(file: string): T | null {
  try {
    const path = join(process.cwd(), "data", file);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Every document the site knows about, newest first. */
/**
 * How residents actually refer to the town's bodies, mapped to the
 * name the town publishes under.
 *
 * The exact-name matcher alone was not enough: "Select Board" is how
 * people say it, but the town's documents say "Board of Selectmen"
 * (114 docs) with a single agenda calling it "Select Board" (1 doc).
 * That mismatch made the bot say "no upcoming Select Board meeting is
 * on the calendar" while the calendar held three of them.
 *
 * Only the aliases people actually use are listed, and an alias is
 * only honored when its canonical name is one the town really has.
 */
const COMMITTEE_ALIASES: Array<[RegExp, string]> = [
  [/\bselect\s*board\b/i, "Board of Selectmen"],
  [/\bboard\s*of\s*selectmen\b/i, "Board of Selectmen"],
  [/\bbos\b/i, "Board of Selectmen"],
  [/\bplanning\s*board\s*workshop\b/i, "Planning Board Workshop"],
  [/\bplanning\s*board\s*public\s*hearing\b/i, "Planning Board Public Hearing"],
  [/\bplanning\s*board\b/i, "Planning Board"],
  [/\bzoning\s*board\s*of\s+adjustment\b/i, "Zoning Board"],
  [/\bzoning\s*board\b/i, "Zoning Board"],
  [/\bbudget\s+committee\b/i, "Budget Committee"],
  [/\bcapital\s+improvement\b|\bcip\b/i, "Capital Improvement Program"],
  [/\broads\s+committee\b/i, "Roads Committee"],
  [/\bwater\s+works\b/i, "Water Works"],
  [/\bsewer\s+commission\b/i, "Sewer Commission"],
  [/\brecreation\s+commission\b/i, "Recreation Commission"],
  [/\bconservation\s+commission\b/i, "Conservation Commission"],
  [/\benergy\s+committee\b/i, "Energy Committee"],
  [/\beconomic\s+development\b/i, "Economic Development Committee"],
  [/\bjoint\s+loss\b/i, "Joint Loss Management Committee"],
  [/\bcemetery\s+commission\b/i, "Cemetery Commission"],
  [/\bsolid\s+waste\b/i, "Solid Waste Advisory Committee"],
  [/\btrust\s+funds\b/i, "Trustees of Trust Funds"],
  [/\brange\s+roads\b/i, "Range Roads Subcommittee"],
];

/**
 * Property market analytics: the tax rate, the typical tax bill, and
 * the sale-to-assessment trend. Used by /ask so the bot can answer
 * "what's my tax rate" with the same number the /property-values page
 * shows.
 */
export interface PropertyTrends {
  generated_at: string;
  tax_rate: number;
  tax_rate_history: Record<string, number>;
  tax_rate_source?: string;
  tax_breakdown?: Array<{ label: string; rate: number; pct: number }>;
  parcel_count: number;
  tax_bill: {
    median: number | null;
    p10: number | null;
    p90: number | null;
    on_300k: number | null;
    on_450k: number | null;
  };
  years?: Array<Record<string, number>>;
}

let trendsCache: PropertyTrends | null = null;

export function loadPropertyTrends(): PropertyTrends | null {
  if (trendsCache) return trendsCache;
  try {
    const p = join(process.cwd(), "data", "property-trends.json");
    if (!existsSync(p)) return null;
    trendsCache = JSON.parse(readFileSync(p, "utf-8")) as PropertyTrends;
    return trendsCache;
  } catch {
    return null;
  }
}

/**
 * Resolve a committee mentioned in a question to the canonical name.
 * Aliases win over exact matches because the exact-match path can only
 * ever find the literal string the town uses.
 */
export function resolveCommitteeMention(
  qLow: string,
  known: string[],
): string | null {
  const knownLow = new Set(known.map((k) => (k ?? "").toLowerCase()));
  for (const [re, canonical] of COMMITTEE_ALIASES) {
    if (re.test(qLow) && knownLow.has(canonical.toLowerCase())) {
      return canonical;
    }
  }
  // Fall back to the longest literal match.
  let best: { name: string; len: number } | null = null;
  for (const name of known) {
    const low = (name ?? "").toLowerCase();
    if (low && qLow.includes(low) && (!best || low.length > best.len)) {
      best = { name, len: low.length };
    }
  }
  return best?.name ?? null;
}

/**
 * Canonical committee names.
 *
 * The town publishes a body under several names across its own
 * documents ("Select Board" on one agenda, "Board of Selectmen" on
 * 114 others). Downstream pages — /decisions, /agendas, /ask — all key
 * off the committee string, so a mismatch makes a body look like two
 * different bodies. Everything is normalized to the name the town uses
 * most often.
 */
export function normalizeCommittee(name: string): string {
  const n = (name ?? "").trim();
  const low = n.toLowerCase();
  if (low === "select board") return "Board of Selectmen";
  if (low.startsWith("zoning board of adjustment")) return "Zoning Board";
  if (low.startsWith("planning board public hearing"))
    return "Planning Board Public Hearing";
  return n;
}

export function loadArchiveIndex(): ArchiveIndex | null {
  if (archiveCache) return archiveCache;
  archiveCache = readJson<ArchiveIndex>("archive-index.json");
  return archiveCache;
}

export function loadCalendar(): CalendarFile | null {
  if (calendarCache) return calendarCache;
  calendarCache = readJson<CalendarFile>("calendar.json");
  return calendarCache;
}

/**
 * How often each body actually meets, from the archive.
 *
 * The town's forward calendar only publishes the Select Board and the
 * Planning Board - the other bodies meet but have not posted future
 * dates. This fills that gap from the record: how often they met, on
 * what weekday, and when they last met. It is derived from the minutes,
 * so it is labelled as a pattern rather than as a published schedule.
 */
export function loadMeetingPatterns(): MeetingPattern[] {
  if (patternsCache) return patternsCache;
  const index = loadArchiveIndex();
  if (!index) return [];

  const byCommittee = new Map<string, Date[]>();
  for (const month of index.months) {
    for (const e of month.entries) {
      if (e.doc_type !== "Minutes") continue;
      const d = new Date(e.meeting_date + "T12:00:00");
      if (isNaN(d.getTime())) continue;
      const list = byCommittee.get(e.committee) ?? [];
      list.push(d);
      byCommittee.set(e.committee, list);
    }
  }

  const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
               "Friday", "Saturday"];
  const out: MeetingPattern[] = [];
  for (const [committee, list] of byCommittee) {
    const ds = [...new Set(list)].sort((a, b) => a.getTime() - b.getTime());
    if (ds.length < 4) continue;
    const gaps: number[] = [];
    for (let i = 1; i < ds.length; i++) {
      gaps.push(Math.round((ds[i].getTime() - ds[i - 1].getTime()) / 86400000));
    }
    gaps.sort((a, b) => a - b);
    const gap = gaps[Math.floor(gaps.length / 2)];
    const dow = new Map<string, number>();
    for (const d of ds) {
      const k = DAY[d.getDay()];
      dow.set(k, (dow.get(k) ?? 0) + 1);
    }
    const [weekday, hits] = [...dow.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({
      committee,
      meetings: ds.length,
      gap,
      cadence:
        gap <= 8 ? "every week"
        : gap <= 16 ? "every 2 weeks"
        : gap <= 22 ? "every 3 weeks"
        : gap <= 29 ? "every 4 weeks"
        : gap <= 36 ? "every 5 weeks"
        : `about every ${gap} days`,
      // Only claim a weekday if the body actually keeps to it.
      weekday: hits / ds.length >= 0.6 ? weekday : null,
      last_met: ds[ds.length - 1].toISOString().slice(0, 10),
    });
  }
  out.sort((a, b) => b.meetings - a.meetings);
  patternsCache = out;
  return out;
}
