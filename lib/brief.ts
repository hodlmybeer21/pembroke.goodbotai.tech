// lib/brief.ts — Compose the daily brief: calendar events + new agenda docs,
// tagged by impact area. Pure function over already-fetched data.

import type { CalendarEvent } from "./ical";
import type { AgendaDoc } from "./agenda-center";
import { tag, TAG_ORDER, TAG_ICON, type ImpactTag } from "./impact";

export interface BriefItem {
  kind: "calendar" | "doc";
  committee: string;
  title: string;
  when: Date;
  tags: Set<ImpactTag>;
  url?: string;
  docType?: "Agenda" | "Minutes";
}

export interface Brief {
  generatedAt: Date;
  weekEnd: Date;
  laterCap: number;
  thisWeek: BriefItem[];
  newDocs: BriefItem[];
  later: BriefItem[];
}

export function buildBrief(
  events: CalendarEvent[],
  docs: AgendaDoc[],
  options: { now?: Date; horizonDays?: number; laterCap?: number } = {},
): Brief {
  const now = options.now ?? new Date();
  const horizonDays = options.horizonDays ?? 90;
  const laterCap = options.laterCap ?? 10;
  const weekEnd = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  // Calendar: filter to [now, now+horizon]
  const calHorizonEnd = new Date(now.getTime() + horizonDays * 24 * 3600 * 1000);
  const calItems: BriefItem[] = events
    .filter((e) => e.start >= now && e.start < calHorizonEnd)
    .map((e) => ({
      kind: "calendar" as const,
      committee: e.committee,
      title: e.summary,
      when: e.start,
      tags: tag(e.summary, e.committee),
    }));

  const docItems: BriefItem[] = docs.map((d) => {
    const when = new Date(d.meetingDate);
    return {
      kind: "doc" as const,
      committee: d.committee,
      title: d.title,
      when: isNaN(when.getTime()) ? new Date() : when,
      tags: tag(d.title, d.committee),
      url: d.url,
      docType: d.docType,
    };
  });

  const allItems = [...calItems, ...docItems].sort(
    (a, b) => a.when.getTime() - b.when.getTime(),
  );

  const thisWeek = allItems.filter((i) => i.when < weekEnd);
  const later = allItems.filter((i) => i.when >= weekEnd).slice(0, laterCap);

  return {
    generatedAt: now,
    weekEnd,
    laterCap,
    thisWeek,
    newDocs: docItems.sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, 12),
    later,
  };
}

export function groupByTag(items: BriefItem[]): Record<ImpactTag, BriefItem[]> {
  const out: Record<ImpactTag, BriefItem[]> = {
    wallet: [], commute: [], kids: [], property: [], family: [],
  };
  for (const item of items) {
    for (const t of item.tags) out[t].push(item);
  }
  return out;
}

export function fmtWhen(d: Date, weekEnd?: Date): string {
  const sameWeek = weekEnd && d < weekEnd;
  if (sameWeek) {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export { TAG_ORDER, TAG_ICON };