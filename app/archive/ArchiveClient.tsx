"use client";

// app/archive/ArchiveClient.tsx — client-side live filtering on top of the
// server-rendered archive page. As the user types in the search box or
// changes the committee dropdown, the visible cards filter in real time
// without a page reload.

import { useMemo, useState } from "react";
import Link from "next/link";

interface ArchiveEntry {
  guid: string;
  committee: string;
  doc_type: string;
  meeting_date: string;
  title: string;
  url: string;
  summary: string;
  first_archived: string;
}

interface ArchiveMonth {
  month: string;
  label: string;
  count: number;
  entries: ArchiveEntry[];
}

interface ArchiveIndex {
  generated_at: string;
  count: number;
  committees: string[];
  months: ArchiveMonth[];
}

export function ArchiveClient({
  archive,
  initialCommittee,
  initialQuery,
}: {
  archive: ArchiveIndex;
  initialCommittee?: string;
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery ?? "");
  const [committee, setCommittee] = useState(initialCommittee ?? "");

  // Pre-build a flat list of (entry, monthLabel) tuples for fast filtering.
  const flat = useMemo(() => {
    const out: { entry: ArchiveEntry; monthLabel: string }[] = [];
    for (const m of archive.months) {
      for (const e of m.entries) {
        out.push({ entry: e, monthLabel: m.label });
      }
    }
    return out;
  }, [archive]);

  const filtered = useMemo(() => {
    const qLow = q.toLowerCase().trim();
    return flat.filter(({ entry }) => {
      if (committee && entry.committee !== committee) return false;
      if (qLow) {
        const hay = `${entry.title} ${entry.committee} ${entry.summary} ${entry.meeting_date} ${entry.doc_type}`.toLowerCase();
        if (!hay.includes(qLow)) return false;
      }
      return true;
    });
  }, [flat, q, committee]);

  // Group filtered results by month.
  const byMonth = useMemo(() => {
    const m = new Map<string, { label: string; entries: ArchiveEntry[] }>();
    for (const { entry, monthLabel } of filtered) {
      if (!m.has(entry.meeting_date.slice(0, 7))) {
        m.set(entry.meeting_date.slice(0, 7), { label: monthLabel, entries: [] });
      }
      m.get(entry.meeting_date.slice(0, 7))!.entries.push(entry);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <>
      {/* Filters — live */}
      <div className="mb-8 flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search summaries…"
          aria-label="Search summaries"
          className="flex-1 px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
        />
        <select
          value={committee}
          onChange={(e) => setCommittee(e.target.value)}
          aria-label="Filter by committee"
          className="px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
        >
          <option value="">All committees</option>
          {archive.committees.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(q || committee) && (
          <button
            type="button"
            onClick={() => { setQ(""); setCommittee(""); }}
            className="px-4 py-2 border border-stone-300 rounded-md text-sm text-stone-700 hover:bg-stone-50"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-stone-500 mb-4">
        Showing {filtered.length} of {archive.count} record{archive.count === 1 ? "" : "s"}
        {(q || committee) && " (filtered)"}.
      </p>

      {filtered.length === 0 ? (
        <p className="text-stone-500">No summaries match your filter.</p>
      ) : (
        <div className="space-y-10">
          {byMonth.map(([ymKey, { label, entries }]) => (
            <section key={ymKey}>
              <h2 className="font-serif text-sm text-stone-500 uppercase tracking-wider pb-2 mb-4 border-b border-stone-200 flex items-baseline justify-between">
                <span>{label}</span>
                <span className="text-xs">{entries.length} record{entries.length === 1 ? "" : "s"}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {entries.map((e) => (
                  <li key={e.guid} className="surface p-4">
                    <div className="flex items-baseline gap-2 text-xs text-stone-500">
                      <time>{e.meeting_date}</time>
                      <span className="font-medium text-stone-700">{e.committee}</span>
                      <span className="tag-pill ml-auto">{e.doc_type}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-stone-900">{e.title}</div>
                    <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                      {highlight(e.summary, q)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <a className="text-brand-700 underline" href={e.url}>
                        Read PDF →
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-stone-500 mt-12 pt-6 border-t border-stone-200">
        Archive generated {new Date(archive.generated_at).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}{" "}
        from the town's own PDF documents.
      </p>
    </>
  );
}

/** Highlight the search query in the summary text so the user can see
 *  why each card matched. Case-insensitive. */
function highlight(text: string, q: string) {
  const trimmed = text.length > 320 ? text.slice(0, 319).trimEnd() + "…" : text;
  if (!q || !q.trim()) return trimmed;
  const qLow = q.toLowerCase();
  const lower = trimmed.toLowerCase();
  const idx = lower.indexOf(qLow);
  if (idx < 0) return trimmed;
  return (
    <>
      {trimmed.slice(0, idx)}
      <mark className="bg-amber-100 text-stone-900 px-0.5 rounded-sm">
        {trimmed.slice(idx, idx + q.length)}
      </mark>
      {trimmed.slice(idx + q.length)}
    </>
  );
}