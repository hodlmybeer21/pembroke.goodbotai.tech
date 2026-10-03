// lib/db.ts — Vercel Postgres client + schema bootstrap.
//
// Schema:
//   profiles (
//       clerk_id      TEXT PRIMARY KEY  -- Clerk user ID
//       email         TEXT UNIQUE NOT NULL
//       categories    TEXT[] NOT NULL DEFAULT '{}'   -- selected category IDs
//       unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid()
//       telegram_chat_id_encrypted    BYTEA  -- AES-256-GCM ciphertext
//       telegram_chat_id_nonce         BYTEA  -- 12-byte IV
//       telegram_chat_id_tag           BYTEA  -- 16-byte GCM auth tag
//       telegram_bot_token_encrypted   BYTEA  -- bot tokens are secrets
//       telegram_bot_token_nonce        BYTEA
//       telegram_bot_token_tag          BYTEA
//       telegram_enabled  BOOLEAN NOT NULL DEFAULT false
//       created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
//       updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
//     )
//
// The encrypted columns are ciphertext + nonce + auth tag (not a single
// encrypted column) because AES-GCM needs all three. Encryption key
// (TELEGRAM_COLUMN_KEY) lives in Vercel env vars, never in the repo or
// in any user's data. Decryption happens only inside the dispatch loop
// and the plaintext is dropped immediately after use.

import { sql } from "@vercel/postgres";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import "server-only";

