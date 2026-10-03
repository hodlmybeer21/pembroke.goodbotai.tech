// components/Brief.tsx — Daily brief grouped by impact tag.
// Design: serif section labels (not UPPERCASE + box-drawing), colored vertical
// bars per impact group, calendar items in cards. No emoji.

import { buildBrief, groupByTag, TAG_ORDER, fmtWhen, type BriefItem } from "@/lib/brief";
import { TAG_LABEL, type ImpactTag } from "@/lib/impact";

export function Brief({ items, weekEnd, laterCap }: {
  items: { kind: "calendar" | "doc"; committee: string; title: string; when: Date; tags: Set<ImpactTag>; url?: string }[];
  weekEnd: Date;
  laterCap: number;
  generatedAt: Date;
}) {
  const thisWeek = items.filter((i) => i.when < weekEnd);
  const later = items.filter((i) => i.when >= weekEnd).slice(0, laterCap);

  return (
    <div className="space-y-10">
      <Section title="This week" items={thisWeek} weekEnd={weekEnd} />
      {later.length > 0 && (
        <Section title="Later" items={later} weekEnd={weekEnd} compact />
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
      <h2 className="font-serif text-sm text-stone-500 uppercase tracking-wider mb-4 pb-2 border-b border-stone-200">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {TAG_ORDER.map((tag) => {
          const bucket = grouped[tag];
          if (bucket.length === 0) return null;
          return (
            <div key={tag} className="surface p-4 pl-5 relative overflow-hidden">
              {/* Left colored bar */}
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: IMPACT_BAR_COLOR[tag] }}
              />
              <h3 className="font-serif text-sm font-semibold text-stone-700 mb-2">
                {TAG_LABEL[tag]}
              </h3>
              <ul className="space-y-2 text-sm">
                {bucket.map((item, idx) => (
                  <li key={idx} className="leading-snug">
                    <div className="text-stone-500 text-xs">
                      {fmtWhen(item.when, weekEnd)}
                      {item.kind === "calendar" && !compact && (
                        <> · {item.committee}</>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-stone-900">{item.title}</span>
                      {item.url && !compact && (
                        <>
                          {" · "}
                          <a
                            className="text-brand-700 underline text-xs"
                            href={item.url}
                          >
                            Read PDF →
                          </a>
                        </>
                      )}
                    </div>
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

const IMPACT_BAR_COLOR: Record<ImpactTag, string> = {
  wallet:   "#b45309",
  commute:  "#475569",
  kids:     "#15803d",
  property: "#1e3a8a",
  family:   "#78716c",
};