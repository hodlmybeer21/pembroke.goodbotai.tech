// lib/dates.ts — date helpers shared by server and client components.
//
// The town data uses two date shapes:
//   - ISO "2026-10-19" (calendar.json, newer exports)
//   - "Oct 19, 2026" (archive-index.json / archive.jsonl meeting_date)
// Some older code only understood one of them, which silently dropped
// most of the archive (only "May" and "June"/"July"-style full names
// matched). Everything that reads a meeting date should go through
// parseMeetingDate so either shape works.
//
// Everything a resident sees is Pembroke time, so display helpers pin
// America/New_York and label it "ET". Vercel servers run in UTC.

export const TOWN_TZ = "America/New_York";

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a meeting date in either "YYYY-MM-DD" or "Mon D, YYYY" /
 * "Month D, YYYY" form. Returns a Date at 12:00 UTC on that calendar
 * day (so the calendar day is the same in UTC and in Eastern time), or
 * null when the string isn't recognised.
 */
export function parseMeetingDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]) - 1;
    d = Number(iso[3]);
  } else {
    const named = /^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(t);
    if (!named) return null;
    const mi = MONTH_INDEX[named[1].slice(0, named[1].toLowerCase().startsWith("sept") ? 4 : 3).toLowerCase()];
    if (mi === undefined) return null;
    y = Number(named[3]);
    m = mi;
    d = Number(named[2]);
  }
  const out = new Date(Date.UTC(y, m, d, 12, 0, 0));
  return isNaN(out.getTime()) ? null : out;
}

/** "Oct 19, 2026" or "2026-10-19" -> "2026-10-19" (or null). */
export function toIsoDate(s: string | null | undefined): string | null {
  const d = parseMeetingDate(s);
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Offset (minutes) of America/New_York from UTC at a given instant. */
function nyOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOWN_TZ,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * The real instant of a town event given its calendar date ("2026-11-03")
 * and its published local time ("2:00 PM"). Returns null if the time is
 * missing or unparseable (all-day events).
 */
export function townDateTime(date: string, time: string | null | undefined): Date | null {
  const day = parseMeetingDate(date);
  if (!day || !time) return null;
  const tm = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/.exec(time.trim());
  if (!tm) return null;
  let h = Number(tm[1]) % 12;
  if (tm[3].toLowerCase() === "p") h += 12;
  const min = Number(tm[2] ?? 0);
  const guess = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, min));
  const off = nyOffsetMinutes(guess);
  return new Date(guess.getTime() - off * 60000);
}

/** "Oct 30, 2026, 9:33 AM ET" */
export function formatEt(d: Date | string | null | undefined, opts: { dateOnly?: boolean } = {}): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  if (opts.dateOnly) {
    return dt.toLocaleDateString("en-US", { timeZone: TOWN_TZ, dateStyle: "medium" });
  }
  return `${dt.toLocaleString("en-US", { timeZone: TOWN_TZ, dateStyle: "medium", timeStyle: "short" })} ET`;
}
