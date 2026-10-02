// components/Brief.tsx — Render the daily brief grouped by impact tag.

import { buildBrief, groupByTag, TAG_ORDER, TAG_ICON, fmtWhen, type BriefItem } from "@/lib/brief";

export function Brief({ items, weekEnd, laterCap, generatedAt }: {
  items: { kind: "calendar" | "doc"; committee: string; title: string; when: Date; tags: Set<keyof typeof TAG_ICON>; url?: string }[];
  weekEnd: Date;
  laterCap: number;
  generatedAt: Date;
}) {
  const thisWeek = items.filter((i) => i.when < weekEnd);
  const later = items.filter((i) => i.when >= weekEnd).slice(0, laterCap);

  return (
    <div className="space-y-6">
      <header className="text-sm text-stone-500">
        Generated {generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
      </header>
      <Section title="UPCOMING THIS WEEK" items={thisWeek} weekEnd={weekEnd} />
      {later.length > 0 && (
        <Section title="LATER" items={later} weekEnd={weekEnd} compact />
      )}
    </div>
  );
}

function Section({ title, items, weekEnd, compact = false }: {
  title: string;
  items: BriefItem[];
  weekEnd: Date;
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  const grouped = groupByTag(items);
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-3">
        ━━ {title} ━━
      </h2>
      <div className="space-y-4">
        {TAG_ORDER.map((tag) => {
          const bucket = grouped[tag];
          if (bucket.length === 0) return null;
          return (
            <div key={tag}>
              <h3 className="font-semibold text-sm mb-2">
                <span className="mr-1">{TAG_ICON[tag]}</span>
                {tag.toUpperCase()}
              </h3>
              <ul className="space-y-1.5 text-sm">
                {bucket.map((item, idx) => (
                  <li key={idx} className="leading-snug">
                    <span className="text-stone-500 mr-2">{fmtWhen(item.when, weekEnd)}</span>
                    <span>— {item.title}</span>
                    {item.kind === "calendar" && !compact && (
                      <span className="ml-2 text-stone-400 text-xs">({item.committee})</span>
                    )}
                    {item.url && !compact && (
                      <>
                        {" "}
                        <a className="text-brand-600 underline text-xs" href={item.url}>
                          [pdf]
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}