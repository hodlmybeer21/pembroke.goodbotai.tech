// lib/archive-search.ts — full-text search across the meeting minutes.
//
// WHY THIS EXISTS
// ---------------
// The site had 593 documents of meeting minutes with OCR text - about
// 2.1 million characters - sitting in data/archive.jsonl, and none of
// it was reachable. The archive page's search box only matched the
// title, committee, summary, date and doc type, so a resident asking
// "has the board ever discussed my street" got nothing back even
// though the answer was almost certainly in the minutes.
//
// The text is the record. This makes it searchable.
//
// HOW IT WORKS
// ------------
// AND semantics across tokens: every word has to appear somewhere in
// the document, which keeps precision high. Ranking favours title and
// summary hits over a mention buried in the middle of page 40. Each
// result carries a snippet of the passage that actually matched,
// because "here is a document that mentions it" is much weaker than
// "here is what they said".
//
// Street abbreviations are folded together on both sides. The minutes
// write "412 Elm St", and a resident types "Elm Street"; without this
// the search returns nothing for the exact thing they are looking for.
//
// The OCR text is imperfect, and searching it means a scan that
// mangled a street name will not be found. The UI says so rather than
// letting a resident conclude the town never discussed it.

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  canonToken,
  normalizeWords,
  spellings,
} from "@/lib/archive-search-tokens";

export interface SearchDoc {
  guid: string;
  committee: string;
  doc_type: string;
  meeting_date: string;
  title: string;
  url: string | null;
  summary: string | null;
  ocr_text: string | null;
}

export interface SearchHit {
  guid: string;
  committee: string;
  doc_type: string;
  meeting_date: string;
  title: string;
  url: string | null;
  summary: string | null;
  snippet: string;
  score: number;
  title_hit: boolean;
  text_hits: number;
  /** The exact query string appears in the document. */
  phrase_hit: boolean;
}

const TITLE_WEIGHT = 8;
const SUMMARY_WEIGHT = 3;
const TEXT_WEIGHT = 1;
/**
 * A document containing the exact phrase outranks one that contains the
 * same words apart. This is large on purpose: "Route 3" and "Route
 * 106" are different roads, and a document that says "Route 3" is a
 * better answer to "Route 3" than one that says "Route" somewhere and
 * "3" somewhere else.
 */
const PHRASE_BONUS = 60;
const SNIPPET_CHARS = 300;

let docs: SearchDoc[] | null = null;

/** Lowercase, strip punctuation, collapse whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9$%./'"-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadDocs(): SearchDoc[] {
  if (docs) return docs;
  docs = [];
  try {
    const p = join(process.cwd(), "data", "archive.jsonl");
    if (!existsSync(p)) return docs;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        docs.push(JSON.parse(t) as SearchDoc);
      } catch {
        // one bad line should not take the whole search down
      }
    }
  } catch {
    // leave docs empty; the UI says so
  }
  return docs;
}

const STOP = new Set([
  "the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "at",
  "by", "is", "was", "were", "be", "been", "with", "that", "this", "it",
  "as", "from", "has", "have", "had", "do", "does", "did", "not", "no",
]);

/**
 * Split a query into terms.
 *
 * Numbers are kept however short they are: "Route 3" has to search for
 * the 3, and the 3 is the whole difference between two different roads.
 * Single characters are kept only when they are numeric - a bare "a" is
 * a word, not a term.
 */
function tokenize(q: string): string[] {
  return normalize(q)
    .split(" ")
    .map(canonToken)
    .filter((w) => {
      if (!w) return false;
      if (STOP.has(w)) return false;
      if (w.length > 1) return true;
      return isNumeric(w);
    });
}

function isNumeric(w: string): boolean {
  return /^[0-9]+$/.test(w);
}

/**
 * Count whole-word occurrences.
 *
 * Substring counting is what made "route" match inside "router" and
 * "3" match inside "103". A match has to start and end on a word
 * boundary to count.
 */
function countOf(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) {
    const before = i === 0 ? "" : hay[i - 1];
    const afterIdx = i + needle.length;
    const after = afterIdx >= hay.length ? "" : hay[afterIdx];
    const leftOk = before === "" || !/[a-z0-9]/.test(before);
    const rightOk = after === "" || !/[a-z0-9]/.test(after);
    if (leftOk && rightOk) n++;
    i += needle.length;
  }
  return n;
}

/** Index of the first whole-word occurrence, or -1. */
function findWord(hay: string, needle: string): number {
  if (!needle) return -1;
  let i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) {
    const before = i === 0 ? "" : hay[i - 1];
    const afterIdx = i + needle.length;
    const after = afterIdx >= hay.length ? "" : hay[afterIdx];
    const leftOk = before === "" || !/[a-z0-9]/.test(before);
    const rightOk = after === "" || !/[a-z0-9]/.test(after);
    if (leftOk && rightOk) return i;
    i += needle.length;
  }
  return -1;
}

