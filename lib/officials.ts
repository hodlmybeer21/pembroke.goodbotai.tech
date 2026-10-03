// lib/officials.ts — Load and expose the scraped town officials data.

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface OfficialMember {
  name: string;
  title: string;
  term_ends: string | null;
  email: string | null;
  photo_url: string | null;
}

export interface Committee {
  name: string;
  slug: string;
  url: string;
  members: OfficialMember[];
  next_meeting: string | null;
  meeting_when: string | null;
}

export interface StateRep {
  chamber: "house" | "senate";
  district: string;
  name: string;
  party: string;
  towns: string;
  email: string;
  phone: string | null;
  url: string;
}

export interface OfficialsExport {
  generated_at: string;
  committees: Committee[];
  state_reps: StateRep[];
}

let cached: OfficialsExport | null = null;

export function loadOfficials(): OfficialsExport | null {
  if (cached) return cached;
  try {
    const p = join(process.cwd(), "data", "officials.json");
    if (!existsSync(p)) return null;
    cached = JSON.parse(readFileSync(p, "utf-8")) as OfficialsExport;
    return cached;
  } catch {
    return null;
  }
}

/** Group committees into rough categories for the page layout. The
 *  town doesn't formally group them; we use a sensible default order
 *  (elected boards first, then standing committees, then subcommittees).
 */
const CATEGORY_ORDER: Array<[string, string]> = [
  ["Elected boards", "Boards members are elected by voters."],
  ["Standing committees", "Appointed committees that meet regularly."],
  ["Subcommittees", "Short-term or issue-specific working groups."],
];

const CATEGORY_MEMBERS: Record<string, string[]> = {
  "Elected boards": [
    "Board of Selectmen",
    "Planning Board",
    "Budget Committe",
    "Zoning Board of Adjustment",
  ],
  "Standing committees": [
    "Capital Improvement Program Committee",
    "Conservation Commission",
    "Cemetery Commission",
    "Energy Committee",
    "Library Trustees",
    "Recreation Commission",
    "Roads Committee",
    "Sewer Commission",
    "Solid Waste Advisory Committee",
    "Trustees of Trust Funds",
    "Water Works",
    "Economic Development Committee",
  ],
  "Subcommittees": [
    "Range Roads Subcommittee",
  ],
};

export function groupCommittees(
  committees: Committee[],
): Array<{ name: string; description: string; committees: Committee[] }> {
  const out: Array<{ name: string; description: string; committees: Committee[] }> = [];
  for (const [catName, catDesc] of CATEGORY_ORDER) {
    const matches = CATEGORY_MEMBERS[catName] ?? [];
    const filtered = committees.filter((c) => matches.includes(c.name));
    if (filtered.length > 0) {
      out.push({ name: catName, description: catDesc, committees: filtered });
    }
  }
  // Any committee not in the category list ends up in a fallback bucket.
  const allCategorized = Object.values(CATEGORY_MEMBERS).flat();
  const uncat = committees.filter((c) => !allCategorized.includes(c.name));
  if (uncat.length > 0) {
    out.push({ name: "Other", description: "", committees: uncat });
  }
  return out;
}
