// lib/telegram.ts — Send a single Telegram message via the Bot API.
//
// The bot_token + chat_id are passed in as arguments so this function
// is multi-user safe: any caller with valid creds can use it. Used by
// the /api/alerts/send dispatch loop with per-user encrypted creds.

import "server-only";

const TELEGRAM_API_TIMEOUT_MS = 10_000;

export interface TelegramDoc {
  committee: string;
  docType: "Agenda" | "Minutes";
  meetingDate: string;
  title: string;
  url?: string;
  summary: string;
}

const MD_ESCAPE = /([_*`\[\]])/g;

function escapeMd(s: string): string {
  return s.replace(MD_ESCAPE, "\\$1");
}

export function renderTelegramMessage(doc: TelegramDoc): string {
  const lines: string[] = [];
  lines.push(`*New ${doc.docType} — ${escapeMd(doc.committee)}*`);
  lines.push("");
  if (doc.meetingDate) {
    lines.push(escapeMd(doc.meetingDate));
    lines.push("");
  }
  const summary = doc.summary.length > 600
    ? doc.summary.slice(0, 599).trimEnd() + "…"
    : doc.summary;
  lines.push(escapeMd(summary));
  if (doc.url) {
    lines.push("");
    lines.push(`[Read full document](${doc.url})`);
  }
  return lines.join("\n");
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  doc: TelegramDoc,
): Promise<{ ok: boolean; error?: string }> {
  // Validate inputs to prevent malformed calls.
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(botToken)) {
    return { ok: false, error: "invalid bot_token shape" };
  }
  if (!/^-?\d+$/.test(chatId)) {
    return { ok: false, error: "invalid chat_id shape" };
  }

  const text = renderTelegramMessage(doc);
  const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: false,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      // Read body for the error code but NEVER include the bot token.
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: `telegram ${res.status}: ${j.description ?? "unknown"}` };
    }
    return { ok: true };
  } catch (ex) {
    // Don't include the bot token or chat_id in the error string.
    return { ok: false, error: String(ex).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}