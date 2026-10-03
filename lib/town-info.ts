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

const MAX_CONTEXT_CHARS = 6000;

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
 * Pick the most relevant pages for a given question and return their text
 * joined, capped at ~6KB so the LLM context stays bounded.
 */
export function selectRelevantPages(
  q: string,
  info: TownInfoExport,
  cap: number = MAX_CONTEXT_CHARS,
): { slug: string; text: string }[] {
  const qLow = q.toLowerCase();
  const slugs = Object.keys(info.pages);

  // Tiny keyword → slug map. If the question contains the keyword, that slug
  // is relevant. Otherwise we drop the page from context to keep it tight.
  const keywordMap: Array<[RegExp, string[]]> = [
    [/library|book|read|catalo/, ["library", "library_catalog", "library_trustees", "library_website"]],
    [/paint|recycl|trash|rubbish|garbage|pickup|transfer.*station|curbside|compost|hazard.*waste|mercury/, ["recycling", "paint_disposal", "mercury_disposal", "household_hazardous_waste", "public_works", "transfer_station_facility", "transfer_station_fees", "rubbish_pickup", "solid_waste_collection", "holiday_curbside_schedule", "spring_cleanup", "construction_demolition", "recycling_textiles", "medical_waste"]],
    [/snow|plow|ice|winter|parking|sand.*salt/, ["snow_policy", "public_works"]],
    [/fire|department|burn.*permit|smoke.alarm/, ["fire_department"]],
    [/police|cop|law.enforce|crime|emergency.*911/, ["police_department"]],
    [/plan|zoning|build.*permit|setback|easement|subdivision/, ["planning_building"]],
    [/vital.record|marriage|death|birth|certif/, ["vital_records"]],
    [/vot|elect|register|polling|absentee.ballot/, ["voter_registration"]],
    [/tax|assess|prop.*valu|abatement/, ["assessing"]],
    [/cemetery|burial|grave|monument/, ["cemetery"]],
    [/storm.*water|drainage|runoff/, ["stormwater"]],
    [/town.hall|hours.*clerk|government|admin/, ["town_info"]],
  ];

  const matchedSlugs = new Set<string>();

  // Always include the general town_info page as background context.
  matchedSlugs.add("town_info");

  for (const [pattern, slugsForMatch] of keywordMap) {
    if (pattern.test(qLow)) {
      for (const s of slugsForMatch) matchedSlugs.add(s);
    }
  }

  const out: { slug: string; text: string }[] = [];
  let totalChars = 0;
  for (const slug of slugs) {
    if (!matchedSlugs.has(slug)) continue;
    const page = info.pages[slug];
    if (!page) continue;
    const text = page.text;
    if (totalChars + text.length > cap && out.length > 0) continue;
    out.push({ slug, text });
    totalChars += text.length;
  }
  return out;
}