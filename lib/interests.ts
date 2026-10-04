// lib/interests.ts — Server-side interest tracking for the ask bot.
//
// Goal: when a user asks questions about a topic repeatedly, surface
// new meeting docs that match those topics the next time they open
// the chat. We don't have auth, so the session is a random opaque ID
// stored in the visitor's localStorage. No PII, no email, no
// cross-site tracking.
//
// Storage: a single JSON file at ~/.hermes/cache/pembroke-interests.json
// (server-side, on the same Mac the cron runs on — but for the Vercel
// deployment, the data lives in /tmp inside the function container,
// which is ephemeral. That's fine for now: the feature is best-effort,
// and users who reload /ask will get re-interested automatically as
// they ask new questions).
//
// In production (Vercel), /tmp is wiped between function invocations.
// We accept that limitation — interests rebuild from session memory
// over time anyway. If we need persistence later, swap the storage
// layer for a Vercel KV / Redis / Postgres table.

import { promises as fs } from "node:fs";
import path from "node:path";
import { loadArchive } from "@/lib/archive";

export interface InterestVector {
  sessionId: string;
  committees: Record<string, number>; // committee name -> weight (0-1, decays)
  topics: Record<string, number>;     // lowercase keyword -> weight
  lastUpdated: number;                 // ms epoch
}

const STORAGE_PATH = path.join(
  process.env.HOME ?? "/tmp",
  ".hermes",
  "cache",
  "pembroke-interests.json",
);
// Fallback for Vercel: /tmp inside the function container.
const VERCEL_PATH = "/tmp/pembroke-interests.json";

function storagePath(): string {
  if (process.env.VERCEL) return VERCEL_PATH;
  return STORAGE_PATH;
}

async function loadAll(): Promise<Record<string, InterestVector>> {
  try {
    const p = storagePath();
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as Record<string, InterestVector>;
  } catch {
    return {};
  }
}

async function saveAll(all: Record<string, InterestVector>): Promise<void> {
  const p = storagePath();
  try {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(all, null, 2));
  } catch {
    // Best-effort. On Vercel this will fail silently; on Mac it works.
  }
}

const HALF_LIFE_DAYS = 14;
const MAX_INTERESTS = 50;

function decay(weight: number, daysSinceUpdate: number): number {
  return weight * Math.pow(0.5, daysSinceUpdate / HALF_LIFE_DAYS);
}

export async function recordInterest(
  sessionId: string,
  q: string,
  matchedCommittees: string[] = [],
  matchedKeywords: string[] = [],
): Promise<void> {
  if (!sessionId || !q) return;
  const all = await loadAll();
  const now = Date.now();
  const existing: InterestVector = all[sessionId] ?? {
    sessionId,
    committees: {},
    topics: {},
    lastUpdated: now,
  };
  const daysSince = (now - existing.lastUpdated) / (1000 * 60 * 60 * 24);
  // Decay existing weights, then add new ones.
  for (const k of Object.keys(existing.committees)) {
    existing.committees[k] = decay(existing.committees[k], daysSince);
  }
  for (const k of Object.keys(existing.topics)) {
    existing.topics[k] = decay(existing.topics[k], daysSince);
  }
  // Bump matched committees +1 (cap at 1.0).
  for (const c of matchedCommittees) {
    existing.committees[c] = Math.min(1, (existing.committees[c] ?? 0) + 0.5);
  }
  // Bump matched keywords +0.3 (lighter signal).
  for (const t of matchedKeywords) {
    const k = t.toLowerCase().trim();
    if (k.length >= 3) {
      existing.topics[k] = Math.min(1, (existing.topics[k] ?? 0) + 0.3);
    }
  }
  existing.lastUpdated = now;
  // Cap to MAX_INTERESTS top-weighted items each.
  const topN = (
    obj: Record<string, number>,
  ): Record<string, number> => {
    const sorted = Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_INTERESTS);
    return Object.fromEntries(sorted);
  };
  existing.committees = topN(existing.committees);
  existing.topics = topN(existing.topics);
  all[sessionId] = existing;
  await saveAll(all);
}

export interface ProactiveHit {
  guid: string;
  committee: string;
  meetingDate: string;
  title: string;
  url: string;
  score: number; // 0-1
}

export async function findProactiveHits(
  sessionId: string,
  sinceIsoDate: string | null = null,
  limit = 5,
): Promise<ProactiveHit[]> {
  if (!sessionId) return [];
  const all = await loadAll();
  const interests = all[sessionId];
  if (!interests) return [];
  const since = sinceIsoDate
    ? new Date(sinceIsoDate)
    : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // last 14d
  if (Number.isNaN(since.getTime())) return [];
  const archive = loadArchive();
  if (!archive) return [];
  const committeeWeights = interests.committees;
  const topicWeights = interests.topics;
  // No interests? Nothing to do.
  if (
    Object.keys(committeeWeights).length === 0 &&
    Object.keys(topicWeights).length === 0
  ) {
    return [];
  }
  const hits: ProactiveHit[] = [];
  for (const m of archive.months) {
    for (const e of m.entries) {
      const firstArchived = new Date(e.first_archived ?? 0);
      if (Number.isNaN(firstArchived.getTime())) continue;
      if (firstArchived < since) continue;
      // Score: committee match (heavy) + topic match (lighter).
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