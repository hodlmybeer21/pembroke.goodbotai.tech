"use client";

// components/TaxHistoryCharts.tsx — the visual layer for /taxes/history.
//
// Hand-rolled SVG and CSS rather than a charting library: a resident on a
// phone over cellular should not download 40KB of JavaScript to look at
// sixteen bars.
//
// Two rules run through all of this:
//
//   1. NULL STAYS NULL. A budget that was not verified is a gap in the
//      line, not a zero. A zero would say "the town spent nothing",
//      which is a different and wrong claim.
//
//   2. NO CAUSAL CLAIMS. Nothing here says or implies that any person,
//      party or body raised or lowered a tax rate or a budget. The
//      numbers are shown; the reading is left to the resident.
//
// The partisan bands are OFF by default, and they describe STATE
// officials only. Pembroke's Select Board, School Board and Budget
// Committee are nonpartisan offices and no party is assigned to them.

import { useEffect, useState, type ReactNode } from "react";
import {
  RATE_PARTS,
  REVALUATION_YEARS,
  type PartisanBandsFile,
  type TaxYear,
} from "@/lib/tax-history-types";

const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const PARTY_COLOR: Record<string, string> = { D: "#2563eb", R: "#dc2626" };
const PARTY_LABEL: Record<string, string> = { D: "Democrat", R: "Republican" };

/** A band boundary as a decimal year, so it lands between the bars. */
function decimalYear(iso: string): number {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return 0;
  return Number(m[1]) + (Number(m[2]) - 1) / 12;
}

// ---------------------------------------------------------------------
// 1. The rate chart: total rate per $1,000, split into its four parts.
// ---------------------------------------------------------------------

