import { fetchAgendaCenter, loadOcrExport, findSummary } from "@/lib/agenda-center";

export const revalidate = 3600;

export default async function AgendasPage() {
  const docs = await fetchAgendaCenter().catch(() => []);
  const ocr = loadOcrExport();
  const ocrGeneratedAt = ocr?.generated_at;

  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Agendas & minutes
        </h1>
        <p className="text-stone-600 mt-2 text-sm">
          Recent postings from the{" "}
          <a
            href="https://www.pembroke-nh.com/agendacenter"
            className="underline"
          >
            town agenda center
          </a>
          . PDFs are scanned images; on-device OCR auto-summaries appear when available.
        </p>
      </header>

      {docs.length === 0 ? (
        <p className="text-stone-500">No agenda postings available right now.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {docs.map((d, idx) => {
            const summary = findSummary(d, ocr);
            return (
              <li key={idx} className="surface p-5">
                <div className="flex items-baseline gap-2 text-xs text-stone-500">
                  <time>{d.meetingDate}</time>
                  <span className="font-medium text-stone-700">{d.committee}</span>
                  <span className="tag-pill ml-auto">{d.docType}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-stone-900">{d.title}</div>
                {summary && (
                  <p className="mt-3 text-xs text-stone-600 leading-relaxed">
                    {summary.length > 320
                      ? summary.slice(0, 319).trimEnd() + "…"
                      : summary}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <a
                    className="text-xs text-brand-700 underline"
                    href={d.url}
                  >
                    Read full document →
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {ocrGeneratedAt && (
        <p className="text-xs text-stone-500 mt-8 pt-6 border-t border-stone-200">
          Auto-summaries generated from OCR{" "}
          <time dateTime={ocrGeneratedAt}>
            {new Date(ocrGeneratedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </time>
          .
        </p>
      )}
    </div>
  );
}