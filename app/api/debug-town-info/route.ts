// app/api/debug-town-info/route.ts — Debug endpoint to inspect what
// loadTownInfo() actually sees at runtime. Returns the page slugs and
// char counts.

import { NextResponse } from "next/server";
import { loadTownInfo } from "@/lib/town-info";

export const runtime = "nodejs";

export async function GET() {
  const data = loadTownInfo();
  if (!data) {
    return NextResponse.json({ loaded: false, cwd: process.cwd() });
  }
  const slugs = Object.keys(data.pages);
  return NextResponse.json({
    loaded: true,
    page_count: slugs.length,
    pages: slugs.map((s) => ({ slug: s, char_count: data.pages[s].char_count, url: data.pages[s].url })),
  });
}