// lib/ical.ts — Parse CivicEngage iCalendar feeds for town committees.

export interface CalendarEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  location: string;
  committee: string;
  isHoliday: boolean;
}

export interface ICalFeed {
  committee: string;
  catId: number;
}

// Mirror of the cron-pipeline feed list. Keep in sync.
export const FEEDS: ICalFeed[] = [
  { committee: "Select Board", catId: 24 },
  { committee: "Planning Board", catId: 25 },
  { committee: "Planning Board Workshop", catId: 26 },
  { committee: "CIP Committee", catId: 28 },
  { committee: "Roads Committee", catId: 29 },
  { committee: "Main Calendar", catId: 30 },
  { committee: "Budget Committee", catId: 36 },
];

const BASE_URL =
  "https://www.pembroke-nh.com/common/modules/iCalendar/iCalendar.aspx";

const HOLIDAY_KEYWORDS = [
  "columbus", "indigenous peoples", "veterans day", "thanksgiving",
  "christmas", "new year", "memorial day", "independence day",
  "labor day", "presidents day", "martin luther king", "juneteenth",
];

function unfoldIcs(text: string): string {
  // RFC 5545 line unfolding: continuation lines start with a single space or tab.
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(s: string): Date | null {
  const m = /(\d{8})T(\d{6})/.exec(s);
  if (!m) return null;
  const [, ymd, hms] = m;
  const y = Number(ymd.slice(0, 4));
  const mo = Number(ymd.slice(4, 6)) - 1;
  const d = Number(ymd.slice(6, 8));
  const h = Number(hms.slice(0, 2));
  const mi = Number(hms.slice(2, 4));
  const sec = Number(hms.slice(4, 6));
  // iCal timestamps are local time in the embedded VTIMEZONE block.
  // CivicEngage uses America/New_York for NH; treat as ET.
  const dt = new Date(y, mo, d, h, mi, sec);
  return isNaN(dt.getTime()) ? null : dt;
}

export function parseIcs(body: string, committee: string): CalendarEvent[] {
  const unfolded = unfoldIcs(body);
  const blocks = unfolded.split(/BEGIN:VEVENT/).slice(1);
  const out: CalendarEvent[] = [];
  for (const block of blocks) {
    const end = block.split(/END:VEVENT/)[0];
    const uid = /UID:(.+)/.exec(end)?.[1].trim() ?? "";
    const summary = /SUMMARY:(.+)/.exec(end)?.[1].trim() ?? "";
    const dtstart = /DTSTART[^:]*:(.+)/.exec(end)?.[1].trim();
    const dtend = /DTEND[^:]*:(.+)/.exec(end)?.[1].trim();
    const location = /LOCATION:(.+)/.exec(end)?.[1].trim() ?? "";
    if (!summary || !dtstart || !dtend) continue;
    const start = parseIcsDate(dtstart);
    const endDt = parseIcsDate(dtend);
    if (!start || !endDt) continue;
    const low = summary.toLowerCase();
    const isHoliday =
      low.includes("holiday") ||
      HOLIDAY_KEYWORDS.some((k) => low.includes(k)) ||
      (low.includes("closed") && low.includes("day"));
    out.push({
      uid,
      summary,
      start,
      end: endDt,
      location,
      committee,
      isHoliday,
    });
  }
  return out;
}

export async function fetchFeed(feed: ICalFeed, timeoutMs = 15000): Promise<CalendarEvent[]> {
  const url = `${BASE_URL}?catID=${feed.catId}&feed=calendar`;
  const res = await fetch(url, {
    headers: { "User-Agent": "pembroke-goodbotai-tech/0.1 (+pembroke.goodbotai.tech)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return [];
  const body = await res.text();
  return parseIcs(body, feed.committee);
}

export async function fetchAllFeeds(): Promise<CalendarEvent[]> {
  const results = await Promise.all(FEEDS.map((f) => fetchFeed(f)));
  return results.flat();
}

export function filterHorizon(
  events: CalendarEvent[],
  start: Date,
  end: Date,
): CalendarEvent[] {
  return events
    .filter((e) => e.start >= start && e.start < end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function dedupeByDateTitle(events: CalendarEvent[]): CalendarEvent[] {
  // The iCal feeds share events. Columbus Day shows up under 4 different
  // committee names (Select Board, Planning Board, etc.) because the
  // town publishes the same event in every committee's calendar. The
  // dedupe key used to include committee which let the duplicates
  // through. Use just dayKey + summary (event identity is the date +
  // title, not the committee that listed it).
  //
  // When duplicates exist, prefer the "Main Calendar" version because
  // it's the authoritative source for shared events like town holidays,
  // committee meetings, etc. If no Main Calendar version exists, keep
  // whichever version came first.
  const byKey = new Map<string, CalendarEvent>();
  for (const e of events) {
    const dayKey = e.start.toISOString().slice(0, 10);
    const key = `${dayKey}|${e.summary}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, e);
      continue;
    }
    // Prefer Main Calendar; otherwise keep the earlier one (we keep
    // existing).
    if (existing.committee !== "Main Calendar" && e.committee === "Main Calendar") {
      byKey.set(key, e);
    }
  }
  return Array.from(byKey.values());
}