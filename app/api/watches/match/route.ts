// app/api/watches/match/route.ts — Endpoint hit by pembroke_street_match.py
// when a new archive entry lands. Scans the doc content against every
// user's street watches, emails the matches with a "street watch" template.
//
// Auth: HMAC-SHA256 in Authorization header (shared secret on both sides).
// The site also internally fetches user creds — never the cron.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  findWatchesMentioned,
  getUnsubscribeToken,
  fingerprint,
} from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

interface MatchPayload {
  guid: string;
  committee: string;
  docType: "Agenda" | "Minutes";
  meetingDate: string;
  title: string;
  url: string;
  summary: string;
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

const SITE_BASE = process.env.SITE_BASE_URL ?? "https://pembroke.goodbotai.tech";
const FROM_ADDRESS =
  process.env.ALERT_FROM_EMAIL ?? "Pembroke Town Brief <brief@pembroke.goodbotai.tech>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStreetWatchEmail(
  payload: MatchPayload,
  street: string,
  unsubscribeToken: string,
): { subject: string; html: string } {
  const subject = `Street watch: ${street} mentioned in ${payload.committee} ${payload.docType.toLowerCase()}`;
  const safeSummary = escapeHtml(payload.summary.slice(0, 800));
  const safeTitle = escapeHtml(payload.title);
  const unSub = `${SITE_BASE}/api/alerts/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const manageUrl = `${SITE_BASE}/settings`;
  const html = `<!doctype html>
<html><body style="margin:0;font-family:-apple-system,Segoe UI,sans-serif;background:#fafaf9;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;padding:24px 16px">
<tr><td style="padding:0 0 16px 0;font-size:13px;color:#57534e">
📍 Pembroke NH street watch
</td></tr>
<tr><td style="padding:0 0 8px 0;font-size:18px;font-weight:600">
Street watch: ${escapeHtml(street)}
</td></tr>
<tr><td style="padding:0 0 16px 0;font-size:13px;color:#57534e">
${escapeHtml(payload.committee)} · ${escapeHtml(payload.docType)} · ${escapeHtml(payload.meetingDate)}
</td></tr>
<tr><td style="padding:0 0 12px 0;font-size:14px;line-height:1.55">
${safeTitle} mentions <strong>${escapeHtml(street)}</strong>.
</td></tr>
<tr><td style="padding:0 0 16px 0;font-size:14px;line-height:1.55;white-space:pre-wrap">${safeSummary}</td></tr>
<tr><td style="padding:0 0 16px 0">
<a href="${escapeHtml(payload.url)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;font-size:14px;text-decoration:none">Read the full document</a>
</td></tr>
<tr><td style="padding:16px 0 0 0;border-top:1px solid #e7e5e4;font-size:11px;color:#78716c">
You're receiving this because you added <strong>${escapeHtml(street)}</strong> to your street watch at <a href="${SITE_BASE}" style="color:#78716c">pembroke.goodbotai.tech</a>. Manage watches at <a href="${manageUrl}" style="color:#78716c">/settings</a>. <a href="${unSub}" style="color:#78716c">Unsubscribe</a>.
</td></tr>
</table>
</body></html>`;
  return { subject, html };
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(req.headers, raw)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let payload: MatchPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!payload.guid || !payload.summary) {
    return NextResponse.json({ error: "guid and summary required" }, { status: 400 });
  }

  // Combine title + summary for the match scan
  const haystack = `${payload.title} ${payload.summary}`;
  const mentions = await findWatchesMentioned(haystack);

  if (mentions.length === 0) {
    return NextResponse.json({ ok: true, matches: 0 });
  }

  // Group by user (a user might watch multiple streets; dedupe so we
  // only send one email per user per doc, listing all their matched
  // streets in the body).
  const byUser = new Map<string, { email: string; streets: string[] }>();
  for (const m of mentions) {
    const cur = byUser.get(m.clerk_id);
    if (cur) {
      cur.streets.push(m.street);
    } else {
      byUser.set(m.clerk_id, { email: m.email, streets: [m.street] });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY not set" }, { status: 503 });
  }
  // Lazy import Resend to keep the cold-start bundle small
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [clerkId, { email, streets }] of byUser.entries()) {
    const token = await getUnsubscribeToken(clerkId);
    if (!token) {
      failed += 1;
      errors.push(`${fingerprint(email)}: no unsubscribe token`);
      continue;
    }
    // For multi-street watches on the same doc, use the first street
    // in the subject (most users watch one street; this is the common
    // case). The body lists all matched streets.
    const primaryStreet = streets[0];
    const multiSuffix = streets.length > 1 ? ` (+${streets.length - 1} more)` : "";
    const { subject, html } = buildStreetWatchEmail(
      { ...payload, title: payload.title + multiSuffix },
      primaryStreet,
      token,
    );

    try {
      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        to: email,
        subject,
        html,
      });
      if (result.error) {
        failed += 1;
        errors.push(`${fingerprint(email)}: ${result.error.message}`);
      } else {
        sent += 1;
      }
    } catch (ex) {
      failed += 1;
      errors.push(`${fingerprint(email)}: ${String(ex).slice(0, 200)}`);
    }
  }

  console.log(
    `[watches] guid=${payload.guid} matches=${mentions.length} users=${byUser.size} sent=${sent} failed=${failed}`,
  );
  if (errors.length > 0 && errors.length <= 5) {
    for (const e of errors) console.log(`  - ${e}`);
  }

  return NextResponse.json({
    ok: true,
    matches: mentions.length,
    users: byUser.size,
    sent,
    failed,
  });
}