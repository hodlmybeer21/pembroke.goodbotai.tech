import { fetchAgendaCenter, loadOcrExport, findSummary } from "@/lib/agenda-center";

export const revalidate = 3600;

export default async function AgendasPage() {
  const docs = await fetchAgendaCenter().catch(() => []);
  const ocr = loadOcrExport();
  const ocrGeneratedAt = ocr?.generated_at;

  return (
    <div className="container-page">
      <h1 className="text-2xl font-semibold mb-1">Agendas & minutes</h1>
      <p className="text-sm text-stone-500 mb-6">
        Recent postings from the{" "}
        <a href="https://www.pembroke-nh.com/agendacenter" className="underline">
          town agenda center
        </a>
        . Click any PDF to read the original document.{" "}
        {ocrGeneratedAt && (
          <>
            Auto-summaries generated from OCR on{" "}
            <time dateTime={ocrGeneratedAt}>
              {new Date(ocrGeneratedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </time>
            .
          </>
        )}
      </p>

      {docs.length === 0 ? (
        <p className="text-stone-500">No agenda postings available right now.</p>
      ) : (
        <div className="border border-stone-200 rounded-md bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 w-24">Date</th>
                <th className="text-left px-3 py-2">Committee</th>
                <th className="text-left px-3 py-2 w-24">Type</th>
                <th className="text-left px-3 py-2">Title / Summary</th>
                <th className="text-left px-3 py-2 w-16">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {docs.map((d, idx) => {
                const summary = findSummary(d, ocr);
                return (
                  <tr key={idx}>
                    <td className="px-3 py-3 align-top text-stone-500">{d.meetingDate}</td>
                    <td className="px-3 py-3 align-top font-medium">{d.committee}</td>
                    <td className="px-3 py-3 align-top">
                      <span className="tag-pill">{d.docType}</span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="text-stone-700">{d.title}</div>
                      {summary && (
                        <div className="mt-1 text-xs text-stone-600 leading-relaxed">
                          {summary.length > 280 ? summary.slice(0, 279).trimEnd() + "…" : summary}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <a className="text-brand-600 underline" href={d.url}>
                        open
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-stone-500 mt-4">
        Note: PDFs are scanned images. Auto-summaries come from on-device OCR via Tyler's
        daily cron, refreshed hourly here.
      </p>
    </div>
  );
}