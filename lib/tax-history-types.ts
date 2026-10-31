// lib/tax-history-types.ts — the shared shape of the tax history data.
//
// Split out from lib/tax-history.ts because the chart components are
// client components: they may import these types and constants, but they
// must not pull in the server-only module that reads files off disk.

export interface RateComponents {
  municipal: number;
  county: number;
  state_education: number;
  local_education: number;
}

export interface RateSource {
  type: string;
  url: string | null;
  corroborating?: string[];
  note?: string;
}

export interface SchoolBudget {
  meeting_year: number;
  fiscal_year: string;
  meeting_date: string | null;
  approved_operating_budget_usd: number | null;
  source_type: string | null;
  url: string | null;
  note?: string;
}

export interface TownBudget {
  year: number;
  approved_operating_budget_usd: number | null;
  source_type: string | null;
  url: string | null;
  note?: string;
}

export interface TaxYear {
  tax_year: number;
  total_rate: number;
  components: RateComponents;
  rate_source: RateSource;
  school_budget: SchoolBudget;
  town_budget: TownBudget;
}

export interface SchoolBudgetExtra {
  fiscal_year: string;
  meeting_date: string | null;
  approved_operating_budget_usd: number | null;
  source_type: string | null;
  url: string | null;
  note?: string;
}

export interface TownBudgetExtra {
  year: number;
  approved_operating_budget_usd: number | null;
  note?: string;
  url: string | null;
}

export interface TaxHistoryFile {
  town: string;
  units: string;
  as_of: string;
  coverage: string;
  notes: string[];
  school_budget_extra: {
    meeting_2026?: SchoolBudgetExtra;
    town_2026?: TownBudgetExtra;
  };
  years: TaxYear[];
}

export interface PartisanBand {
  office: string;
  jurisdiction: string;
  person: string;
  party: string;
  start: string;
  end: string | null;
  source: string;
}

export interface HouseDelegation {
  start: string;
  end: string | null;
  district: string;
  R: number;
  D: number;
  seats: number;
  source: string;
}

export interface PartisanBandsFile {
  as_of: string;
  purpose: string;
  note: string;
  bands: PartisanBand[];
  house_delegation_summary: HouseDelegation[];
}

/** Years the town re-valued. A rate drop in these years is not a tax cut. */
export const REVALUATION_YEARS = [2019, 2024];

export const RATE_PARTS: Array<{ key: keyof RateComponents; label: string; color: string }> = [
  { key: "municipal", label: "Municipal", color: "#0f766e" },
  { key: "county", label: "County", color: "#b45309" },
  { key: "state_education", label: "State education", color: "#64748b" },
  { key: "local_education", label: "Local education", color: "#7c3aed" },
];
