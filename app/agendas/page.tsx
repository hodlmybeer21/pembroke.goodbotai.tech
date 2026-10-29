// app/agendas/page.tsx — browse every agenda and minute the town has posted.
//
// Built from data/archive-index.json: 630 documents with OCR summaries,
// grouped by month. The live Agenda Center landing page only exposes 13
// rows (one stale entry per committee), so the archive index is the
// better source and this page uses it directly.
//
// The filters run client-side over the full index, so every document is
// reachable without a page load.

import Link from "next/link";
import { loadArchiveIndex, type ArchiveDoc } from "@/lib/town-data";
import { AgendaBrowser } from "@/components/AgendaBrowser";

export const revalidate = 3600;

export default function AgendasPage({
  searchParams,
}: {
  searchParams?: Promise<{ committee?: string }>;
}) {
  const index = loadArchiveIndex();
  const docs: ArchiveDoc[] = (index?.months ?? []).flatMap((m) => m.entries);
  const committees = index?.committees ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-10">
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:underline">
          Pembroke
        </Link>{" "}
        / Agendas &amp; minutes
      </nav>

      <h1 className="mt-2 font-serif text-3xl font-bold text-stone-900">
        Agendas &amp; minutes
      </h1>
      <p className="mt-2 max-w-2xl text-stone-700">
        Every agenda and set of minutes the town has posted —{" "}
        <strong className="text-stone-900">{docs.length} documents</strong>{" "}
        across {committees.length} boards and committees. The PDFs are
        scanned images, so each one is read and summarised here. Every
        entry links to the town&rsquo;s own document.
      </p>

      <div className="mt-8">
        <AgendaBrowser
          docs={docs}
          committees={committees}
          generatedAt={index?.generated_at}
        />
      </div>
    </main>
  );
}
