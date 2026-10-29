// lib/property-values.ts — Load the published property-value dataset.
//
// Data comes from scripts/pembroke_property_values_export.py (run on Tyler's
// Mac against the town's AxisGIS property database) and is committed to
// data/property-values.json. The file is small enough to read from disk on
// every request, so the page can be statically rendered with a long ISR
// window and still pick up a refreshed file on the next deploy.
//
// Note: the published file deliberately contains NO owner names. Sale
// prices, addresses, assessment values and coordinates are what residents
// need; owner names are personal data and the site does not carry it.

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface PropertySale {
  cama: string;
  address: string | null;
  sale_price: number;
  sale_date: string;
  sale_qualified: string | null;
  market_sale: boolean;
  assessed: number;
  assessed_land: number | null;
  assessed_bldg: number | null;
  difference: number;
  pct_of_assessed: number | null;
  below_assessment: boolean;
  lat: number;
  lon: number;
  use: string | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  year_built: number | null;
  acres: number | null;
  zone: string | null;
  prior_sales: Array<{ date: string; price: number; qualified: string | null }>;
}

export interface PropertyValuesFile {
  generated_at: string;
  source: string;
  source_url: string;
  town: string;
  years_shown: number;
  count: number;
  below_assessment_count: number;
  sales: PropertySale[];
}

let cached: PropertyValuesFile | null = null;

export function loadPropertyValues(): PropertyValuesFile | null {
  if (cached) return cached;
  try {
    const path = join(process.cwd(), "data", "property-values.json");
    if (!existsSync(path)) return null;
    cached = JSON.parse(readFileSync(path, "utf8")) as PropertyValuesFile;
    return cached;
  } catch {
    return null;
  }
}

/** Percentage-of-assessment buckets used for the color legend. */
export function bucketOf(pct: number | null, below: boolean): "below" | "near" | "above" {
  if (below) return "below";
  if (pct !== null && pct < 10) return "near";
  return "above";
}
