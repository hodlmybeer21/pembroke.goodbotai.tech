// app/api/alerts/weekly-digest/route.ts — Send the weekly digest to all
// subscribers. Hit by Tyler's Mac cron every Sunday morning at 7am.
//
// Auth: HMAC-SHA256 in Authorization header, shared secret with the
// cron script. Same pattern as /api/alerts/send.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@vercel/postgres";
import { getUnsubscribeToken } from "@/lib/db";
import { buildDigest } from "@/lib/digest";
import { sendWeeklyDigest, type WeeklyDigestInput } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 300; // digest sends can take a while

function verify(headers: Headers, body: string): boolean {
  const secret = process.env.ALERT_WEBHOOK_SECRET;
  if (!secret) return false;
  const auth = headers.get("authorization") ?? "";
  const got = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7)
    : "";
  const expected = `v1:${createHmac("sha256", secret).update(body).digest("hex")}`;
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

interface WeeklyDigestPayload {
  // Optional: override the "since" timestamp. First run uses null
  // (catches the past 7 days). Subsequent runs use the last-sent
  // timestamp from the state file.
  sinceIso?: string | null;
  // Optional: dry-run mode (build digests, don't send).
  dryRun?: boolean;
  // Preview mode: builds the digest for the requesting user
  // (from Clerk session) and returns it without sending.
  preview?: boolean;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(req.headers, raw)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let payload: WeeklyDigestPayload = {};
  try {
    payload = raw ? (JSON.parse(raw) as WeeklyDigestPayload) : {};
  } catch {
    // empty body is fine
  }

  // Preview mode: builds the digest for the requesting user (from
  // sessionId if provided) and returns it WITHOUT sending. The
  // settings page uses this to show a "here's what your digest
  // would look like" preview before Sunday rolls around.
  if (payload.preview) {
    const { auth } = await import("@clerk/nextjs/server");
    const { getProfile } = await import("@/lib/db");
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "no session" }, { status: 401 });
    }
    const profile = await getProfile(userId).catch(() => null);
    if (!profile) {
      return NextResponse.json({ error: "no profile" }, { status: 404 });
    }
    const digest = await buildDigest({
      userCategories: profile.categories,
      personaId: profile.persona,
      sinceDocsIso: payload.sinceIso ?? null,
    });
    return NextResponse.json({ digest });
  }

  // Pull all profiles that have at least one category set.
  // For the first run, everyone with a profile gets a digest.
  const r = await sql<{
    clerk_id: string;
    email: string;
    categories: string[];
    persona: string | null;
  }>`
    SELECT clerk_id, email, categories, persona
      FROM profiles
     WHERE cardinality(categories) > 0
  `;
  const profiles = r.rows;
  const since = payload.sinceIso ?? null;
  const dryRun = payload.dryRun === true;

  let sent = 0;
  let telegramSent = 0;
  let failed = 0;
  const errors: string[] = [];
  const sample: unknown[] = [];

  for (const profile of profiles) {
    try {
      const digest = await buildDigest({
        userCategories: profile.categories,
        personaId: profile.persona,
        sinceDocsIso: since,
      });
      const unsubscribeToken =
        (await getUnsubscribeToken(profile.clerk_id)) ?? "";
      const emailInput: WeeklyDigestInput = {
        to: profile.email,
        unsubscribeToken,
        weekStart: digest.weekStart,
        weekEnd: digest.weekEnd,
        personaLabel: digest.persona?.label ?? null,
        snow: digest.snow
          ? {
              title: digest.snow.title,
              until: digest.snow.until,
              url: digest.snow.url,
            }
          : null,
        thisWeek: digest.thisWeek.map((i) => ({
          committee: i.committee,
          title: i.title,
          when: i.when,
          url: i.url,
        })),
        newDocs: digest.newDocs.map((i) => ({
          committee: i.committee,
          title: i.title,
          when: i.when,
          url: i.url,
          docType: i.docType,
        })),
        forYou: digest.forYou.map((i) => ({
          committee: i.committee,
          title: i.title,
          when: i.when,
          url: i.url,
        })),
      };
      if (sample.length < 2) {
        sample.push({ email: profile.email, digest: emailInput });
      }
      if (!dryRun) {
        // Email
        const result = await sendWeeklyDigest(emailInput);
        if (result.ok) {
          sent++;
        } else {
          failed++;
          errors.push(`${profile.email}: ${result.error}`);
        }
        // Telegram (if user has set it up) — reuse the encrypted creds
        try {
          const { getTelegramCreds } = await import("@/lib/db");
          const tg = await getTelegramCreds(profile.clerk_id);
          if (tg) {
            const lines: string[] = [];
            lines.push(`*Your week in Pembroke*`);
            lines.push(
              `${digest.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${digest.weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            );
            if (digest.snow) {
              lines.push("");
              lines.push(`❄ *${digest.snow.title}*`);
              lines.push(`Until ${digest.snow.until.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`);
            }
            if (digest.forYou.length) {
              lines.push("");
              lines.push("*Picked for you*");
              for (const i of digest.forYou.slice(0, 3)) {
                lines.push(
                  `• ${i.committee} — ${i.title} (${i.when.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
                );
              }
            }
            if (digest.thisWeek.length) {
              lines.push("");
              lines.push("*This week*");
              for (const i of digest.thisWeek.slice(0, 5)) {
                lines.push(
                  `• ${i.when.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — ${i.committee}`,
                );
              }
            }
            const telegramResult = await sendTelegramMessage(
              tg.botToken,
              tg.chatId,
              {
                committee: "Weekly digest",
                docType: "Agenda",
                meetingDate: digest.weekStart.toLocaleDateString("en-US"),
                title: `Your week in Pembroke — ${digest.forYou.length || digest.thisWeek.length || digest.newDocs.length} items`,
                url: "https://pembroke.goodbotai.tech",
                summary: lines.join("\n"),
              },
            );
            if (telegramResult.ok) telegramSent++;
          }
        } catch {
          // Telegram is optional — ignore errors
        }
      }
    } catch (ex) {
      failed++;
      errors.push(`${profile.email}: ${String(ex).slice(0, 200)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    telegramSent,
    failed,
    profiles: profiles.length,
    dryRun,
    errors: errors.slice(0, 10),
    sample: sample.slice(0, 1), // include one example for debugging
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "weekly-digest",
    auth: "HMAC (Authorization: Bearer v1:hmac)",
  });
}