// lib/tax-history.ts — the 2010-2025 tax rate and budget history.
//
// The numbers are NOT derived here. They were compiled and verified by
// the Chief of Staff and committed as data/tax-history/*.json. This
// module only loads and types them. Nothing downstream may recompute
// a rate, and a null in the source stays null all the way to the page.

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// `export *` re-exports without creating a local binding, so the names
// have to be imported as well as re-exported.
import {
  REVALUATION_YEARS,
  RATE_PARTS,
  type HouseDelegation,
  type PartisanBand,
  type PartisanBandsFile,
  type RateComponents,
  type RateSource,
  type SchoolBudget,
  type SchoolBudgetExtra,
  type TaxHistoryFile,
  type TaxYear,
  type TownBudget,
  type TownBudgetExtra,
} from "@/lib/tax-history-types";

export {
  REVALUATION_YEARS,
  RATE_PARTS,
  type HouseDelegation,
  type PartisanBand,
  type PartisanBandsFile,
  type RateComponents,
  type RateSource,
  type SchoolBudget,
  type SchoolBudgetExtra,
  type TaxHistoryFile,
  type TaxYear,
  type TownBudget,
  type TownBudgetExtra,
};

function readJson<T>(rel: string): T | null {
  try {
    const p = join(process.cwd(), "data", "tax-history", rel);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

export function loadTaxHistory(): TaxHistoryFile | null {
  return readJson<TaxHistoryFile>("pembroke-tax-history.json");
}

export function loadPartisanBands(): PartisanBandsFile | null {
  return readJson<PartisanBandsFile>("partisan-bands.json");
}

export function readTaxHistoryDoc(name: string): string | null {
  try {
    const p = join(process.cwd(), "data", "tax-history", name);
    if (!existsSync(p)) return null;
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}
