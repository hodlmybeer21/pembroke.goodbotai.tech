// app/api/profile/telegram/route.ts — Set or clear a user's Telegram
// credentials. Each user provides their own bot token + chat_id; the
// server encrypts them at rest with AES-256-GCM and never returns them
// in any response.
//
// Auth: standard Clerk auth — only the signed-in user can change their
// own creds.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { setTelegramCreds } from "@/lib/db";

export const runtime = "nodejs";

const BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{30,}$/;
const CHAT_ID_RE = /^-?\d+$/;

interface TelegramBody {
  // Pass empty strings to disable, valid creds to enable.
  botToken?: unknown;
  chatId?: unknown;
  enabled?: unknown;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: TelegramBody;
  try {
    body = (await req.json()) as TelegramBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { botToken, chatId, enabled } = body;

  // Disable path: any of (enabled=false, empty strings, missing creds)
  // means turn it off. We never accept partial creds.
  if (enabled === false || (botToken === "" && chatId === "")) {
    try {
      const result = await setTelegramCreds(userId, null);
      return NextResponse.json({ ok: true, telegram_enabled: result.telegram_enabled });
    } catch (ex) {
      // TELEGRAM_COLUMN_KEY is probably not set on Vercel yet.
      const msg = String(ex);
      const isKeyError = msg.includes("TELEGRAM_COLUMN_KEY");
      return NextResponse.json(
        { error: isKeyError ? "telegram not configured server-side" : "could not update" },
        { status: isKeyError ? 503 : 500 },
      );
    }
  }

  // Enable path: validate shape. Don't log the values.
  if (typeof botToken !== "string" || typeof chatId !== "string") {
    return NextResponse.json({ error: "botToken and chatId must be strings" }, { status: 400 });
  }
  if (!BOT_TOKEN_RE.test(botToken)) {
    return NextResponse.json(
      { error: "botToken should look like '123456789:ABC-DEF...' (the token from @BotFather)" },
      { status: 400 },
    );
  }
  if (!CHAT_ID_RE.test(chatId)) {
    return NextResponse.json(
      { error: "chatId should be a number (the chat.id from getUpdates)" },
      { status: 400 },
    );
  }

  try {
    const result = await setTelegramCreds(userId, {
      botToken,
      chatId,
      enabled: true,
    });
    return NextResponse.json({ ok: true, telegram_enabled: result.telegram_enabled });
  } catch (ex) {
    const msg = String(ex);
    const isKeyError = msg.includes("TELEGRAM_COLUMN_KEY");
    return NextResponse.json(
      { error: isKeyError ? "telegram not configured server-side" : "could not update" },
      { status: isKeyError ? 503 : 500 },
    );
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await setTelegramCreds(userId, null);
    return NextResponse.json({ ok: true, telegram_enabled: result.telegram_enabled });
  } catch (ex) {
    return NextResponse.json({ error: String(ex).slice(0, 200) }, { status: 500 });
  }
}