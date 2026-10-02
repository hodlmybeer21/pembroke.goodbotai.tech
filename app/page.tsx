import { fetchAllFeeds, dedupeByDateTitle, filterHorizon } from "@/lib/ical";
import { fetchAgendaCenter } from "@/lib/agenda-center";
import { buildBrief } from "@/lib/brief";
import { Brief } from "@/components/Brief";

// Revalidate hourly. Fresh within the hour; cache hit for repeated visitors.
export const revalidate = 3600;

export default async function HomePage() {
  const [events, docs] = await Promise.all([
    fetchAllFeeds().catch(() => []),
    fetchAgendaCenter().catch(() => []),
  ]);

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

  return (
    <div className="container-page">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Pembroke, NH — daily brief</h1>
        <p className="text-sm text-stone-500 mt-1">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          {newDocsCount > 0 && ` · 🆕 ${newDocsCount} new agenda/minutes`}
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
          <ul className="space-y-2 text-sm">
            {brief.newDocs.slice(0, 8).map((d, idx) => (
              <li key={idx}>
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
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}