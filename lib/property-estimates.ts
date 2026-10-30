// lib/property-estimates.ts — comparable-sales estimates of today's value.
//
// Built by ~/.hermes/scripts/pembroke_property_estimates.py from the
// town's own recorded arm's-length sales.
//
// This is an ESTIMATE, not an appraisal, and the page says so. Zillow
// blocks scripted access outright, so there is no Zestimate here; what
// there is instead is an estimate a resident can check, because the
// comparable sales it was built from are published with it.

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface EstimateComp {
  address: string | null;
  price: number;
  date: string | null;
  sqft: number;
  beds: number | null;
  miles: number | null;
}

export interface PropertyEstimate {
  address: string | null;
  kind: "sold" | "listed";
  estimate: number;
  low: number;
  high: number;
  comps: EstimateComp[];
  sale_date?: string | null;
  sale_price?: number | null;
  list_price?: number | null;
  assessed?: number | null;
  cama?: string | null;
}

export interface PropertyEstimatesFile {
  generated_at: string;
  method: string;
  pool_size: number;
  price_per_sqft_slope: number;
  count: number;
  median_spread_pct: number | null;
  estimates: PropertyEstimate[];
}

let cached: PropertyEstimatesFile | null = null;

export function loadPropertyEstimates(): PropertyEstimatesFile | null {
  if (cached) return cached;
  try {
    const p = join(process.cwd(), "data", "property-estimates.json");
    if (!existsSync(p)) return null;
    cached = JSON.parse(readFileSync(p, "utf8")) as PropertyEstimatesFile;
    return cached;
  } catch {
    return null;
  }
}

/** Estimates keyed by the normalised address, for the tables. */
export function estimatesByAddress(): Record<string, PropertyEstimate> {
  const data = loadPropertyEstimates();
  const out: Record<string, PropertyEstimate> = {};
  if (!data) return out;
  for (const e of data.estimates) {
    const key = (e.address ?? "").trim().toLowerCase();
    if (key) out[key] = e;
  }
  return out;
}
