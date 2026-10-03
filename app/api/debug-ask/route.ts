import { NextResponse } from "next/server";
import { loadTownInfo, selectRelevantPages } from "@/lib/town-info";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "how do I get rid of paint";
  const data = loadTownInfo();
  const pages = data ? selectRelevantPages(q, data) : [];

  // Also do a raw regex test in the same way selectRelevantPages does
  const qLow = q.toLowerCase();
  const paintPattern = /paint|recycl|trash|rubbish|garbage|pickup|transfer.*station|curbside|compost|hazard.*waste|mercury/;
  const paintMatches = paintPattern.test(qLow);
  const paintInData = data ? "paint_disposal" in data.pages : false;

  return NextResponse.json({
    q,
    q_low: qLow,
    data_loaded: !!data,
    page_count: data ? Object.keys(data.pages).length : 0,
    matched_slugs: pages.map(p => p.slug),
    regex_test: {
      paint_pattern: paintPattern.source,
      paint_pattern_matches: paintMatches,
      paint_disposal_in_data: paintInData,
    },
  });
}