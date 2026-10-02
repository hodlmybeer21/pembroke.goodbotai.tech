// app/api/alerts/unsubscribe/route.ts — One-click unsubscribe via signed token.

import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }
  const ok = await unsubscribeByToken(token);
  if (!ok) {
    return new NextResponse("Invalid or already-removed subscription.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse(
    "You're unsubscribed. Browse the site without an account — every page is public. (https://pembroke.goodbotai.tech)",
    { headers: { "Content-Type": "text/plain" } },
  );
}