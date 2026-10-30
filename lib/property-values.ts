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

export interface PropertyListing {
  address: string | null;
  city: string | null;
  list_price: number | null;
  assessed: number;
  difference: number | null;
  pct_of_assessed: number | null;
  below_assessment: boolean;
  lat: number;
  lon: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  property_type: string | null;
  source_url: string | null;
  source: string | null;
  parcel_address: string | null;
  match_miles: number;
}

export interface PropertyListingsFile {
  generated_at: string;
  source: string;
  count: number;
  below_assessment_count: number;
  listings: PropertyListing[];
}

let cachedListings: PropertyListingsFile | null = null;
/**
 * Load currently-listed homes matched to their town parcel.
 *
 * Only listings we could confidently match to a town parcel (same street,
 * same house number, nearby) carry an assessed value. Anything we couldn't
 * match is left out rather than shown with a guessed comparison.
 */
export function loadPropertyListings(): PropertyListingsFile | null {
  if (cachedListings) return cachedListings;
  try {
    const path = join(process.cwd(), "data", "property-listings.json");
    if (!existsSync(path)) return null;
    cachedListings = JSON.parse(readFileSync(path, "utf8")) as PropertyListingsFile;
    return cachedListings;
  } catch {
    return null;
  }
}

/** Count of Pembroke listings in the latest raw scrape
 *  (data/pembroke-listings.json), before parcel matching. */
export function loadRawListingCount(): number | null {
  try {
    const path = join(process.cwd(), "data", "pembroke-listings.json");
    if (!existsSync(path)) return null;
    const j = JSON.parse(readFileSync(path, "utf8")) as { count?: number; listings?: unknown[] };
    return j.count ?? j.listings?.length ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- trends

export interface TrendYear {
  year: string;
  sales: number;
  median_psf: number | null;
  median_ratio: number | null;
  median_sale_price: number | null;
  below_assessed: number;
  within_20: number;
  above_20: number;
  median_tax_bill: number | null;
}

export interface PropertyTrendsFile {
  generated_at: string;
  tax_rate: number;
  tax_rate_history: Record<string, number>;
  parcel_count: number;
  years: TrendYear[];
  size_bands: Array<{
    label: string;
    count: number;
    median_psf: number | null;
    median_price: number | null;
  }>;
  possibly_over_assessed: Array<{
    address: string | null;
    sale_price: number;
    sale_date: string;
    assessed: number;
    pct: number;
    tax_bill: number;
  }>;
  possibly_under_assessed: Array<{
    address: string | null;
    sale_price: number;
    sale_date: string;
    assessed: number;
    pct: number;
    tax_bill: number;
  }>;
  tax_bill: {
    median: number | null;
    p10: number | null;
    p90: number | null;
    on_300k: number | null;
    on_450k: number | null;
  };
}

let cachedTrends: PropertyTrendsFile | null = null;

/**
 * Load the trend analytics for the property values page.
 *
 * The tax rate lives here because it is a fact about the town, not
 * something we derive. It is the NH DRA's 2025 rate for Pembroke,
 * $21.84 per $1,000 of assessed value.
 */
export function loadPropertyTrends(): PropertyTrendsFile | null {
  if (cachedTrends) return cachedTrends;
  try {
    const path = join(process.cwd(), "data", "property-trends.json");
    if (!existsSync(path)) return null;
    cachedTrends = JSON.parse(readFileSync(path, "utf8")) as PropertyTrendsFile;
    return cachedTrends;
  } catch {
    return null;
  }
}