export type Profile = {
  clerk_id: string;
  email: string;
  categories: string[];
  unsubscribe_token: string;
  telegram_enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

// Public profile shape — what the settings page can return to the user.
// Never includes telegram_*_encrypted columns or unsubscribe_token (the
// unsubscribe token is only used to build unsubscribe URLs in emails
// and never needs to leave the server).
export type PublicProfile = Pick<Profile, "email" | "categories" | "telegram_enabled">;

export async function ensureSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      clerk_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      categories TEXT[] NOT NULL DEFAULT '{}',
      unsubscribe_token UUID NOT NULL,
      telegram_chat_id_encrypted BYTEA,
      telegram_chat_id_nonce BYTEA,
      telegram_chat_id_tag BYTEA,
      telegram_bot_token_encrypted BYTEA,
      telegram_bot_token_nonce BYTEA,
      telegram_bot_token_tag BYTEA,
      telegram_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export async function getProfile(clerkId: string): Promise<Profile | null> {
  await ensureSchema();
  const r = await sql<Profile>`
    SELECT clerk_id, email, categories, unsubscribe_token, telegram_enabled, created_at, updated_at
      FROM profiles WHERE clerk_id = ${clerkId}
  `;
  return r.rows[0] ?? null;
}

export async function upsertProfile(
  clerkId: string,
  email: string,
  categories: string[],
): Promise<Profile> {
  await ensureSchema();
  // Generate UUID in app code — avoids needing pgcrypto / uuid-ossp extensions
  // on the serverless Postgres database.
  const token = randomUUID();
  const r = await sql<Profile>`
    INSERT INTO profiles (clerk_id, email, categories, unsubscribe_token, updated_at)
    VALUES (${clerkId}, ${email}, ${categories as unknown as string}, ${token}, now())
    ON CONFLICT (clerk_id) DO UPDATE
      SET email = EXCLUDED.email,
          categories = EXCLUDED.categories,
          updated_at = now()
    RETURNING clerk_id, email, categories, unsubscribe_token, telegram_enabled, created_at, updated_at
  `;
  return r.rows[0];
}

function toPgTextArray(values: string[]): string {
  // Escape backslashes + double quotes, then wrap in {}.
  // Postgres TEXT[] literal: {val1,val2,"esc\,ape"}
  const escaped = values.map((v) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"'));
  return `{${escaped.join(",")}}`;
}

// Minimal recipient shape for dispatch — never include the unsubscribe
// token or any encrypted columns. We do a second per-recipient query
// to fetch the encrypted creds only when actually sending.
export type DispatchRecipient = { clerk_id: string; email: string };

export async function findRecipientsByTag(tags: string[]): Promise<DispatchRecipient[]> {
  await ensureSchema();
  const pgArray = toPgTextArray(tags);
  const r = await sql<DispatchRecipient>`
    SELECT clerk_id, email
      FROM profiles
      WHERE categories && ${pgArray}::text[]
  `;
  return r.rows;
}

export type TelegramCreds = {
  chatId: string;
  botToken: string;
};

// Fetch + decrypt a single user's Telegram creds. Returns null if the
// user has not enabled Telegram or has not provided creds.
export async function getTelegramCreds(clerkId: string): Promise<TelegramCreds | null> {
  await ensureSchema();
  const r = await sql<{
    chat_id_ct: string | null;
    chat_id_nonce: string | null;
    chat_id_tag: string | null;
    bot_ct: string | null;
    bot_nonce: string | null;
    bot_tag: string | null;
    enabled: boolean;
  }>`
    SELECT
      telegram_chat_id_encrypted AS chat_id_ct,
      telegram_chat_id_nonce     AS chat_id_nonce,
      telegram_chat_id_tag       AS chat_id_tag,
      telegram_bot_token_encrypted AS bot_ct,
      telegram_bot_token_nonce   AS bot_nonce,
      telegram_bot_token_tag     AS bot_tag,
      telegram_enabled           AS enabled
    FROM profiles WHERE clerk_id = ${clerkId}
  `;
  const row = r.rows[0];
  if (!row || !row.enabled) return null;
  if (!row.chat_id_ct || !row.chat_id_nonce || !row.chat_id_tag) return null;
  if (!row.bot_ct || !row.bot_nonce || !row.bot_tag) return null;

  // Postgres returns bytea as '\\x...' hex strings when parameterized.
  // @vercel/postgres' sql.tagged template handles the conversion; we just
  // need to turn those hex strings back into Buffers.
  const toBuf = (s: string): Buffer => {
    const hex = s.startsWith("\\x") ? s.slice(2) : s;
    return Buffer.from(hex, "hex");
  };
  const { open } = await import("./crypto");
  return {
    chatId: open(toBuf(row.chat_id_ct), toBuf(row.chat_id_nonce), toBuf(row.chat_id_tag)),
    botToken: open(toBuf(row.bot_ct), toBuf(row.bot_nonce), toBuf(row.bot_tag)),
  };
}

// Fetch the unsubscribe token for a single user. Used by the alert
// dispatch loop to build per-recipient unsubscribe URLs. Never include
// this in any JSON response that leaves the server.
export async function getUnsubscribeToken(clerkId: string): Promise<string | null> {
  await ensureSchema();
  const r = await sql<{ unsubscribe_token: string }>`
    SELECT unsubscribe_token FROM profiles WHERE clerk_id = ${clerkId}
  `;
  return r.rows[0]?.unsubscribe_token ?? null;
}

// Store or clear a user's Telegram creds. `enabled=false` + empty creds
// disables Telegram for the user; `enabled=true` + valid creds enables it.
// Ciphertext / nonce / tag come from lib/crypto.seal() (AES-256-GCM).
export async function setTelegramCreds(
  clerkId: string,
  creds: { chatId: string; botToken: string; enabled: boolean } | null,
): Promise<{ telegram_enabled: boolean }> {
  await ensureSchema();
  if (!creds || !creds.enabled) {
    await sql`
      UPDATE profiles SET
        telegram_enabled = false,
        telegram_chat_id_encrypted = NULL,
        telegram_chat_id_nonce = NULL,
        telegram_chat_id_tag = NULL,
        telegram_bot_token_encrypted = NULL,
        telegram_bot_token_nonce = NULL,
        telegram_bot_token_tag = NULL,
        updated_at = now()
      WHERE clerk_id = ${clerkId}
    `;
    return { telegram_enabled: false };
  }
  const { seal } = await import("./crypto");
  // @vercel/postgres expects primitive parameters; convert Buffers to
  // hex strings (these are bytea columns, sent as '\\xDEADBEEF...' literals).
  const chat = seal(creds.chatId);
  const bot = seal(creds.botToken);
  const chatCt = "\\x" + chat.ct.toString("hex");
  const chatNonce = "\\x" + chat.nonce.toString("hex");
  const chatTag = "\\x" + chat.tag.toString("hex");
  const botCt = "\\x" + bot.ct.toString("hex");
  const botNonce = "\\x" + bot.nonce.toString("hex");
  const botTag = "\\x" + bot.tag.toString("hex");
  await sql`
    UPDATE profiles SET
      telegram_enabled = true,
      telegram_chat_id_encrypted = ${chatCt},
      telegram_chat_id_nonce     = ${chatNonce},
      telegram_chat_id_tag       = ${chatTag},
      telegram_bot_token_encrypted = ${botCt},
      telegram_bot_token_nonce   = ${botNonce},
      telegram_bot_token_tag     = ${botTag},
      updated_at = now()
    WHERE clerk_id = ${clerkId}
  `;
  return { telegram_enabled: true };
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  await ensureSchema();
  const r = await sql`
    DELETE FROM profiles WHERE unsubscribe_token = ${token}::uuid
  `;
  return (r.rowCount ?? 0) > 0;
}

// Cheap fingerprint for the alert webhook logs — never log the raw email.
export function fingerprint(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 12);
}

export function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}