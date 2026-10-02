// lib/db.ts — Vercel Postgres client + schema bootstrap.
//
// Schema:
//   profiles (
//       clerk_id      TEXT PRIMARY KEY  -- Clerk user ID
//       email         TEXT UNIQUE NOT NULL
//       categories    TEXT[] NOT NULL DEFAULT '{}'   -- selected category IDs
//       unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid()
//       created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
//       updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
//     )

import { sql } from "@vercel/postgres";
import { createHash, randomBytes } from "node:crypto";
import "server-only";

export type Profile = {
  clerk_id: string;
  email: string;
  categories: string[];
  unsubscribe_token: string;
  created_at: Date;
  updated_at: Date;
};

export async function ensureSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      clerk_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      categories TEXT[] NOT NULL DEFAULT '{}',
      unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export async function getProfile(clerkId: string): Promise<Profile | null> {
  await ensureSchema();
  const r = await sql<Profile>`
    SELECT clerk_id, email, categories, unsubscribe_token, created_at, updated_at
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
  const r = await sql<Profile>`
    INSERT INTO profiles (clerk_id, email, categories, updated_at)
    VALUES (${clerkId}, ${email}, ${categories as unknown as string}, now())
    ON CONFLICT (clerk_id) DO UPDATE
      SET email = EXCLUDED.email,
          categories = EXCLUDED.categories,
          updated_at = now()
    RETURNING clerk_id, email, categories, unsubscribe_token, created_at, updated_at
  `;
  return r.rows[0];
}

export async function findSubscribersByTag(tags: string[]): Promise<Profile[]> {
  await ensureSchema();
  // Postgres array overlap: `categories && tags`
  const r = await sql<Profile>`
    SELECT clerk_id, email, categories, unsubscribe_token, created_at, updated_at
      FROM profiles
      WHERE categories && ${tags as unknown as string}
  `;
  return r.rows;
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