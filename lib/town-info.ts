// lib/town-info.ts — Curated town-info pages from pembroke-nh.com.
// Refreshed daily by pembroke_town_info_export.py on Tyler's Mac.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import "server-only";

export interface TownInfoPage {
  slug: string;
  url: string;
  scraped_at: string;
  char_count: number;
  text: string;
}

export interface TownInfoExport {
  generated_at: string;
  source: string;
  page_count: number;
  pages: Record<string, TownInfoPage>;
}

// Bumped from 6KB → 18KB so we can return 3-5 relevant pages instead of
// dropping everything after the first 2 that fit. 18KB still keeps the LLM
// context bounded and well under any rate limit.
const MAX_CONTEXT_CHARS = 18000;

export function loadTownInfo(): TownInfoExport | null {
  try {
    const p = join(process.cwd(), "data", "town-info.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as TownInfoExport;
  } catch {
    return null;
  }
}

/**
 * Pick the most relevant pages for a given question. Pages are returned in
 * priority order: keyword-specific pages first, then the catch-all town_info
 * last as background context. Capped at ~18KB so the LLM context stays
 * bounded.
 */
export function selectRelevantPages(
  q: string,
  info: TownInfoExport,
  cap: number = MAX_CONTEXT_CHARS,
): { slug: string; text: string }[] {
  const qLow = q.toLowerCase();
  const slugs = Object.keys(info.pages);

  // Tiny keyword → slug map. If the question contains the keyword, those
  // slugs are relevant. Order within a bucket is irrelevant — we sort by
  // score (matched count) at the end.
  const keywordMap: Array<[RegExp, string[]]> = [
    [/library|book|read|catalo/, ["library", "library_catalog", "library_trustees", "library_website"]],
    [/paint|recycl|trash|rubbish|garbage|pickup|transfer.*station|curbside|compost|hazard.*waste|mercury/, ["recycling", "mercury_disposal", "public_works", "transfer_station_facility", "solid_waste_collection", "construction_demolition", "recycling_textiles", "medical_waste"]],
    [/snow|plow|ice|winter|parking|sand.*salt/, ["winter_parking_snow", "public_works"]],
    [/fire|department|burn.*permit|smoke.alarm/, ["fire_department"]],
    [/police|cop|law.enforce|crime|emergency.*911/, ["police_department"]],
    [/plan|zoning|build.*permit|setback|easement|subdivision/, ["planning_building", "facility_permit"]],
    [/vital.record|marriage|death|birth|certif/, ["vital_records"]],
    [/vot|elect|register|polling|absentee.ballot/, ["voter_registration"]],
    [/tax|assess|prop.*valu|abatement/, ["assessing"]],
    [/cemetery|burial|grave|monument/, ["cemetery"]],
    [/storm.*water|drainage|runoff/, ["stormwater"]],
    [/road|bridge|culvert|pothole/, ["roads_committee", "roadwork_crews", "public_works"]],
    [/town.hall|hours.*clerk|government|admin/, ["town_info"]],
  ];

  // Score each slug by how many patterns matched it. Slugs that matched
  // many patterns are most relevant; the catch-all town_info is always
  // included but ranked last.
  const scores = new Map<string, number>();
  for (const slug of slugs) scores.set(slug, 0);

  for (const [pattern, slugsForMatch] of keywordMap) {
    if (pattern.test(qLow)) {
      for (const s of slugsForMatch) {
        if (scores.has(s)) scores.set(s, (scores.get(s) ?? 0) + 1);
      }
    }
  }

  // town_info is the background-context page. Always include but at the
  // very end, after all keyword-specific matches.
  scores.set("town_info", scores.get("town_info") ?? 0);

  // Sort slugs: highest score first; ties broken by data insertion order.
  // town_info (score 0 unless matched) always ends up at the end.
  const ranked = [...slugs].sort((a, b) => {
    const sa = scores.get(a) ?? 0;
    const sb = scores.get(b) ?? 0;
    if (sa !== sb) return sb - sa;
    return 0;
  });

  // Pick pages in score order, until we hit the cap. town_info is the
  // very last thing added so it gets dropped if we run out of room.
  const out: { slug: string; text: string }[] = [];
  let totalChars = 0;
  for (const slug of ranked) {
    if (slug === "town_info" && out.length === 0) continue;  // never return only town_info
    const page = info.pages[slug];
    if (!page) continue;
    if (totalChars + page.text.length > cap) {
      // If this is the catch-all town_info, skip and keep looking for
      // tighter matches; otherwise stop — we already have enough.
      if (slug === "town_info") continue;
      break;
    }
    out.push({ slug, text: page.text });
    totalChars += page.text.length;
  }
  return out;
}