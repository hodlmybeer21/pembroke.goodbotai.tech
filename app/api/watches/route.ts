// app/api/watches/route.ts — Street-watch CRUD. Auth: Clerk.
//
// GET   /api/watches          → list current user's watches
// POST  /api/watches          → add a watch (body: { street })
// DELETE /api/watches?street=X → remove a watch

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listWatches, addWatch, removeWatch } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const watches = await listWatches(userId);
  return NextResponse.json({ watches });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { street?: unknown };
  try {
    body = (await req.json()) as { street?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.street !== "string" || !body.street.trim()) {
    return NextResponse.json({ error: "street is required" }, { status: 400 });
  }
  try {
    const watch = await addWatch(userId, body.street);
    return NextResponse.json({ watch });
  } catch (ex) {
    return NextResponse.json({ error: String(ex).slice(0, 200) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const street = url.searchParams.get("street");
  if (!street) {
    return NextResponse.json({ error: "street query param is required" }, { status: 400 });
  }
  const ok = await removeWatch(userId, street);
  return NextResponse.json({ ok });
}