// lib/trash.ts — Load the scraped trash-route lookup and provide a
// case-insensitive substring search across street names.
//
// Data comes from scripts/pembroke_trash_export.py (run on Tyler's Mac,
// committed to data/trash-routes.json). The data is small (< 10KB) so
// we read it from disk on every request — the static-rendered pages can
// cache the result for the same ISR window as everything else.

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface TrashRouteEntry {
  street: string;       // exact street string from the town PDF
  day: string;          // "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
  note?: string;        // optional qualifier (e.g. "from 151 - 302")
}

export interface TrashRoutes {
  generatedAt: string;
  byDay: Record<string, string[]>;
  byStreet: Record<string, string>;
  noPickup: string[];
  sourceUrls: { byDay: string; byStreet: string };
}

interface TrashRoutesFile {
  generated_at: string;
  source_by_day: string;
  source_by_street: string;
  by_day: Record<string, string[]>;
  by_street: Record<string, string>;
  no_pickup_streets: string[];
}

let cached: TrashRoutes | null = null;

export function loadTrashRoutes(): TrashRoutes | null {
  if (cached) return cached;
  try {
    const p = join(process.cwd(), "data", "trash-routes.json");
    if (!existsSync(p)) return null;
    const raw = JSON.parse(readFileSync(p, "utf-8")) as TrashRoutesFile;
    cached = {
      generatedAt: raw.generated_at,
      byDay: raw.by_day,
      byStreet: raw.by_street,
      noPickup: raw.no_pickup_streets ?? [],
      sourceUrls: {
        byDay: raw.source_by_day,
        byStreet: raw.source_by_street,
      },
    };
    return cached;
  } catch {
    return null;
  }
}

/** Return all streets whose name contains the query (case-insensitive).
 *  Sorted by where the match starts (earlier = better), then by length
 *  (shorter = better, more specific).
 */
export function searchStreets(
  query: string,
  routes: TrashRoutes,
  limit = 20,
): TrashRouteEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: Array<{ entry: TrashRouteEntry; pos: number; len: number }> = [];
  for (const [street, day] of Object.entries(routes.byStreet)) {
    const low = street.toLowerCase();
    const pos = low.indexOf(q);
    if (pos < 0) continue;
    hits.push({ entry: { street, day }, pos, len: street.length });
  }
  // No-pickup streets are useful to surface too (so users can see "this
  // street is in town but has no curbside service").
  for (const street of routes.noPickup) {
    const low = street.toLowerCase();
    const pos = low.indexOf(q);
    if (pos < 0) continue;
    hits.push({ entry: { street, day: "No pickup" }, pos, len: street.length });
  }
  hits.sort((a, b) => a.pos - b.pos || a.len - b.len);
  return hits.slice(0, limit).map((h) => h.entry);
}

/** A short reminder of what goes out on the curb. Same for every day —
 *  the town just wants residents to know the time + recyclable rule. */
export function curbsideReminder(day: string): string {
  return `Carts curbside by 6:45 am on ${day}. Recycling pickup is mandatory in Pembroke — place recyclables in the same cart as trash (zero-sort).`;
}

export const TRASH_DAY_KEYWORDS: Array<[RegExp, string]> = [
  // The /ask endpoint checks these patterns to decide when to route a
  // question to the trash page (e.g. "when is my trash day" should
  // surface /trash, not the library hours).
  [/trash|rubbish|garbage|pickup|pick.up|curbside|recycl/i, "/trash"],
];
