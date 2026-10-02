// lib/categories.ts — Category definitions and tag mapping.
//
// Each category maps to one or more impact tags (wallet/commute/kids/property/family).
// When a new doc is detected, subscribers whose categories intersect the doc's
// tag set get an alert.

export interface Category {
  id: string;
  label: string;
  description: string;
  tags: string[]; // impact tags (subset of wallet/commute/kids/property/family)
}

export const CATEGORIES: Category[] = [
  {
    id: "parent",
    label: "Parent / guardian",
    description: "School board, recreation, library, playground, parks.",
    tags: ["kids", "family"],
  },
  {
    id: "homeowner",
    label: "Homeowner",
    description: "Property tax, budget, CIP, zoning, planning.",
    tags: ["wallet", "property"],
  },
  {
    id: "renter",
    label: "Renter",
    description: "Rent-relevant town decisions: budget, water/sewer fees.",
    tags: ["wallet"],
  },
  {
    id: "commuter",
    label: "Daily commuter",
    description: "Roads, traffic, plowing, paving, bridges.",
    tags: ["commute"],
  },
  {
    id: "senior",
    label: "Senior",
    description: "Tax relief, community events, holiday closures.",
    tags: ["wallet", "family"],
  },
  {
    id: "business",
    label: "Local business owner",
    description: "Anything that might affect foot traffic or regulations.",
    tags: ["wallet", "commute", "kids", "property", "family"],
  },
  {
    id: "voter",
    label: "Active voter",
    description: "Everything — Select Board, Planning Board, Budget, CIP.",
    tags: ["wallet", "commute", "kids", "property", "family"],
  },
];

export function findCategory(id: string): Category | null {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export function tagForDoc(docTags: string[]): string[] {
  // docTags are impact tags from the existing pipeline.
  // Returns the list of category IDs that should receive an alert for this doc.
  return CATEGORIES.filter((c) => c.tags.some((t) => docTags.includes(t))).map((c) => c.id);
}