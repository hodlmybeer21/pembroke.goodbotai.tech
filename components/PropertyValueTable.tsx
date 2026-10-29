"use client";

// components/PropertyValueTable.tsx — Sortable/filterable table of Pembroke
// home sales next to the town's assessed value.
//
// The table is the primary view on mobile (the map is the secondary one),
// and clicking a row pans the map to that property.

import { useMemo, useState } from "react";
import { PropertyValueMap, type MapPin } from "./PropertyValueMap";
import type { PropertySale } from "@/lib/property-values";

interface Props {
  sales: PropertySale[];
  generatedAt: string;
  sourceUrl: string;
}

type Filter = "all" | "below" | "near" | "above";
type SortKey = "date" | "price" | "assessed" | "pct";
type Scope = "market" | "all";

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = months[Number(m) - 1] ?? m;
  return `${mi} ${Number(d)}, ${y}`;
}

function bucket(s: PropertySale): "below" | "near" | "above" {
  if (s.below_assessment) return "below";
  if (s.pct_of_assessed !== null && s.pct_of_assessed < 10) return "near";
  return "above";
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All sales" },
  { key: "below", label: "Below assessment" },
  { key: "near", label: "Within 10%" },
  { key: "above", label: "Above assessment" },
];

export function PropertyValueTable({ sales, generatedAt, sourceUrl }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [scope, setScope] = useState<Scope>("market");
  const [sort, setSort] = useState<SortKey>("date");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Arm's-length sales are the meaningful comparison against an assessment.
  // Transfers are shown only when the resident explicitly asks for them.
  const scoped = useMemo(
    () => (scope === "market" ? sales.filter((s) => s.market_sale) : sales),
    [sales, scope]
  );

  const rows = useMemo(() => {
    let out = scoped.slice();
    if (filter !== "all") out = out.filter((s) => bucket(s) === filter);
    const dir = sort === "date" ? -1 : 1;
    out.sort((a, b) => {
      switch (sort) {
        case "price":
          return (a.sale_price - b.sale_price) * dir;
        case "assessed":
          return (a.assessed - b.assessed) * dir;
        case "pct":
          return ((a.pct_of_assessed ?? 0) - (b.pct_of_assessed ?? 0)) * dir;
        default:
          return a.sale_date < b.sale_date ? -dir : a.sale_date > b.sale_date ? dir : 0;
      }
    });
    return out;
  }, [scoped, filter, sort]);

  const pins = useMemo<MapPin[]>(
    () =>
      rows.map((s) => ({
        id: s.cama,
        lat: s.lat,
        lon: s.lon,
        address: s.address ?? "Pembroke, NH",
        salePrice: s.sale_price,
        assessed: s.assessed,
        pct: s.pct_of_assessed,
        below: s.below_assessment,
        saleDate: fmtDate(s.sale_date),
      })),
    [rows]
  );

  const counts = useMemo(() => {
    let below = 0, near = 0, above = 0;
    for (const s of scoped) {
      const b = bucket(s);
      if (b === "below") below++;
      else if (b === "near") near++;
      else above++;
    }
    return { below, near, above, all: scoped.length };
  }, [scoped]);

  const transferCount = useMemo(
    () => sales.filter((s) => !s.market_sale).length,
    [sales]
  );

  const selectRow = (id: string) => {
    setFocusId(id);
    setShowMap(true);
  };

  const sortBtn = (key: SortKey, label: string, align: string = "text-right") => (
    <button
      type="button"
      onClick={() => setSort(key)}
      className={`inline-flex items-center gap-1 font-medium ${align} ${
        sort === key ? "text-stone-900" : "text-stone-500"
      } hover:text-stone-900`}
    >
      {label}
      <span className="text-[10px]" aria-hidden>
        {sort === key ? "▼" : "↕"}
      </span>
    </button>
  );

  return (
    <div>
      {/* Summary numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sales shown" value={String(counts.all)} />
        <Stat label="Sold above assessment" value={String(counts.above)} tone="green" />
        <Stat label="Within 10%" value={String(counts.near)} tone="amber" />
        <Stat label="Sold below assessment" value={String(counts.below)} tone="red" />
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {scope === "market"
          ? "Arm's-length sales only — the ones that reflect what the market will pay."
          : "Including family transfers, court sales, and foreclosures."}
      </p>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const n =
            f.key === "all" ? counts.all : f.key === "below" ? counts.below : f.key === "near" ? counts.near : counts.above;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`min-h-[40px] rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
              }`}
              aria-pressed={active}
            >
              {f.label}
              <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-stone-400"}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Scope: market sales by default; transfers opt-in */}
      {transferCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">Show</span>
          <button
            type="button"
            onClick={() => setScope("market")}
            className={`min-h-[36px] rounded-md border px-2.5 py-1 text-sm ${
              scope === "market"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
            aria-pressed={scope === "market"}
          >
            Market sales only
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`min-h-[36px] rounded-md border px-2.5 py-1 text-sm ${
              scope === "all"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
            aria-pressed={scope === "all"}
          >
            Include transfers ({transferCount})
          </button>
        </div>
      )}

      {/* Map toggle — on mobile the map sits under the list unless asked for */}
      <div className="mt-4 sm:hidden">
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800"
        >
          {showMap ? "Hide map" : "Show map"}
        </button>
      </div>

      <div className={`mt-4 ${showMap ? "" : "hidden sm:block"}`}>
        <PropertyValueMap pins={pins} focusId={focusId} onSelect={selectRow} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
          <Legend color="#b91c1c" label="Sold below assessed value" />
          <Legend color="#b45309" label="Within 10% of assessed value" />
          <Legend color="#15803d" label="Sold above assessed value" />
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left">
              <th className="py-2 pr-3 font-semibold text-stone-900">{sortBtn("date", "Sold", "text-left")}</th>
              <th className="py-2 pr-3 font-semibold text-stone-900">Address</th>
              <th className="py-2 pr-3 font-semibold text-stone-900">{sortBtn("price", "Sale price")}</th>
              <th className="py-2 pr-3 font-semibold text-stone-900">{sortBtn("assessed", "Town assessed")}</th>
              <th className="py-2 font-semibold text-stone-900">{sortBtn("pct", "Difference")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const b = bucket(s);
              const diff = s.difference;
              const sign = diff >= 0 ? "+" : "−";
              return (
                <tr
                  key={s.cama}
                  onClick={() => selectRow(s.cama)}
                  className={`cursor-pointer border-b border-stone-200 align-top ${
                    focusId === s.cama ? "bg-amber-50" : "hover:bg-stone-50"
                  }`}
                >
                  <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{fmtDate(s.sale_date)}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-stone-900">{s.address ?? "—"}</div>
                    <div className="text-xs text-stone-500">
                      {[s.beds ? `${s.beds} bd` : null, s.baths ? `${s.baths} ba` : null, s.sqft ? `${Number(s.sqft).toLocaleString()} sqft` : null]
                        .filter(Boolean)
                        .join(" · ")}
                      {!s.market_sale && (
                        <span className="tag-pill ml-1.5 align-middle">transfer</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-stone-900">{money(s.sale_price)}</td>
                  <td className="py-2 pr-3 text-right text-stone-700">{money(s.assessed)}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        b === "below" ? "text-red-700" : b === "near" ? "text-amber-700" : "text-green-700"
                      }`}
                    >
                      {sign}
                      {money(Math.abs(diff))}
                    </span>
                    <span className="ml-1 text-xs text-stone-500">
                      ({sign}
                      {Math.abs(s.pct_of_assessed ?? 0).toFixed(0)}%)
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500">
                  No sales match that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-500">
        Assessment data and recorded sales from the{" "}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Town of Pembroke property database
        </a>
        , pulled {generatedAt}. Town assessment is a tax value set by the assessor — it is not an
        appraisal of today&apos;s market value, and it only resets when the town re-assesses.
        {" "}Sale prices are the prices recorded on the deed, and some are transfers between
        family members or court sales rather than open-market deals. This is for information,
        not as a valuation of any specific home.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "green" ? "text-green-700" : "text-stone-900";
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
      <div className={`font-serif text-2xl font-semibold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs leading-tight text-stone-500">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
