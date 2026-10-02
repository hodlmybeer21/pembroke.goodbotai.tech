import { fetchAllFeeds, dedupeByDateTitle, filterHorizon } from "@/lib/ical";
import { fetchAgendaCenter, loadOcrExport, findSummary } from "@/lib/agenda-center";
import { buildBrief } from "@/lib/brief";
import { Brief } from "@/components/Brief";

// Revalidate hourly. Fresh within the hour; cache hit for repeated visitors.
export const revalidate = 3600;

export default async function HomePage() {
  const [events, docs] = await Promise.all([
    fetchAllFeeds().catch(() => []),
    fetchAgendaCenter().catch(() => []),
  ]);
  const ocr = loadOcrExport();

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const dedupedEvents = dedupeByDateTitle(
    filterHorizon(events, now, horizonEnd),
  );

  const brief = buildBrief(dedupedEvents, docs, { now });

  // Reformat for the Brief component (it expects ImpactTag keys).
  const items = [...brief.thisWeek, ...brief.later].map((it) => ({
    kind: it.kind,
    committee: it.committee,
    title: it.title,
    when: it.when,
    tags: it.tags,
    url: it.url,
  }));

  const newDocsCount = brief.newDocs.length;
  const ocrCount = ocr ? Object.keys(ocr.summaries).length : 0;

  return (
    <div className="container-page">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Pembroke, NH — daily brief</h1>
        <p className="text-sm text-stone-500 mt-1">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          {newDocsCount > 0 && ` · 🆕 ${newDocsCount} new agenda/minutes`}
          {ocrCount > 0 && ` · ✨ ${ocrCount} OCR'd summaries`}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-stone-500">
          Nothing on the town calendar in the next 90 days. Check back later.
        </p>
      ) : (
        <Brief
          items={items}
          weekEnd={brief.weekEnd}
          laterCap={brief.laterCap}
          generatedAt={brief.generatedAt}
        />
      )}

      {brief.newDocs.length > 0 && (
        <section className="mt-8 pt-6 border-t border-stone-200">
          <h2 className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-3">
            Newest postings (click to read)
          </h2>
          <ul className="space-y-3 text-sm">
            {brief.newDocs.slice(0, 6).map((d, idx) => {
              const summary = findSummary(
                { ...d, docType: d.docType as "Agenda" | "Minutes" } as never,
                ocr,
              );
              return (
                <li key={idx}>
                  <div>
                    <span className="text-stone-500 mr-2">
                      {d.when.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="font-medium">{d.committee}</span>
                    <span className="mx-1">—</span>
                    <span>{d.title}</span>
                    {d.url && (
                      <>
                        {" "}
                        <a className="text-brand-600 underline" href={d.url}>
                          [pdf]
                        </a>
                      </>
                    )}
                  </div>
                  {summary && (
                    <div className="mt-1 ml-10 text-xs text-stone-600 leading-relaxed">
                      {summary.length > 220
                        ? summary.slice(0, 219).trimEnd() + "…"
                        : summary}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}