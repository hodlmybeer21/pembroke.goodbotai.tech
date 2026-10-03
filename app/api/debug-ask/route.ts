import { NextResponse } from "next/server";
import { loadTownInfo, selectRelevantPages } from "@/lib/town-info";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "how do I get rid of paint";
  const data = loadTownInfo();
  const pages = data ? selectRelevantPages(q, data) : [];
  return NextResponse.json({
    q,
    data_loaded: !!data,
    page_count: data ? Object.keys(data.pages).length : 0,
    matched_slugs: pages.map(p => p.slug),
  });
}