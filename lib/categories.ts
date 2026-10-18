// lib/categories.ts — Category definitions and tag mapping.
//
// Each category maps to one or more impact tags (wallet/commute/kids/property/family).
// When a new doc is detected, subscribers whose categories intersect the doc's
// tag set get an alert.
//
// Personas are pre-bundled category sets that match common life situations
// in Pembroke. On first visit, the user picks a persona; that becomes the
// default for their profile. The persona also drives the home page's impact
// section ordering — e.g. "Family with school-age kids" puts "Your kids"
// first, "Empty nesters" puts "Your wallet" first.

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

export interface Persona {
  id: string;
  label: string;
  blurb: string;
  description: string;
  // Category IDs that the persona subscribes to by default.
  // The user can fine-tune these on /settings after picking a persona.
  categories: string[];
  // Ordered impact tags for the home page. The first tag is the
  // "primary" one for this persona — the home page surfaces that
  // section first.
  primaryTags: string[];
  emoji: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "family_with_kids",
    label: "Family with school-age kids",
    blurb: "Schools, rec programs, property tax, voting on school budgets.",
    description:
      "Get alerts about school board, recreation, library events, playground updates, and property tax / budget votes. Best for households with kids in SAU 53.",
    categories: ["parent", "homeowner", "voter"],
    primaryTags: ["kids", "wallet", "property", "commute", "family"],
    emoji: "👨‍👩‍👧",
  },
  {
    id: "young_professionals",
    label: "Young couple, no kids",
    blurb: "Roads, taxes, and what to do around town.",
    description:
      "Property tax, road work that affects your commute, weekend events, and town-wide votes. Best for households without kids in the school district.",
    categories: ["homeowner", "commuter", "voter"],
    primaryTags: ["wallet", "commute", "family", "property", "kids"],
    emoji: "🧑‍🤝‍🧑",
  },
  {
    id: "empty_nesters",
    label: "Empty nesters / older couple",
    blurb: "Tax relief, community events, holiday closures.",
    description:
      "Property tax relief programs, senior events, holiday closures, and town-wide votes. Best for households whose kids have moved out or who are planning to stay long-term.",
    categories: ["senior", "homeowner", "voter"],
    primaryTags: ["wallet", "family", "property", "commute", "kids"],
    emoji: "🏡",
  },
  {
    id: "renter",
    label: "Renter",
    blurb: "Rent-relevant town decisions: water/sewer fees, voting.",
    description:
      "Water/sewer rate changes, town-wide votes, and weekend events. Doesn't include property-tax-only items since you don't pay those directly.",
    categories: ["renter", "commuter", "voter"],
    primaryTags: ["wallet", "commute", "family", "property", "kids"],
    emoji: "🛋️",
  },
  {
    id: "business_owner",
    label: "Local business owner",
    blurb: "Foot traffic, regulations, infrastructure that affects customers.",
    description:
      "Road closures, zoning changes, license renewals, and any town-wide vote. Best for shop owners, contractors, and other Pembroke-based businesses.",
    categories: ["business", "homeowner", "voter"],
    primaryTags: ["wallet", "commute", "property", "kids", "family"],
    emoji: "🏪",
  },
  {
    id: "new_resident",
    label: "Just moved to Pembroke",
    blurb: "Everything important in your first 90 days.",
    description:
      "Voter registration deadline, transfer station rules, trash pickup, dog license, school registration, library card. Best for households in their first few months in town.",
    categories: ["homeowner", "parent", "commuter", "voter"],
    primaryTags: ["family", "wallet", "property", "commute", "kids"],
    emoji: "📦",
  },
];

export function findPersona(id: string): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}
