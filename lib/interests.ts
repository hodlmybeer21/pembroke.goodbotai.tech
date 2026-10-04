// lib/interests.ts — Server-side interest tracking for the ask bot.
//
// Goal: when a user asks questions about a topic repeatedly, surface
// new meeting docs that match those topics the next time they open
// the chat. We don't have auth, so the session is a random opaque ID
// stored in the visitor's localStorage. No PII, no email, no
// cross-site tracking.
//
// Storage: Vercel Postgres (table ask_interests) on production. Falls
// back to a file at ~/.hermes/cache/pembroke-interests.json for local
// dev so the dev loop works without a database.

import { promises as fs } from "node:fs";
import path from "node:path";
import { sql } from "@vercel/postgres";
import { loadArchive } from "@/lib/archive";
import { ensureSchema } from "@/lib/db";

export interface InterestVector {
  sessionId: string;
  committees: Record<string, number>;
  topics: Record<string, number>;
  lastUpdated: number;
}

const HALF_LIFE_DAYS = 14;
const MAX_INTERESTS = 50;

function decay(weight: number, daysSinceUpdate: number): number {
  return weight * Math.pow(0.5, daysSinceUpdate / HALF_LIFE_DAYS);
}

function topN(obj: Record<string, number>): Record<string, number> {
  const sorted = Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_INTERESTS);
  return Object.fromEntries(sorted);
}

function hasPostgres(): boolean {
  return Boolean(process.env.POSTGRES_URL) || Boolean(process.env.VERCEL);
}

// ---------- Postgres-backed implementation ----------

async function recordInterestPg(
  sessionId: string,
  matchedCommittees: string[],
  matchedKeywords: string[],
): Promise<void> {
  await ensureSchema();
  const existing = await sql<{
    committees: Record<string, number>;
    topics: Record<string, number>;
    last_updated: Date;
  }>`
    SELECT committees, topics, last_updated
      FROM ask_interests
     WHERE session_id = ${sessionId}
  `;
  const now = new Date();
  const lastUpdated = existing.rows[0]?.last_updated ?? now;
  const daysSince =
    (now.getTime() - new Date(lastUpdated).getTime()) /
    (1000 * 60 * 60 * 24);
  let committees: Record<string, number> =
    (existing.rows[0]?.committees as Record<string, number>) ?? {};
  let topics: Record<string, number> =
    (existing.rows[0]?.topics as Record<string, number>) ?? {};
  // Decay existing weights.
  for (const k of Object.keys(committees)) {
    committees[k] = decay(committees[k], daysSince);
  }
  for (const k of Object.keys(topics)) {
    topics[k] = decay(topics[k], daysSince);
  }
  // Bump matched committees +0.5.
  for (const c of matchedCommittees) {
    committees[c] = Math.min(1, (committees[c] ?? 0) + 0.5);
  }
  // Bump matched keywords +0.3.
  for (const t of matchedKeywords) {
    const k = t.toLowerCase().trim();
    if (k.length >= 3) {
      topics[k] = Math.min(1, (topics[k] ?? 0) + 0.3);
    }
  }
  committees = topN(committees);
  topics = topN(topics);
  await sql`
    INSERT INTO ask_interests (session_id, committees, topics, last_updated)
    VALUES (
      ${sessionId},
      ${JSON.stringify(committees)}::jsonb,
      ${JSON.stringify(topics)}::jsonb,
      now()
    )
    ON CONFLICT (session_id) DO UPDATE
      SET committees = EXCLUDED.committees,
          topics = EXCLUDED.topics,
          last_updated = now()
  `;
}

async function findProactiveHitsPg(
  sessionId: string,
  since: Date,
  limit: number,
): Promise<ProactiveHit[]> {
  const r = await sql<{
    committees: Record<string, number>;
    topics: Record<string, number>;
  }>`
    SELECT committees, topics
      FROM ask_interests
     WHERE session_id = ${sessionId}
  `;
  if (r.rows.length === 0) return [];
  const committeeWeights = (r.rows[0].committees as Record<string, number>) ?? {};
  const topicWeights = (r.rows[0].topics as Record<string, number>) ?? {};
  if (
    Object.keys(committeeWeights).length === 0 &&
    Object.keys(topicWeights).length === 0
  ) {
    return [];
  }
  return scoreArchive(
    {
      sessionId,
      committees: committeeWeights,
      topics: topicWeights,
      lastUpdated: 0,
    },
    since,
    limit,
  );
}

// ---------- File-backed fallback (local dev without POSTGRES_URL) ----------