export function RateStackChart({ years }: { years: TaxYear[] }) {
  const [active, setActive] = useState<number | null>(null);

  const maxTotal = Math.max(...years.map((y) => y.total_rate));
  const n = years.length;
  const barPct = 100 / n;

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-semibold text-stone-900">
          Total tax rate per $1,000 of assessed value
        </span>
        <span className="text-xs text-stone-500">
          tax years {years[0].tax_year}&ndash;{years[n - 1].tax_year}
        </span>
      </figcaption>

      {/* the plot */}
      <div className="relative">
        {/* revaluation markers sit behind the bars */}
        {REVALUATION_YEARS.map((ry) => {
          const i = years.findIndex((y) => y.tax_year === ry);
          if (i < 0) return null;
          return (
            <div
              key={ry}
              className="pointer-events-none absolute bottom-0 top-0 border-l border-dashed border-stone-400"
              style={{ left: `${(i + 0.5) * barPct}%` }}
              aria-hidden="true"
            />
          );
        })}

        {/* the tooltip */}
        {active !== null && years[active] && (
          <div
            className="pointer-events-none absolute -top-2 z-20 w-52 -translate-x-1/2 -translate-y-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs shadow-lg"
            style={{
              left: `${Math.min(78, Math.max(22, (active + 0.5) * barPct))}%`,
            }}
          >
            <div className="font-semibold text-stone-900">Tax year {years[active].tax_year}</div>
            {RATE_PARTS.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2 py-px">
                <span className="flex items-center gap-1.5 text-stone-600">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.label}
                </span>
                <span className="font-medium text-stone-900">
                  ${years[active].components[p.key].toFixed(2)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-stone-200 pt-1">
              <span className="font-semibold text-stone-900">Total</span>
              <span className="font-semibold text-stone-900">
                ${years[active].total_rate.toFixed(2)}
              </span>
            </div>
            {years[active].rate_source?.url && (
              <a
                href={years[active].rate_source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-brand-700 underline"
              >
                Source
              </a>
            )}
            {REVALUATION_YEARS.includes(years[active].tax_year) && (
              <div className="mt-1 text-stone-500">Revaluation year</div>
            )}
          </div>
        )}

        {/* the bars */}
        <div className="flex h-56 items-end gap-[2px]" role="img"
             aria-label={`Total tax rate per thousand dollars of assessed value by year, ${years[0].total_rate} dollars in ${years[0].tax_year} and ${years[n - 1].total_rate} dollars in ${years[n - 1].tax_year}`}>
          {years.map((y, i) => (
            <button
              type="button"
              key={y.tax_year}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 cursor-pointer flex-col justify-end"
              aria-label={`Tax year ${y.tax_year}: total $${y.total_rate.toFixed(2)} per thousand`}
            >
              {RATE_PARTS.map((p) => (
                <div
                  key={p.key}
                  className="w-full transition-opacity"
                  style={{
                    height: `${(y.components[p.key] / maxTotal) * 100}%`,
                    backgroundColor: p.color,
                    opacity: active === null || active === i ? 1 : 0.45,
                  }}
                />
              ))}
            </button>
          ))}
        </div>

        {/* the axis */}
        <div className="mt-1 flex gap-[2px]">
          {years.map((y, i) => (
            <div key={y.tax_year} className="flex-1 text-center">
              <span className={`text-[10px] text-stone-500 ${i % 2 === 1 ? "hidden sm:inline" : ""}`}>
                {`’${String(y.tax_year).slice(2)}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* the legend */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {RATE_PARTS.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5 text-xs text-stone-600">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.label}
          </li>
        ))}
      </ul>

      {/* revaluation note */}
      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs leading-relaxed text-amber-900">
          <strong>Revaluation years: 2019 and 2024.</strong> The town re-values
          property periodically. When it does, assessed values jump, so the rate
          falls even when the amount being raised does not. A rate in 2019 or
          2024 is not directly comparable to the year before it.
        </p>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Rates are set each autumn by the NH Department of Revenue Administration
        and are what you actually pay per $1,000 of assessed value. Tap or hover
        any bar for that year&apos;s four parts and its source.
      </p>
    </figure>
  );
}

// ---------------------------------------------------------------------
// 2. The optional state context bands. Off by default.
// ---------------------------------------------------------------------

function BandRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-1.5">
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="relative h-5 overflow-hidden rounded border border-stone-200 bg-stone-50">
        {children}
      </div>
    </div>
  );
}

export function PartisanBands({
  bands,
  years,
}: {
  bands: PartisanBandsFile;
  years: TaxYear[];
}) {
  // Off by default. The #context fragment turns it on so the view can be
  // linked to and shared - a hash is read client-side, so the page still
  // prerenders as static HTML.
  const [on, setOn] = useState(false);
  useEffect(() => {
    const apply = () => setOn(window.location.hash === "#context");
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const first = years[0].tax_year;
  const last = years[years.length - 1].tax_year;
  const n = years.length;

  // Decimal year -> percentage across the plot.
  const pos = (d: number) => ((d - first + 0.5) / n) * 100;

  const governors = bands.bands.filter((b) => b.office.startsWith("NH Governor"));
  const senators = bands.bands.filter((b) => b.office === "NH State Senator");
  const house = bands.house_delegation_summary;

  const clip = (start: string, end: string | null) => {
    const s = Math.max(first, decimalYear(start));
    const e = end ? Math.min(last + 1, decimalYear(end)) : last + 1;
    if (e <= s) return null;
    return { left: pos(s), width: pos(e) - pos(s) };
  };

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-sm font-medium text-stone-900">
          Show who represented Pembroke in state government
        </span>
      </label>

      {on && (
        <>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            <strong>Context only. State officials do not set Pembroke&apos;s town or
            school budgets.</strong> The town budget is voted at Town Meeting and
            the school budget at the School District Meeting, both by the
            residents of Pembroke. The state sets the state education portion of
            the rate and the state aid formulas, which affect the school portion.
          </p>

          <div className="mt-3">
            <BandRow label="NH Governor">
              {governors.map((b, i) => {
                const c = clip(b.start, b.end);
                if (!c) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${c.left}%`, width: `${c.width}%`, backgroundColor: PARTY_COLOR[b.party] }}
                    title={`${b.person} (${PARTY_LABEL[b.party]}), ${b.start} to ${b.end ?? "present"}`}
                  />
                );
              })}
            </BandRow>

            <BandRow label="NH State Senator (District 17)">
              {senators.map((b, i) => {
                const c = clip(b.start, b.end);
                if (!c) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${c.left}%`, width: `${c.width}%`, backgroundColor: PARTY_COLOR[b.party] }}
                    title={`${b.person} (${PARTY_LABEL[b.party]}), ${b.start} to ${b.end ?? "present"}`}
                  />
                );
              })}
            </BandRow>

            <BandRow label="NH House delegation for Pembroke">
              {house.map((h, i) => {
                const c = clip(h.start, h.end);
                if (!c) return null;
                const seats = h.seats || 1;
                // Widths are a share of THIS band, not of the whole chart -
                // a percentage inside a positioned parent is relative to
                // that parent.
                const rPct = (h.R / seats) * 100;
                const dPct = (h.D / seats) * 100;
                return (
                  <div key={i} className="absolute top-0 bottom-0" style={{ left: `${c.left}%`, width: `${c.width}%` }}
                       title={`${h.district}: ${h.R} Republican, ${h.D} Democrat`}>
                    {h.R > 0 && (
                      <div className="absolute left-0 top-0 bottom-0" style={{ width: `${rPct}%`, backgroundColor: PARTY_COLOR.R }} />
                    )}
                    {h.D > 0 && (
                      <div className="absolute top-0 bottom-0" style={{ left: `${rPct}%`, width: `${dPct}%`, backgroundColor: PARTY_COLOR.D }} />
                    )}
                  </div>
                );
              })}
            </BandRow>
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PARTY_COLOR.D }} />
              Democrat
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PARTY_COLOR.R }} />
              Republican
            </li>
          </ul>

          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-stone-600">
            <li>
              <strong>2012:</strong> the state House district was redrawn. Pembroke
              moved from Merrimack 7 to Merrimack 20.
            </li>
            <li>
              <strong>2022:</strong> the district was redrawn again. Pembroke moved
              from Merrimack 20 to Merrimack 12.
            </li>
            <li>
              No party is assigned to the Select Board, the School Board or the
              Budget Committee. They are elected on nonpartisan ballots.
            </li>
          </ul>

          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            {bands.note}
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 3. The budget chart: what voters approved, in dollars.
// ---------------------------------------------------------------------

export interface BudgetPoint {
  year: number;
  school: number | null;
  schoolFy: string | null;
  schoolMeeting: string | null;
  schoolNote: string | null;
  schoolUrl: string | null;
  town: number | null;
  townNote: string | null;
  townUrl: string | null;
}

export function BudgetChart({ points }: { points: BudgetPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const W = 680;
  const H = 250;
  const PAD_L = 54;
  const PAD_R = 18;
  const PAD_T = 14;
  const PAD_B = 32;

  const n = points.length;
  const vals = points.flatMap((p) => [p.school, p.town]).filter((v): v is number => v !== null);
  const maxV = Math.ceil(Math.max(...vals) / 5_000_000) * 5_000_000;

  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / (n - 1);
  const y = (v: number) => PAD_T + (1 - v / maxV) * (H - PAD_T - PAD_B);

  /** Build a path, breaking it wherever the value is null. */
  const path = (pick: (p: BudgetPoint) => number | null) => {
    const segs: string[] = [];
    let cur: string[] = [];
    points.forEach((p, i) => {
      const v = pick(p);
      if (v === null) {
        if (cur.length) segs.push(cur.join(" "));
        cur = [];
        return;
      }
      cur.push(`${cur.length ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    });
    if (cur.length) segs.push(cur.join(" "));
    return segs;
  };

  const schoolPath = path((p) => p.school);
  const townPath = path((p) => p.town);

  const grid = [0, maxV / 3, (2 * maxV) / 3, maxV];

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-semibold text-stone-900">
          Budgets by year
        </span>
        <span className="text-xs text-stone-500">
          voter-approved operating budgets, in dollars
        </span>
      </figcaption>

      <div className="relative">
        {active !== null && points[active] && (
          <div
            className="pointer-events-none absolute -top-1 z-20 w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs shadow-lg"
            style={{ left: `${Math.min(80, Math.max(20, (active / (n - 1)) * 100))}%` }}
          >
            <div className="font-semibold text-stone-900">{points[active].year}</div>
            <div className="mt-1">
              <div className="font-medium text-stone-700">School</div>
              <div className="text-stone-600">
                {points[active].schoolFy ?? "not available"}
                {points[active].schoolMeeting ? ` · voted ${points[active].schoolMeeting}` : ""}
              </div>
              <div className="font-semibold text-stone-900">{money(points[active].school)}</div>
              {points[active].schoolNote && (
                <div className="mt-0.5 text-[11px] leading-snug text-stone-500">{points[active].schoolNote}</div>
              )}
            </div>
            <div className="mt-1.5">
              <div className="font-medium text-stone-700">Town</div>
              <div className="font-semibold text-stone-900">{money(points[active].town)}</div>
              {points[active].townNote && (
                <div className="mt-0.5 text-[11px] leading-snug text-stone-500">{points[active].townNote}</div>
              )}
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
             aria-label="Voter-approved school and town operating budgets by year">
          {grid.map((g, i) => (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} stroke="#e7e5e4" strokeWidth="1" />
              <text x={PAD_L - 8} y={y(g) + 4} textAnchor="end" fontSize="10" fill="#78716c">
                {g === 0 ? "$0" : `$${(g / 1_000_000).toFixed(0)}M`}
              </text>
            </g>
          ))}

          {schoolPath.map((d, i) => (
            <path key={`s${i}`} d={d} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {townPath.map((d, i) => (
            <path key={`t${i}`} d={d} fill="none" stroke="#db2777" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {points.map((p, i) => (
            <g key={p.year}>
              {p.school !== null && (
                <circle cx={x(i)} cy={y(p.school)} r="3.5" fill="#0f766e" stroke="white" strokeWidth="1.5" />
              )}
              {p.town !== null && (
                <circle cx={x(i)} cy={y(p.town)} r="3.5" fill="#db2777" stroke="white" strokeWidth="1.5" />
              )}
              {i % 2 === 0 && (
                <text x={x(i)} y={H - PAD_B + 15} textAnchor="middle" fontSize="10" fill="#57534e">
                  {p.year}
                </text>
              )}
            </g>
          ))}

          {/* the hover targets */}
          {points.map((p, i) => (
            <rect
              key={`h${p.year}`}
              x={x(i) - (W - PAD_L - PAD_R) / (n - 1) / 2}
              y={PAD_T}
              width={(W - PAD_L - PAD_R) / (n - 1)}
              height={H - PAD_T - PAD_B}
              fill="transparent"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              onBlur={() => setActive(null)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <li className="flex items-center gap-1.5 text-xs text-stone-600">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#0f766e" }} />
          School operating budget (fiscal year voted the prior March)
        </li>
        <li className="flex items-center gap-1.5 text-xs text-stone-600">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#db2777" }} />
          Town operating budget (calendar year)
        </li>
      </ul>

      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        A gap in a line means the figure was not found or could not be confirmed
        &mdash; it does not mean zero. These are the operating budgets only and
        exclude separate warrant articles. The school budget is not net of state
        aid or other revenue, so it is not the same thing as the local education
        part of the tax rate.
      </p>
    </figure>
  );
}
