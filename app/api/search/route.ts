// app/api/search/route.ts — full-text search over the meeting minutes.
//
// The OCR text is about 2.1 million characters. Shipping that to the
// browser would be a heavy download on a phone, so the search runs
// here and only the matches come back.

import { NextRequest, NextResponse } from "next/server";
import { searchArchive } from "@/lib/archive-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 25)));

  if (q.length < 2) {
    return NextResponse.json({ hits: [], total: 0, query: q, tokens: [], documents_searched: 0, documents_with_text: 0 });
  }

  const result = searchArchive(q, limit);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
