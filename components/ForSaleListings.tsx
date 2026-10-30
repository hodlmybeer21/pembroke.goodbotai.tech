"use client";

// components/ForSaleListings.tsx — Homes currently listed for sale in
// Pembroke, with the asking price next to the town's assessed value.
//
// This is the live half of the question: a home that's on the market right
// now, priced against what the town says it's worth.

import { useMemo, useState } from "react";
import type { PropertyListing, UnmatchedListing } from "@/lib/property-values";

interface Props {
  listings: PropertyListing[];
  generatedAt: string;
  taxRate?: number;
  /** How many Pembroke listings the latest raw scrape found (before
   *  parcel matching), so the page can say how many it is showing. */
  rawCount?: number | null;
  /** True when the matched-listings file is more than 3 days old. */
  stale?: boolean;
  /** For sale, but with no town assessment to compare against. */
  unmatched?: UnmatchedListing[];
}

const money = (n: number | null) =>
  n === null ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Why there is nothing to compare a listing against. */
const REASON_LABEL: Record<UnmatchedListing["no_assessment_reason"], string> = {
  new_construction: "New construction — no parcel yet",
  condo_unit: "Condo unit — assessed as a whole building",
  no_parcel: "No town parcel record yet",
};

export function ForSaleListings({
  listings,
  generatedAt,
  taxRate,
  rawCount,
  stale,
  unmatched = [],
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState(false);

  const sorted = useMemo(
    () => listings.slice().sort((a, b) => (a.list_price ?? 0) - (b.list_price ?? 0)),
    [listings]
  );

  const below = sorted.filter((l) => l.below_assessment);
  const visible = showAll ? sorted : sorted.slice(0, 8);

  if (!listings.length) return null;

  return (
    <section className="mt-10">
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            Homes on the market right now
          </h2>
          <span className="text-xs text-stone-500">{listings.length} listed homes</span>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          {below.length > 0 ? (
            <>
              <strong className="text-red-700">
                {below.length} {below.length === 1 ? "is" : "are"} asking less than the town&apos;s
                assessed value.
              </strong>{" "}
              The rest are asking more.
            </>
          ) : (
            <>Every one of these is asking more than the town&apos;s assessed value.</>
          )}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                <th className="py-2 pr-3 font-semibold text-stone-900">Address</th>
                <th className="py-2 pr-3 text-right font-semibold text-stone-900">Asking</th>
                <th className="py-2 pr-3 text-right font-semibold text-stone-900">Assessed</th>
                {taxRate ? (
                  <th className="py-2 pr-3 text-right font-semibold text-stone-900">Tax bill</th>
                ) : null}
                <th className="py-2 text-right font-semibold text-stone-900">Gap</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l, i) => {
                const diff = l.difference;
                return (
                  <tr key={`${l.address}-${i}`} className="border-b border-stone-200 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-stone-900">{l.address ?? "—"}</div>
                      <div className="text-xs text-stone-500">
                        {[l.beds ? `${l.beds} bd` : null, l.baths ? `${l.baths} ba` : null, l.sqft ? `${Number(l.sqft).toLocaleString()} sqft` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-stone-900">
                      {money(l.list_price)}
                    </td>
                    <td className="py-2 pr-3 text-right text-stone-700">{money(l.assessed)}</td>
                    {taxRate ? (
                      <td className="py-2 pr-3 text-right whitespace-nowrap text-stone-600">
                        {money(Math.round((l.assessed / 1000) * taxRate))}
                        <span className="text-xs text-stone-400">/yr</span>
                      </td>
                    ) : null}
                    <td className="py-2 text-right whitespace-nowrap">
                      {diff !== null && (
                        <span
                          className={`font-semibold ${
                            diff < 0 ? "text-red-700" : "text-stone-700"
                          }`}
                        >
                          {diff < 0 ? "−" : "+"}
                          {money(Math.abs(diff))}
                        </span>
                      )}
                      {l.pct_of_assessed !== null && (
                        <span className="ml-1 text-xs text-stone-500">
                          ({diff !== null && diff < 0 ? "−" : "+"}
                          {Math.abs(l.pct_of_assessed).toFixed(0)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sorted.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-4 min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-stone-500"
          >
            {showAll ? "Show fewer" : `Show all ${sorted.length}`}
          </button>
        )}

        {unmatched.length > 0 && (
          <div className="mt-6 border-t border-stone-200 pt-5">
            <h3 className="font-serif text-base font-semibold text-stone-900">
              Also for sale — no town assessment to compare
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              These {unmatched.length} homes are on the market in Pembroke,
              but the town has no assessment for the individual lot, so
              there is nothing honest to compare them against. New
              construction has no parcel yet, and Pembroke assesses condo
              buildings as a whole rather than unit by unit.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-300 text-left">
                    <th className="py-2 pr-3 font-semibold text-stone-900">Address</th>
                    <th className="py-2 pr-3 text-right font-semibold text-stone-900">Asking</th>
                    <th className="py-2 text-right font-semibold text-stone-900">
                      Why no comparison
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(showUnmatched ? unmatched : unmatched.slice(0, 6)).map((u, i) => (
                    <tr
                      key={`${u.address}-${i}`}
                      className="border-b border-stone-200 align-top"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-stone-900">
                          {u.address ?? "—"}
                        </div>
                        <div className="text-xs text-stone-500">
                          {[
                            u.beds ? `${u.beds} bd` : null,
                            u.baths ? `${u.baths} ba` : null,
                            u.sqft ? `${Number(u.sqft).toLocaleString()} sqft` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-stone-900">
                        {money(u.list_price)}
                      </td>
                      <td className="py-2 text-right text-xs text-stone-600">
                        {REASON_LABEL[u.no_assessment_reason] ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unmatched.length > 6 && (
              <button
                type="button"
                onClick={() => setShowUnmatched((v) => !v)}
                className="mt-3 min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-stone-500"
              >
                {showUnmatched
                  ? "Show fewer"
                  : `Show all ${unmatched.length} without an assessment`}
              </button>
            )}
          </div>
        )}

        {stale && (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            These listings were last refreshed on {generatedAt} and may be out of date —
            some homes may have sold or changed price since.
          </p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          Listings as of {generatedAt}.{" "}
          {rawCount && rawCount > listings.length && (
            <>
              {listings.length} of {rawCount} Pembroke listings could be matched to a
              town parcel and are shown with their assessment. The other{" "}
              {rawCount - listings.length} are listed above without a comparison
              rather than left out.{" "}
            </>
          )}
          Asking prices pulled from public listing sites; assessed values from the
          town&apos;s property database. An asking price is a seller&apos;s hope, not a sale — and
          the assessment is a tax number, not a market estimate. Treat the gap as a conversation
          starter, not a valuation.
        </p>
      </div>
    </section>
  );
}
