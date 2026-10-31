"use client";

// components/MinutesSearch.tsx — search the actual meeting minutes.
//
// The archive page could browse by month and committee, but the words
// inside the documents were not searchable. 593 documents, about 2.1
// million characters of minutes, and no way to ask "did they ever
// discuss my street".
//
// The search runs on the server (app/api/search/route.ts) because the
// text is far too heavy to ship to a phone.

import { useCallback, useEffect, useRef, useState } from "react";
import { highlightTerms } from "@/lib/archive-search-tokens";

interface Hit {
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
  phrase_hit: boolean;
}

interface Result {
  hits: Hit[];
  total: number;
  query: string;
  tokens: string[];
  documents_searched: number;
  documents_with_text: number;
}

// The same rules the search itself uses, so the highlighted words are
// the words that were actually searched for - including the plural
// forms, because the search folds them.
function highlight(text: string, tokens: string[]) {
  if (!tokens.length) return text;
  const list = highlightTerms(tokens)
    .filter((w) => w.length > 1)
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!list.length) return text;
  const rx = new RegExp(`\\b(${list.join("|")})`, "gi");
  // split() with one capture group puts the captured text at the odd
  // indices, so the match test is the index, not a second regex run.
  const parts = text.split(rx);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-amber-200 px-0.5 text-stone-900">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function fmtDate(d: string) {
  if (!d) return "";
  const t = new Date(`${d.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(t.getTime())) return d;
  return t.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

export function MinutesSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const run = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setResult(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=25`);
      if (!r.ok) throw new Error(`search failed (${r.status})`);
      setResult((await r.json()) as Result);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce so typing does not fire a request per keystroke, and keep
  // the address bar in step so a search can be shared.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (first.current) {
      first.current = false;
      if (!initialQuery) return;
    }
    timer.current = setTimeout(() => {
      run(q);
      const url = q.trim()
        ? `/search?q=${encodeURIComponent(q.trim())}`
        : "/search";
      window.history.replaceState(null, "", url);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, initialQuery, run]);

  return (
    <div>
      <label className="block">
        <span className="sr-only">Search the meeting minutes</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the minutes — a street, a topic, a name…"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      {loading && (
        <p className="mt-3 text-sm text-stone-500">Searching…</p>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          The search could not run: {error}
        </p>
      )}

      {!loading && !error && result && result.tokens.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-stone-600">
            <strong className="text-stone-900">{result.total}</strong>{" "}
            {result.total === 1 ? "document" : "documents"} mention{" "}
            <strong className="text-stone-900">{result.query}</strong>
            {result.total > result.hits.length && (
              <> — showing the {result.hits.length} strongest</>
            )}
            .
          </p>

          {result.hits.length === 0 ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <p>
                Nothing came back for that. The minutes before 2018 are scans
                read by OCR, so a name or a street spelled unusually can be
                missed. Try a shorter word — a street name on its own, or a
                single topic.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {result.hits.map((h) => (
                <li
                  key={h.guid}
                  className="rounded-lg border border-stone-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-xs font-medium text-stone-500">
                      {fmtDate(h.meeting_date)}
                    </span>
                    <span className="text-xs font-medium text-brand-700">
                      {h.committee}
                    </span>
                    {h.phrase_hit ? (
                      <span className="text-xs text-medium text-green-700">
                        exact phrase
                      </span>
                    ) : !h.title_hit ? (
                      <span className="text-xs text-stone-400">
                        (mentioned in the text)
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-medium text-stone-900">{h.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
                    {highlight(h.snippet, result.tokens)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {h.url && (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 underline underline-offset-2"
                      >
                        Open the document
                      </a>
                    )}
                    <a
                      href={`/archive?q=${encodeURIComponent(h.guid)}`}
                      className="text-stone-500 underline underline-offset-2"
                    >
                      In the archive
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!result && !loading && (
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Searches the text of every published minute, not just the titles.
          Try a street name, a topic like{" "}
          <em>snow removal</em> or <em>sewer</em>, or a person&apos;s name.
        </p>
      )}
    </div>
  );
}
