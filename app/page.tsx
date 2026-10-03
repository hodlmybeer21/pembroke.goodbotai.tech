import { fetchAllFeeds, dedupeByDateTitle, filterHorizon } from "@/lib/ical";
import { fetchAgendaCenter, loadOcrExport, findSummary } from "@/lib/agenda-center";
import { buildBrief } from "@/lib/brief";
import { Brief } from "@/components/Brief";
import Link from "next/link";
import { TAG_LABEL } from "@/lib/impact";

export const revalidate = 3600;

export default async function HomePage() {
  const [events, docs] = await Promise.all([
    fetchAllFeeds().catch(() => []),
    fetchAgendaCenter().catch(() => []),
  ]);
  const ocr = loadOcrExport();

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const dedupedEvents = dedupeByDateTitle(filterHorizon(events, now, horizonEnd));

  const brief = buildBrief(dedupedEvents, docs, { now });

  const items = [...brief.thisWeek, ...brief.later].map((it) => ({
    kind: it.kind,
    committee: it.committee,
    title: it.title,
    when: it.when,
    tags: it.tags,
    url: it.url,
  }));

  const newDocsCount = brief.newDocs.length;
  const thisWeekCount = brief.thisWeek.length;
  const lastRefresh = brief.generatedAt;

  return (
    <div className="container-page">
      {/* Lede */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Pembroke, NH
        </h1>
        <p className="text-stone-600 mt-2 text-base">
          The week ahead in town government.
          {thisWeekCount > 0 && (
            <>
              {" "}
              <strong className="text-stone-900">
                {thisWeekCount} meeting{thisWeekCount === 1 ? "" : "s"}
              </strong>
              {newDocsCount > 0 && (
                <>
                  , <strong className="text-stone-900">{newDocsCount} new agenda packet{newDocsCount === 1 ? "" : "s"}</strong>
                </>
              )}
              .
            </>
          )}
        </p>
        <p className="text-xs text-stone-500 mt-2">
          Refreshed {lastRefresh.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}{" "}
          · every hour from{" "}
          <a href="https://www.pembroke-nh.com" className="underline">
            pembroke-nh.com
          </a>
        </p>
      </div>

      {/* Quick access — high-traffic pages surfaced on the home page so
          visitors find them without scanning the top nav. */}
      <nav aria-label="Quick access" className="mb-10">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <QuickCard
            href="/trash"
            title="Trash day"
            body="Type your street — find your pickup day and recycling rules."
          />
          <QuickCard
            href="/report"
            title="Report an issue"
            body="Pothole, missed trash, streetlight, barking dog — who to call."
          />
          <QuickCard
            href="/officials"
            title="Officials"
            body="Select Board, Planning Board, state reps — names, emails, terms."
          />
          <QuickCard
            href="/participate"
            title="Participate"
            body="Speak at a meeting, get on the warrant, run for office."
          />
          <QuickCard
            href="/archive"
            title="Past meetings"
            body="Browse 90+ meeting summaries going back to January 2026."
          />
        </ul>
      </nav>

      {items.length === 0 ? (
        <p className="text-stone-500">
          Nothing on the town calendar in the next 90 days. Check back later.
        </p>
      ) : (
        <Brief items={items} weekEnd={brief.weekEnd} laterCap={brief.laterCap} generatedAt={brief.generatedAt} />
      )}

      {brief.newDocs.length > 0 && (
        <section className="mt-12 pt-8 border-t border-stone-200">
          <h2 className="font-serif text-sm text-stone-500 uppercase tracking-wider pb-2 mb-4 border-b border-stone-200">
            Newest postings
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {brief.newDocs.slice(0, 6).map((d, idx) => {
              const summary = findSummary(
                { ...d, docType: d.docType as "Agenda" | "Minutes" } as never,
                ocr,
              );
              return (
                <li key={idx} className="surface p-4">
                  <div className="flex items-baseline gap-2 text-xs text-stone-500">
                    <time>
                      {d.when.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </time>
                    <span className="font-medium text-stone-700">{d.committee}</span>
                    <span className="tag-pill ml-auto">{d.docType}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-stone-900">{d.title}</div>
                  {summary && (
                    <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                      {summary.length > 220
                        ? summary.slice(0, 219).trimEnd() + "…"
                        : summary}
                    </p>
                  )}
                  {d.url && (
                    <a
                      className="mt-2 inline-block text-xs text-brand-700 underline"
                      href={d.url}
                    >
                      Read full document →
                    </a>
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

function QuickCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block surface p-4 h-full hover:border-brand-500 transition-colors"
      >
        <div className="font-serif text-base font-semibold text-stone-900">
          {title} →
        </div>
        <div className="mt-1 text-xs text-stone-600 leading-relaxed">
          {body}
        </div>
      </Link>
    </li>
  );
}