const FILE_PATH = path.join(
  process.env.HOME ?? "/tmp",
  ".hermes",
  "cache",
  "pembroke-interests.json",
);

async function loadAllFile(): Promise<Record<string, InterestVector>> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, InterestVector>;
  } catch {
    return {};
  }
}

async function saveAllFile(all: Record<string, InterestVector>): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(all, null, 2));
  } catch {
    // ignore
  }
}

async function recordInterestFile(
  sessionId: string,
  matchedCommittees: string[],
  matchedKeywords: string[],
): Promise<void> {
  const all = await loadAllFile();
  const now = Date.now();
  const existing: InterestVector = all[sessionId] ?? {
    sessionId,
    committees: {},
    topics: {},
    lastUpdated: now,
  };
  const daysSince = (now - existing.lastUpdated) / (1000 * 60 * 60 * 24);
  for (const k of Object.keys(existing.committees)) {
    existing.committees[k] = decay(existing.committees[k], daysSince);
  }
  for (const k of Object.keys(existing.topics)) {
    existing.topics[k] = decay(existing.topics[k], daysSince);
  }
  for (const c of matchedCommittees) {
    existing.committees[c] = Math.min(1, (existing.committees[c] ?? 0) + 0.5);
  }
  for (const t of matchedKeywords) {
    const k = t.toLowerCase().trim();
    if (k.length >= 3) {
      existing.topics[k] = Math.min(1, (existing.topics[k] ?? 0) + 0.3);
    }
  }
  existing.lastUpdated = now;
  existing.committees = topN(existing.committees);
  existing.topics = topN(existing.topics);
  all[sessionId] = existing;
  await saveAllFile(all);
}

async function findProactiveHitsFile(
  sessionId: string,
  since: Date,
  limit: number,
): Promise<ProactiveHit[]> {
  const all = await loadAllFile();
  const interests = all[sessionId];
  if (!interests) return [];
  if (
    Object.keys(interests.committees).length === 0 &&
    Object.keys(interests.topics).length === 0
  ) {
    return [];
  }
  return scoreArchive(interests, since, limit);
}

// ---------- Shared archive scanner ----------

export interface ProactiveHit {
  guid: string;
  committee: string;
  meetingDate: string;
  title: string;
  url: string;
  score: number;
}

function scoreArchive(
  interests: InterestVector,
  since: Date,
  limit: number,
): ProactiveHit[] {
  const archive = loadArchive();
  if (!archive) return [];
  const committeeWeights = interests.committees;
  const topicWeights = interests.topics;
  const hits: ProactiveHit[] = [];
  for (const m of archive.months) {
    for (const e of m.entries) {
      const firstArchived = new Date(e.first_archived ?? 0);
      if (Number.isNaN(firstArchived.getTime())) continue;
      if (firstArchived < since) continue;
      const committeeScore = committeeWeights[e.committee] ?? 0;
      const text = `${e.title ?? ""} ${e.summary ?? ""}`.toLowerCase();
      let topicScore = 0;
      for (const [topic, weight] of Object.entries(topicWeights)) {
        if (text.includes(topic)) {
          topicScore = Math.max(topicScore, weight);
        }
      }
      const score = Math.max(committeeScore, topicScore * 0.7);
      if (score > 0.15) {
        hits.push({
          guid: e.guid,
          committee: e.committee,
          meetingDate: e.meeting_date,
          title: e.title,
          url: e.url,
          score,
        });
      }
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

// ---------- Public API ----------

export async function recordInterest(
  sessionId: string,
  q: string,
  matchedCommittees: string[] = [],
  matchedKeywords: string[] = [],
): Promise<void> {
  if (!sessionId || !q) return;
  try {
    if (hasPostgres()) {
      await recordInterestPg(sessionId, matchedCommittees, matchedKeywords);
    } else {
      await recordInterestFile(sessionId, matchedCommittees, matchedKeywords);
    }
  } catch (ex) {
    // Interests are best-effort; never throw.
    console.error("recordInterest failed:", ex);
  }
}

export async function findProactiveHits(
  sessionId: string,
  sinceIsoDate: string | null = null,
  limit = 5,
): Promise<ProactiveHit[]> {
  if (!sessionId) return [];
  const since = sinceIsoDate
    ? new Date(sinceIsoDate)
    : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(since.getTime())) return [];
  try {
    if (hasPostgres()) {
      return await findProactiveHitsPg(sessionId, since, limit);
    }
    return await findProactiveHitsFile(sessionId, since, limit);
  } catch (ex) {
    console.error("findProactiveHits failed:", ex);
    return [];
  }
}