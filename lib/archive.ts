// lib/archive.ts — Load and search the meeting-summary archive.
//
// The archive lives in data/archive-index.json (regenerated daily by
// pembroke_archive_export.py). Each entry is one OCR'd agenda or minutes
// document, with committee, meeting date, summary text, and the PDF URL.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import "server-only";

export interface ArchiveEntry {
  guid: string;
  committee: string;
  doc_type: string;
  meeting_date: string;
  title: string;
  url: string;
  summary: string;
  first_archived: string;
}

export interface ArchiveMonth {
  month: string;
  label: string;
  count: number;
  entries: ArchiveEntry[];
}

export interface ArchiveIndex {
  generated_at: string;
  count: number;
  committees: string[];
  months: ArchiveMonth[];
}

export function loadArchive(): ArchiveIndex | null {
  try {
    const p = join(process.cwd(), "data", "archive-index.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as ArchiveIndex;
  } catch {
    return null;
  }
}

/**
 * Pick the archive entries most relevant to a question.
 *
 * Strategy:
 *   1. If the question names a committee, filter to that committee's
 *      entries (so "What did Planning Board decide?" only sees Planning
 *      Board summaries).
 *   2. Otherwise score all entries by how many question words appear
 *      in the summary or committee name.
 *   3. Return the top N entries, most-recent first, capped to a sane
 *      LLM-context size.
 */
export function selectArchiveEntries(
  q: string,
  archive: ArchiveIndex,
  maxEntries: number = 4,
  maxChars: number = 4000,
): ArchiveEntry[] {
  const qLow = q.toLowerCase();

  // Flatten all entries (newest first — archive is already sorted desc by
  // meeting_date).
  const all: ArchiveEntry[] = [];
  for (const m of archive.months) {
    for (const e of m.entries) all.push(e);
  }
  if (all.length === 0) return [];

  // If the question names a committee, narrow to that committee.
  const committeeFilter = findNamedCommittee(qLow, archive.committees);
  let candidates = committeeFilter
    ? all.filter((e) => e.committee === committeeFilter)
    : all;

  // Score each candidate by question-word overlap with the summary.
  const qWords = qLow.split(/\W+/).filter((w) => w.length >= 3);
  const scored = candidates.map((e) => {
    const hay = `${e.committee} ${e.title} ${e.summary}`.toLowerCase();
    let score = 0;
    for (const w of qWords) {
      if (hay.includes(w)) score++;
    }
    // Boost recent entries slightly (more useful for "what happened" Qs).
    score += 0.01;
    return { entry: e, score };
  });

  // Sort by score desc, then meeting_date desc.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return _dateRank(b.entry.meeting_date) - _dateRank(a.entry.meeting_date);
  });

  // Take top N, but stop if we'd exceed the char cap.
  const out: ArchiveEntry[] = [];
  let totalChars = 0;
  for (const s of scored) {
    if (out.length >= maxEntries) break;
    if (totalChars + s.entry.summary.length > maxChars && out.length > 0) break;
    out.push(s.entry);
    totalChars += s.entry.summary.length;
  }
  return out;
}

function _dateRank(s: string): number {
  // meeting_date is like "Sep 15, 2026" — convert to a sortable number.
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
  } catch {}
  return 0;
}

function findNamedCommittee(qLow: string, known: string[]): string | null {
  // Pick the longest match — avoid "Board" matching before "Planning Board".
  let best: { name: string; len: number } | null = null;
  for (const name of known) {
    const low = name.toLowerCase();
    if (qLow.includes(low) && (!best || low.length > best.len)) {
      best = { name, len: low.length };
    }
  }
  return best?.name ?? null;
}

/**
 * Is this a "what happened / what did they decide / last meeting" style
 * question that should be routed to the archive?
 */
export function isPastMeetingQuestion(q: string): boolean {
  const qLow = q.toLowerCase();
  return /(what happened|what did (they|the).*(do|decide|vote|approve|pass)|last meeting|recent meeting|previous meeting|past meeting|meeting minutes|meeting summary|recap|wrap.?up|what was discussed|what was the last|what was the most recent|what was the previous|what('?s| was) the last|what('?s| was) the most recent|summary of|recap of|tell me about (the )?(last|most recent|recent|previous)|give me a (recap|summary)|what('?s| is) (happening|happened)|what('?s| is) (new|coming up)|did (the |they )?(board|select|planning|budget|committee|commission|council)( .*)?(approve|vote|pass|deny|reject|decide|adopt|fund|reject|sign)|did (they|the board|the select board|the planning board|the budget committee|the conservation commission) (vote|approve|pass|deny|decide|adopt|fund|sign|reject|amend)|was (the |it |that |a )?(board|select|planning|budget|committee|commission|council|it|that|measure|budget|ordinance|proposal|project|truck|road|building)( .*)?(approved|voted|passed|denied|rejected|decided|adopted|funded|rejected)|have (they|the board) (decided|approved|voted|funded|passed|denied)|when (did|was) (the |it |that |a )?(board|select|planning|budget|committee|commission|council|budget|measure|ordinance|proposal|project|truck|road|building)( .*)?(approve|vote|pass|deny|decide|adopt|fund|sign)|when (was|did) (the )?(last|most recent|previous) (vote|meeting|decision|hearing))/i.test(
    qLow,
  );
}