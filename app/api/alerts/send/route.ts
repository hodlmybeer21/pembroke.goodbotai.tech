// app/api/alerts/send/route.ts — Webhook endpoint hit by Tyler's Mac cron
// when new docs are detected. Fans out to subscribers by tag intersection,
// sends via Resend.
//
// Auth: shared secret in `Authorization: Bearer <ALERT_WEBHOOK_SECRET>`.
// The cron script reads the same env var on Tyler's Mac.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { findSubscribersByTag, fingerprint } from "@/lib/db";
import { tagForDoc } from "@/lib/categories";
import { sendAlert } from "@/lib/email";
import { loadOcrExport } from "@/lib/agenda-center";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AlertPayload {
  guid: string;
  committee: string;
  docType: "Agenda" | "Minutes";
  meetingDate: string;
  title: string;
  url: string;
  tags: string[];
  ts: string;
}

function verify(headers: Headers, body: string): boolean {
  const secret = process.env.ALERT_WEBHOOK_SECRET;
  if (!secret) return false;
  const auth = headers.get("authorization") ?? "";
  const got = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  const expected = `v1:${createHmac("sha256", secret).update(body).digest("hex")}`;
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(req.headers, raw)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let payload: AlertPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const categoryIds = tagForDoc(payload.tags);
  if (categoryIds.length === 0) {
    return NextResponse.json({ skipped: "no category match" });
  }

  const subs = await findSubscribersByTag(categoryIds);
  const ocr = loadOcrExport();
  const summary =
    ocr?.summaries?.[payload.guid]?.summary?.slice(0, 800) ?? "(no summary available)";

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const sub of subs) {
    const result = await sendAlert({
      to: sub.email,
      unsubscribeToken: sub.unsubscribe_token,
      committee: payload.committee,
      docType: payload.docType,
      meetingDate: payload.meetingDate,
      title: payload.title,
      url: payload.url,
      summary,
    });
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      errors.push(`${fingerprint(sub.email)}: ${result.error ?? "?"}`);
    }
  }

  console.log(
    `[alert] guid=${payload.guid} categories=[${categoryIds.join(",")}] ` +
      `subscribers=${subs.length} sent=${sent} failed=${failed}`,
  );
  if (errors.length > 0 && errors.length <= 5) {
    for (const e of errors) console.log(`  - ${e}`);
  }

  return NextResponse.json({
    ok: true,
    matched_categories: categoryIds,
    subscribers: subs.length,
    sent,
    failed,
  });
}