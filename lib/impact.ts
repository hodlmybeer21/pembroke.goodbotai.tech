// lib/impact.ts — Tag text by impact on a Pembroke NH resident.

export type ImpactTag = "wallet" | "commute" | "kids" | "property" | "family";

export const IMPACT_KEYWORDS: Record<ImpactTag, string[]> = {
  wallet: [
    "budget", "cip", "tax", "bond", "warrant", "levy", "fee", "appropriat",
    "school fund", "water rate", "sewer", "rate", "capital reserve",
    "manifest", "abatement", "tax deed", "fiscal", "financial",
  ],
  commute: [
    "road", "bridge", "plowing", "snow", "traffic", "paving", "intersection",
    "speed", "borough", "dpw", "highway", "lane", "roundabout", "crosswalk",
    "winter sand", "road project", "state highway",
  ],
  kids: [
    "school", "recreation", "summer rec", "library", "playground", "youth",
    "little league", "sports", "parks", "soccer", "field", "pavilion",
    "stage project", "tennis",
  ],
  property: [
    "zoning", "conservation", "subdivision", "setback", "variance", "easement",
    "site plan", "special use", "realty", "wetland", "building permit",
    "facility permit", "planning", "sup-",
  ],
  family: [
    "blood drive", "holiday", "fireworks", "community event", "village days",
    "old home days", "town fair", "halloween", "trick or treat", "parade",
  ],
};

const COMMITTEE_DEFAULTS: Record<string, ImpactTag[]> = {
  "Select Board": ["wallet"],
  "Board of Selectmen": ["wallet"],
  "Planning Board": ["property"],
  "Planning Board Workshop": ["property"],
  "Planning Board Public Hearing": ["property"],
  "Budget Committee": ["wallet"],
  "Capital Improvement Program": ["wallet", "commute"],
  "CIP Committee": ["wallet", "commute"],
  "Roads Committee": ["commute"],
  "Water Works": ["wallet"],
  "Recreation Commission": ["kids"],
  "Conservation Commission": ["property"],
};

export function tag(text: string, committee: string): Set<ImpactTag> {
  const combined = (text + " " + committee).toLowerCase();
  const tags = new Set<ImpactTag>();
  for (const [tag, keywords] of Object.entries(IMPACT_KEYWORDS) as [ImpactTag, string[]][]) {
    if (keywords.some((k) => combined.includes(k))) tags.add(tag);
  }
  if (tags.size === 0) {
    const defaults = COMMITTEE_DEFAULTS[committee];
    if (defaults) for (const t of defaults) tags.add(t);
  }
  return tags;
}

export const TAG_ORDER: ImpactTag[] = ["wallet", "commute", "kids", "property", "family"];
export const TAG_ICON: Record<ImpactTag, string> = {
  wallet: "💰",
  commute: "🚗",
  kids: "👧",
  property: "🏡",
  family: "🏛️",
};