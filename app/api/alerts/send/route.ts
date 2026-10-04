// app/api/alerts/send/route.ts — Webhook endpoint hit by Tyler's Mac cron
// when new docs are detected. Fans out to subscribers by tag intersection,
// sends via Resend (email) + per-user Telegram bots.
//
// Auth: shared secret in `Authorization: Bearer <ALERT...T>`.
// The cron script reads the same env var on Tyler's Mac.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  findRecipientsByTag,
  getTelegramCreds,
  getUnsubscribeToken,
  fingerprint,
} from "@/lib/db";
import { tagForDoc } from "@/lib/categories";
import { tag as tagImpact } from "@/lib/impact";
import { sendAlert } from "@/lib/email";
import { loadOcrExport } from "@/lib/agenda-center";
import { sendTelegramMessage, type TelegramDoc } from "@/lib/telegram";

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

  // If the client didn't compute impact tags (e.g. an older cron or
  // a payload that pre-dates the tagger), do it here from the title +
  // committee. Same logic as lib/impact.ts; lives server-side so the
  // client doesn't need to mirror the keyword list.
  const impactTags = payload.tags.length
    ? payload.tags
    : Array.from(tagImpact(payload.title ?? "", payload.committee ?? ""));
  const categoryIds = tagForDoc(impactTags);
  if (categoryIds.length === 0) {
    return NextResponse.json({ skipped: "no category match" });
  }

  const recipients = await findRecipientsByTag(categoryIds);
  const ocr = loadOcrExport();
  const summary =
    ocr?.summaries?.[payload.guid]?.summary?.slice(0, 800) ?? "(no summary available)";

  // Telegram doc shape is shared between the email and telegram senders.
  const telegramDoc: TelegramDoc = {
    committee: payload.committee,
    docType: payload.docType,
    meetingDate: payload.meetingDate,
    title: payload.title,
    url: payload.url,
    summary,
  };

  let emailSent = 0;
  let emailFailed = 0;
  let telegramSent = 0;
  let telegramFailed = 0;
  let telegramSkipped = 0;
  const errors: string[] = [];

  for (const sub of recipients) {
    // Email: needs the user's unsubscribe_token, fetched per-recipient.
    // We never include this token in any HTTP response that leaves the
    // server.
    const token = await getUnsubscribeToken(sub.clerk_id);
    if (token) {
      const result = await sendAlert({
        to: sub.email,
        unsubscribeToken: token,
        committee: payload.committee,
        docType: payload.docType,
        meetingDate: payload.meetingDate,
        title: payload.title,
        url: payload.url,
        summary,
      });
      if (result.ok) {
        emailSent += 1;
      } else {
        emailFailed += 1;
        errors.push(`email ${fingerprint(sub.email)}: ${result.error ?? "?"}`);
      }
    } else {
      // No profile row — should not happen for a tagged subscriber,
      // but log defensively.
      emailFailed += 1;
      errors.push(`email ${fingerprint(sub.email)}: no profile row`);
    }

    // Telegram: per-user, fetched + decrypted on demand. Skipped silently
    // for users who have not enabled Telegram. The bot token and chat_id
    // are NEVER logged.
    try {
      const creds = await getTelegramCreds(sub.clerk_id);
      if (!creds) {
        telegramSkipped += 1;
      } else {
        const tg = await sendTelegramMessage(
          creds.botToken,
          creds.chatId,
          telegramDoc,
        );
        if (tg.ok) {
          telegramSent += 1;
        } else {
          telegramFailed += 1;
          // tg.error is already redacted by lib/telegram.ts.
          errors.push(`telegram ${fingerprint(sub.email)}: ${tg.error ?? "?"}`);
        }
      }
    } catch (ex) {
      telegramFailed += 1;
      errors.push(`telegram ${fingerprint(sub.email)}: ${String(ex).slice(0, 200)}`);
    }
  }

  console.log(
    `[alert] guid=${payload.guid} categories=[${categoryIds.join(",")}] ` +
      `subscribers=${recipients.length} email=sent:${emailSent}/failed:${emailFailed} ` +
      `telegram=sent:${telegramSent}/failed:${telegramFailed}/skipped:${telegramSkipped}`,
  );
  if (errors.length > 0 && errors.length <= 5) {
    for (const e of errors) console.log(`  - ${e}`);
  }

  return NextResponse.json({
    ok: true,
    matched_categories: categoryIds,
    subscribers: recipients.length,
    email: { sent: emailSent, failed: emailFailed },
    telegram: { sent: telegramSent, failed: telegramFailed, skipped: telegramSkipped },
  });
}