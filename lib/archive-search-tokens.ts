// lib/archive-search-tokens.ts — the shared word rules for the minutes
// search.
//
// WHY THIS IS A SEPARATE FILE
// ---------------------------
// The query side and the document side have to be normalised the SAME
// way, or they do not meet.
//
// The bug this fixes: the query was stemmed ("services" became
// "servic") but the document text was not. The matcher had moved to
// whole-word matching, so "servic" could not match a document that
// said "services" - the match was not merely fuzzy, it was impossible.
// And because the search is AND across tokens, those documents were
// excluded from the results entirely. A search for "services" returned
// nothing at all.
//
// So both sides go through the same two rules, in the same order:
//
//   1. Fold abbreviations. The minutes write "412 Elm St"; a resident
//      types "Elm Street". "st" and "street" are the same word.
//   2. Fold plurals. "services" and "service" are the same word.
//
// This module is client-safe so the browser can use the same rules to
// highlight the words it is highlighting. lib/archive-search.ts, which
// reads the corpus off disk, is not.

// The minutes abbreviate and residents do not.
export const ABBREVIATIONS: Record<string, string[]> = {
  street: ["street", "st"],
  road: ["road", "rd"],
  drive: ["drive", "dr"],
  lane: ["lane", "ln"],
  avenue: ["avenue", "ave", "av"],
  boulevard: ["boulevard", "blvd"],
  circle: ["circle", "cir"],
  court: ["court", "ct"],
  place: ["place", "pl"],
  terrace: ["terrace", "ter"],
  highway: ["highway", "hwy"],
  route: ["route", "rte", "rt"],
  square: ["square", "sq"],
  trail: ["trail", "trl"],
  parkway: ["parkway", "pkwy"],
};

export const ABBR_TO_CANON: Record<string, string> = {};
for (const [canon, list] of Object.entries(ABBREVIATIONS)) {
  for (const v of list) ABBR_TO_CANON[v] = canon;
}

/**
 * Fold a word to its singular form.
 *
 * The rules are ordered so that the -s and -es forms of the same word
 * always land on the same stem. That is the whole point: "services"
 * and "service" have to become the same thing, and "taxes" and "tax"
 * have to become the same thing.
 *
 *   -ies -> -y    properties -> property
 *   -sses -> -s   classes    -> class
 *   -xes/-ches/-shes -> -e
 *                  taxes      -> tax, patches -> patch, bushes -> bush
 *   -es -> -      services   -> service, notices -> notice, votes -> vote
 *   -s ->         sidewalks  -> sidewalk, meetings -> meeting
 */
export function stem(w: string): string {
  if (w.length < 4) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (w.endsWith("xes") || w.endsWith("ches") || w.endsWith("shes")) return w.slice(0, -2);
  if (w.endsWith("es")) return w.slice(0, -1);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** The canonical form of one word: abbreviation first, then plural. */
export function canonToken(w: string): string {
  const abbr = ABBR_TO_CANON[w];
  if (abbr) return abbr;
  return stem(w);
}

/**
 * Normalise a block of text: every word folded the same way the query
 * words are folded. This is applied to the document text as well as to
 * the query, which is what makes the two sides meet.
 */
export function normalizeWords(s: string): string {
  return s.replace(/[a-z0-9]+/g, (w) => canonToken(w));
}

/**
 * The original spellings a folded word might appear as in the source
 * text. Used for the snippet and for the browser's highlighting, both
 * of which work on the untouched document rather than the folded copy.
 */
export function spellings(t: string): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    if (s && s.length > 1) out.add(s);
  };
  for (const v of ABBREVIATIONS[t] ?? [t]) add(v);
  add(t);
  add(t + "s");
  add(t + "es");
  if (t.endsWith("y")) add(t.slice(0, -1) + "ies");
  if (t.endsWith("s")) add(t.slice(0, -1));
  return Array.from(out);
}

/** Every word worth highlighting, for a set of folded query tokens. */
export function highlightTerms(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) for (const v of spellings(t)) out.add(v);
  return Array.from(out);
}
