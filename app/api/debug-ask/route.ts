import { NextResponse } from "next/server";
import { loadTownInfo } from "@/lib/town-info";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "how do I get rid of paint";
  const data = loadTownInfo();

  // Reproduce selectRelevantPages step by step to see where it goes wrong
  const qLow = q.toLowerCase();
  const slugs = data ? Object.keys(data.pages) : [];
  const matched = new Set<string>();
  matched.add("town_info");

  const keywordMap: Array<[RegExp, string[]]> = [
    [/library|book|read|catalo/, ["library", "library_catalog", "library_trustees", "library_website"]],
    [/paint|recycl|trash|rubbish|garbage|pickup|transfer.*station|curbside|compost|hazard.*waste|mercury/, ["recycling", "paint_disposal", "mercury_disposal", "household_hazardous_waste", "public_works", "transfer_station_facility", "transfer_station_fees", "rubbish_pickup", "solid_waste_collection", "holiday_curbside_schedule", "spring_cleanup", "construction_demolition", "recycling_textiles", "medical_waste"]],
  ];

  const traces: any[] = [];
  for (const [pat, slugsForMatch] of keywordMap) {
    const matches = pat.test(qLow);
    if (matches) {
      for (const s of slugsForMatch) matched.add(s);
    }
    traces.push({ pattern: pat.source, matches, added: matches ? slugsForMatch : [] });
  }

  // Build the final output list the way selectRelevantPages does
  const finalSlugs: string[] = [];
  for (const slug of slugs) {
    if (!matched.has(slug)) continue;
    const page = data?.pages[slug];
    if (!page) continue;
    finalSlugs.push(slug);
  }

  return NextResponse.json({
    q,
    q_low: qLow,
    page_count_in_data: slugs.length,
    matched_count: matched.size,
    matched_set: Array.from(matched),
    final_slugs: finalSlugs,
    paint_in_data: data ? "paint_disposal" in data.pages : false,
    paint_in_matched: matched.has("paint_disposal"),
    traces,
  });
}