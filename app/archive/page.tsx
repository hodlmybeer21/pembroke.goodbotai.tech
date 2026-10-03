// app/archive/page.tsx — browseable archive of every meeting summary ever
// OCR'd. Server-rendered from data/archive-index.json (regenerated daily by
// pembroke_archive_export.py on Tyler's Mac).

import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const revalidate = 3600;

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

function loadArchive(): ArchiveIndex | null {
  try {
    const p = join(process.cwd(), "data", "archive-index.json");
    return JSON.parse(readFileSync(p, "utf-8")) as ArchiveIndex;
  } catch {
    return null;
  }
}

export default async function ArchivePage({ searchParams }: { searchParams: { committee?: string; q?: string } }) {
  const archive = loadArchive();
  const filterCommittee = searchParams.committee;
  const filterQuery = (searchParams.q ?? "").trim().toLowerCase();

  if (!archive || archive.count === 0) {
    return (
      <div className="container-page">
        <header className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
            Archive
          </h1>
          <p className="text-stone-600 mt-2">
            Past meeting summaries, agendas, and minutes.
          </p>
        </header>
        <p className="text-stone-500">
          No meeting summaries have been archived yet. The daily brief pipeline
          fills this in as new documents are posted to the town agenda center.
        </p>
      </div>
    );
  }

  // Apply filters.
  const filteredMonths = archive.months
    .map((m) => ({
      ...m,
      entries: m.entries.filter((e) => {
        if (filterCommittee && e.committee !== filterCommittee) return false;
        if (filterQuery) {
          const hay = `${e.title} ${e.committee} ${e.summary} ${e.meeting_date}`.toLowerCase();
          if (!hay.includes(filterQuery)) return false;
        }
        return true;
      }),
    }))
    .filter((m) => m.entries.length > 0);

  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Archive
        </h1>
        <p className="text-stone-600 mt-2">
          {archive.count} meeting summary record{archive.count === 1 ? "" : "s"} on file.
          Each one is generated from the town's own PDF the day the document
          is posted.
        </p>
      </header>

      {/* Filters */}
      <form className="mb-8 flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search summaries…"
          className="flex-1 px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
        />
        <select
          name="committee"
          defaultValue={searchParams.committee ?? ""}
          className="px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
        >
          <option value="">All committees</option>
          {archive.committees.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700"
        >
          Filter
        </button>
        {(filterCommittee || filterQuery) && (
          <Link
            href="/archive"
            className="px-4 py-2 border border-stone-300 rounded-md text-sm text-stone-700 hover:bg-stone-50"
          >
            Clear
          </Link>
        )}
      </form>

      {filteredMonths.length === 0 ? (
        <p className="text-stone-500">No summaries match your filter.</p>
      ) : (
        <div className="space-y-10">
          {filteredMonths.map((m) => (
            <section key={m.month}>
              <h2 className="font-serif text-sm text-stone-500 uppercase tracking-wider pb-2 mb-4 border-b border-stone-200 flex items-baseline justify-between">
                <span>{m.label}</span>
                <span className="text-xs">{m.count} record{m.count === 1 ? "" : "s"}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {m.entries.map((e) => (
                  <li key={e.guid} className="surface p-4">
                    <div className="flex items-baseline gap-2 text-xs text-stone-500">
                      <time>{e.meeting_date}</time>
                      <span className="font-medium text-stone-700">{e.committee}</span>
                      <span className="tag-pill ml-auto">{e.doc_type}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-stone-900">{e.title}</div>
                    {e.summary && (
                      <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                        {e.summary.length > 320
                          ? e.summary.slice(0, 319).trimEnd() + "…"
                          : e.summary}
                      </p>
                    )}
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
    </div>
  );
}