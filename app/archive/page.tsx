// app/archive/page.tsx — browseable archive of every meeting summary ever
// OCR'd. Server loads the index, hands it to a client component that
// filters live as the user types.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ArchiveClient } from "./ArchiveClient";
import { formatEt } from "@/lib/dates";

export const metadata = {
  title: "Meeting archive — Pembroke, NH",
  description:
    "Searchable archive of Pembroke meeting summaries, agendas and minutes.",
  alternates: { canonical: "/archive" },
  openGraph: {
    title: "Meeting archive — Pembroke, NH",
    description:
      "Searchable archive of Pembroke meeting summaries, agendas and minutes.",
    url: "/archive",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Pembroke, NH" }],
  },
};

export const revalidate = 3600;

interface ArchiveIndex {
  generated_at: string;
  count: number;
  committees: string[];
  months: Array<{
    month: string;
    label: string;
    count: number;
    entries: Array<{
      guid: string;
      committee: string;
      doc_type: string;
      meeting_date: string;
      title: string;
      url: string;
      summary: string;
      first_archived: string;
    }>;
  }>;
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

  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Archive
        </h1>
        <p className="text-stone-600 mt-2">
          {archive.count} meeting summary record{archive.count === 1 ? "" : "s"} on file.
          Each one is generated from the town's own PDF the day the document
          is posted. Type to search — results filter as you go.
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Data as of {formatEt(archive.generated_at)}
        </p>
      </header>

      <div className="mb-8 rounded-lg border border-stone-300 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          Search inside the minutes
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          The list below filters by title and summary. To search the actual
          text of every document &mdash; a street, a topic, a name &mdash; use
          this.
        </p>
        <form action="/search" method="get" className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="archive-fulltext">
            Search the meeting minutes
          </label>
          <input
            id="archive-fulltext"
            type="search"
            name="q"
            placeholder="Search the minutes — a street, a topic, a name…"
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
          >
            Search
          </button>
        </form>
      </div>

      <ArchiveClient
        archive={archive}
        initialCommittee={searchParams.committee}
        initialQuery={searchParams.q}
      />
    </div>
  );
}