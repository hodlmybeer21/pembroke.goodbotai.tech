// lib/crypto.ts — AES-256-GCM encryption helpers for the encrypted
// columns in lib/db.ts. Used for Telegram chat IDs and bot tokens.
//
// The key is read from the TELEGRAM_COLUMN_KEY Vercel env var (64 hex
// chars = 32 bytes). It is never written to the repo, never logged,
// and only used in this server-only file.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import "server-only";

const KEY_HEX = process.env.TELEGRAM_COLUMN_KEY;

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
      "TELEGRAM_COLUMN_KEY env var is not set or wrong length — must be 64 hex chars (32 bytes).",
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

export interface Sealed {
  ct: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

/** Encrypt a string with AES-256-GCM. Returns the ciphertext, the
 *  random 12-byte nonce, and the 16-byte auth tag. The nonce and tag
 *  are stored alongside the ciphertext so the same value can be
 *  decrypted later. */
export function seal(plain: string): Sealed {
  const key = getKey();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ct, nonce, tag };
}

/** Decrypt a sealed value. Throws on auth-tag mismatch (which means
 *  either the key is wrong or the row was tampered with). */
export function open(ct: Buffer, nonce: Buffer, tag: Buffer): string {
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}