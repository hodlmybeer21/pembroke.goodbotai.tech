// lib/snow.ts — Detect active snow emergency / parking ban / winter weather
// events for TODAY (in ET) from the CivicEngage iCal feeds.
//
// Pembroke publishes winter notices as calendar events on the Main Calendar
// feed (catId 30). The town's official source is
// https://www.pembroke-nh.com/1303/Winter-Parking-and-Snow-Emergency-Info.
//
// We scan the iCal feeds for summaries matching common winter-event phrasings
// and pick the most recent one that is active for today's date in ET.

import "server-only";
import { fetchAllFeeds, type CalendarEvent } from "./ical";

export interface SnowNotice {
  until: Date;
  title: string;
  url?: string;
}

// Match event summaries like "Snow Emergency Parking Ban",
// "Winter Parking Ban", "Winter Storm Warning", "Winter Weather Advisory",
// "Snow Emergency Declared", "Parking Ban in Effect".
const SNOW_PATTERN = /snow emergency|parking ban|winter weather|winter storm|winter parking/i;

/**
 * Format a Date as YYYY-MM-DD in America/New_York, regardless of where the
 * server is running. Vercel deploys run in UTC — using the local Date
 * methods directly would shift the day in the evening hours.
 */
function ymdInEastern(d: Date): string {
  // Intl.DateTimeFormat is the only reliable way to get a TZ-aware
  // Y-M-D in Node. It's been in V8 since Node 13.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Is this calendar event a "today" event in ET? An all-day or multi-day
 * snow emergency usually shows as start = beginning of the ban day. We
 * consider it active today when:
 *   - the start date is today (in ET), OR
 *   - today falls between start and end (in ET) — for multi-day events.
 */
function isActiveToday(e: CalendarEvent, todayYmd: string): boolean {
  const startYmd = ymdInEastern(e.start);
  const endYmd = ymdInEastern(e.end);
  if (startYmd === todayYmd) return true;
  // End in iCal is exclusive (the day AFTER the last day of the event).
  // So "active through Friday" is end = Saturday 00:00. Compare as
  // strings: todayYmd < endYmd means today is before the exclusive end.
  if (todayYmd >= startYmd && todayYmd < endYmd) return true;
  return false;
}

/**
 * Read the iCal feeds, look for an active snow emergency / parking ban
 * for today, and return the most recent one. Returns null when there's
 * no active notice — the banner should hide.
 *
 * Best-effort: if the feed fetch fails, returns null (no banner). We
 * don't want a flapping feed to crash the whole layout render.
 */
export async function getActiveSnowNotice(): Promise<SnowNotice | null> {
  let events: CalendarEvent[] = [];
  try {
    events = await fetchAllFeeds();
  } catch {
    return null;
  }

  const todayYmd = ymdInEastern(new Date());
  const matches = events
    .filter((e) => SNOW_PATTERN.test(e.summary))
    .filter((e) => isActiveToday(e, todayYmd))
    // Most recent first — the most recent start wins, since the town
    // may extend or re-declare a ban and we want the freshest notice.
    .sort((a, b) => b.start.getTime() - a.start.getTime());

  if (matches.length === 0) return null;
  const top = matches[0];
  return {
    until: top.end,
    title: top.summary,
    // CivicEngage events don't always carry a public detail URL in the
    // iCal payload. The winter-parking-info page is the official home
    // for emergency declarations, so we always include it as the link
    // target unless the summary itself is enough to act on.
    url: "https://www.pembroke-nh.com/1303/Winter-Parking-and-Snow-Emergency-Info",
  };
}