/** Count whole-word occurrences of a multi-word phrase. */
function countPhrase(hay: string, phrase: string): number {
  if (!phrase) return 0;
  let n = 0;
  let i = 0;
  while ((i = hay.indexOf(phrase, i)) !== -1) {
    const before = i === 0 ? "" : hay[i - 1];
    const afterIdx = i + phrase.length;
    const after = afterIdx >= hay.length ? "" : hay[afterIdx];
    const leftOk = before === "" || !/[a-z0-9]/.test(before);
    const rightOk = after === "" || !/[a-z0-9]/.test(after);
    if (leftOk && rightOk) n++;
    i += phrase.length;
  }
  return n;
}

/**
 * A readable slice of the original text around the first match.
 * The snippet comes from the untouched text, so it reads the way the
 * document does - "412 Elm St", not "412 Elm Street".
 */
function snippet(text: string, tokens: string[], phrase: string, phraseRaw: string): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ");
  const low = flat.toLowerCase();

  let at = -1;
  if (phraseRaw.length > 3) at = findWord(low, phraseRaw);
  if (at === -1) {
    for (const t of tokens) {
      for (const v of spellings(t)) {
        at = findWord(low, v);
        if (at !== -1) break;
      }
      if (at !== -1) break;
    }
  }
  if (at === -1) {
    return flat.slice(0, SNIPPET_CHARS).trim() + (flat.length > SNIPPET_CHARS ? "…" : "");
  }
  const start = Math.max(0, at - Math.floor(SNIPPET_CHARS / 3));
  const end = Math.min(flat.length, start + SNIPPET_CHARS);
  let out = flat.slice(start, end).trim();
  if (start > 0) out = "…" + out;
  if (end < flat.length) out = out + "…";
  return out;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  query: string;
  tokens: string[];
  documents_searched: number;
  documents_with_text: number;
}

export function searchArchive(query: string, limit = 25): SearchResult {
  const all = loadDocs();
  const tokens = tokenize(query);
  const phrase = normalizeWords(normalize(query));
  // The phrase as it was typed, for finding it in the untouched text.
  const phraseRaw = normalize(query);

  const base: SearchResult = {
    hits: [],
    total: 0,
    query,
    tokens,
    documents_searched: all.length,
    documents_with_text: all.filter((d) => d.ocr_text).length,
  };

  if (!tokens.length) return base;

  const scored: SearchHit[] = [];

  for (const d of all) {
    // The document side is folded exactly the way the query side is.
    // This is the fix: the query was stemmed and the text was not, so
    // "services" could not match a document that said "services" and
    // those documents were excluded from the results entirely.
    const title = normalizeWords(normalize(d.title || ""));
    const summary = normalizeWords(normalize(d.summary || ""));
    const body = d.ocr_text ? normalizeWords(normalize(d.ocr_text)) : "";

    let score = 0;
    let titleHit = 0;
    let bodyHits = 0;
    let allPresent = true;

    for (const t of tokens) {
      const inTitle = countOf(title, t);
      const inSummary = countOf(summary, t);
      const inBody = countOf(body, t);
      if (!inTitle && !inSummary && !inBody) {
        allPresent = false;
        break;
      }
      titleHit += inTitle;
      score += inTitle * TITLE_WEIGHT + inSummary * SUMMARY_WEIGHT + inBody * TEXT_WEIGHT;
      bodyHits += inBody;
    }

    if (!allPresent) continue;

    // The exact phrase, together, beats the same words scattered.
    // A three-character phrase is still a phrase: "tax" is the folded
    // form of "taxes" and deserves the same exact-phrase boost the
    // longer ones get.
    const phraseHits =
      phrase.length >= 3 ? countPhrase(body, phrase) + countPhrase(title, phrase) : 0;
    if (phraseHits > 0) score += PHRASE_BONUS * Math.min(phraseHits, 3);

    scored.push({
      guid: d.guid,
      committee: d.committee,
      doc_type: d.doc_type,
      meeting_date: d.meeting_date,
      title: d.title,
      url: d.url,
      summary: d.summary,
      snippet: snippet(d.ocr_text || d.summary || "", tokens, phrase, phraseRaw),
      score,
      title_hit: titleHit > 0,
      text_hits: bodyHits,
      phrase_hit: phraseHits > 0,
    });
  }

  scored.sort(
    (a, b) => b.score - a.score || (b.meeting_date || "").localeCompare(a.meeting_date || "")
  );

  return { ...base, hits: scored.slice(0, limit), total: scored.length };
}
