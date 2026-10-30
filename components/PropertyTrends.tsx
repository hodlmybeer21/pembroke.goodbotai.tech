"use client";

// components/PropertyTrends.tsx — visual analytics for the property page.
//
// Two questions a resident actually has, answered with the town's own data:
//   1. Are home values going up or down?
//   2. Is the town's assessment in line with the market, and what does it
//      mean for my tax bill?
//
// Charts are hand-rolled inline SVG rather than a charting library - two
// charts don't justify 40KB of JavaScript on a page residents open on a
// phone over cellular.

import Link from "next/link";
import { useMemo } from "react";

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

export interface SizeBand {
  label: string;
  count: number;
  median_psf: number | null;
  median_price: number | null;
}

export interface TrendsFile {
  generated_at: string;
  tax_rate: number;
  tax_rate_history: Record<string, number>;
  tax_rate_source?: string;
  tax_breakdown?: Array<{
    label: string;
    rate: number;
    pct: number;
  }>;
  parcel_count: number;
  years: TrendYear[];
  size_bands: SizeBand[];
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

const money = (n: number | null) =>
  n === null || n === undefined
    ? "—"
    : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

// Colours for the "where your tax dollar goes" bar. Chosen to stay
// readable against white text and to remain distinguishable for the most
// common forms of colour blindness.
const BREAKDOWN_COLORS = ["#1e3a8a", "#b45309", "#0f766e", "#9d174d"];

// ---------------------------------------------------------------- chart 1
// Median sale price per square foot, by year.
function PricePerSqftChart({ years }: { years: TrendYear[] }) {
  const data = years.filter((y) => y.median_psf !== null);
  if (data.length < 2) return null;

  const W = 620;
  const H = 200;
  const PAD_L = 42;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 30;

  const vals = data.map((d) => d.median_psf as number);
  const min = Math.floor((Math.min(...vals) - 20) / 25) * 25;
  const max = Math.ceil((Math.max(...vals) + 20) / 25) * 25;

  const x = (i: number) =>
    PAD_L + (i * (W - PAD_L - PAD_R)) / (data.length - 1);
  const y = (v: number) =>
    PAD_T + (1 - (v - min) / (max - min || 1)) * (H - PAD_T - PAD_B);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.median_psf as number)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - PAD_B} L${x(0)},${H - PAD_B} Z`;

  const first = data[0].median_psf as number;
  const last = data[data.length - 1].median_psf as number;
  const change = Math.round(((last - first) / first) * 100);

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-semibold text-stone-900">
          What a Pembroke home sells for, per square foot
        </span>
        <span className="text-sm font-medium text-green-700">
          {change >= 0 ? `+${change}%` : `${change}%`} since {data[0].year}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
           aria-label={`Median sale price per square foot by year, ${first} dollars per square foot in ${data[0].year} rising to ${last} dollars in ${data[data.length - 1].year}`}>
        <defs>
          <linearGradient id="psfFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[min, (min + max) / 2, max].map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#78716c">
              ${Math.round(v)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#psfFill)" />
        <path d={line} fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.year}>
            <circle cx={x(i)} cy={y(d.median_psf as number)} r="4" fill="#15803d" stroke="white" strokeWidth="2" />
            <text x={x(i)} y={H - PAD_B + 15} textAnchor="middle" fontSize="11" fill="#57534e">{d.year}</text>
            <text x={x(i)} y={y(d.median_psf as number) - 11} textAnchor="middle" fontSize="11" fontWeight="600" fill="#166534">
              ${Math.round(d.median_psf as number)}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-xs text-stone-500">
        Median across {data.reduce((n, d) => n + d.sales, 0)} arm&apos;s-length sales in the
        current assessment cycle. Bigger homes always cost less per square foot — see below.
      </p>
    </figure>
  );
}

// ---------------------------------------------------------------- chart 2
// Sale price as a multiple of the town's assessment, by year, with a
// parity line at 1.0. Crossing that line is the re-assessment catching up.
function AssessmentRatioChart({ years }: { years: TrendYear[] }) {
  const data = years.filter((y) => y.median_ratio !== null);
  if (data.length < 2) return null;

  const W = 620;
  const H = 200;
  const PAD_L = 42;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 30;

  const vals = data.map((d) => d.median_ratio as number);
  const min = Math.max(0.8, Math.floor((Math.min(...vals) - 0.1) * 10) / 10);
  const max = Math.ceil((Math.max(...vals) + 0.1) * 10) / 10;

  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / (data.length - 1);
  const y = (v: number) =>
    PAD_T + (1 - (v - min) / (max - min || 1)) * (H - PAD_T - PAD_B);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.median_ratio as number)}`).join(" ");

  return (
    <figure className="m-0">
      <figcaption className="mb-1">
        <span className="text-sm font-semibold text-stone-900">
          Sale price vs. the town&apos;s assessment
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
           aria-label="Median sale price as a multiple of the town assessment, by year, crossing the parity line of one times during 2023">
        {[min, 1.0, max].map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)}
              stroke={v === 1.0 ? "#b91c1c" : "#e7e5e4"}
              strokeWidth={v === 1.0 ? 1.5 : 1}
              strokeDasharray={v === 1.0 ? "4 3" : undefined}
            />
            <text x={PAD_L - 6} y={y(v) + 4} textAnchor="end" fontSize="10"
                  fill={v === 1.0 ? "#b91c1c" : "#78716c"}>
              {v === 1.0 ? "1.0×" : `${v.toFixed(1)}×`}
            </text>
          </g>
        ))}
        <path d={line} fill="none" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.year}>
            <circle cx={x(i)} cy={y(d.median_ratio as number)} r="4" fill="#1e3a8a" stroke="white" strokeWidth="2" />
            <text x={x(i)} y={H - PAD_B + 15} textAnchor="middle" fontSize="11" fill="#57534e">{d.year}</text>
            <text x={x(i)} y={y(d.median_ratio as number) - 11} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e3a8a">
              {(d.median_ratio as number).toFixed(2)}×
            </text>
          </g>
        ))}
        <text x={W - PAD_R} y={y(1.0) - 5} textAnchor="end" fontSize="10" fill="#b91c1c">
          sale price = assessed value
        </text>
      </svg>
      <p className="mt-1 text-xs text-stone-500">
        Below the line means homes were selling for less than the town&apos;s assessed value.
        The line climbing past 1.0 is the 2025 re-assessment catching up with the market — not
        prices soaring.
      </p>
    </figure>
  );
}

// ------------------------------------------------------------------ table
function SizeBandTable({ bands }: { bands: SizeBand[] }) {
  if (!bands.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-stone-900">
        Bigger homes cost less per square foot
      </h4>
      <p className="mt-0.5 text-xs text-stone-600">
        What recent arm&apos;s-length sales actually went for, by home size.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left">
              <th className="py-1.5 pr-3 font-medium text-stone-600">Home size</th>
              <th className="py-1.5 pr-3 text-right font-medium text-stone-600">Per sq ft</th>
              <th className="py-1.5 pr-3 text-right font-medium text-stone-600">Typical price</th>
              <th className="py-1.5 text-right font-medium text-stone-600">Sales</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b) => (
              <tr key={b.label} className="border-b border-stone-200">
                <td className="py-1.5 pr-3 text-stone-800">{b.label}</td>
                <td className="py-1.5 pr-3 text-right font-medium text-stone-900">
                  {b.median_psf ? `$${Math.round(b.median_psf)}` : "—"}
                </td>
                <td className="py-1.5 pr-3 text-right text-stone-700">{money(b.median_price)}</td>
                <td className="py-1.5 text-right text-stone-500">{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- main
export function PropertyTrends({ trends }: { trends: TrendsFile }) {
  const years = trends.years ?? [];
  const rate = trends.tax_rate;
  const hist = trends.tax_rate_history ?? {};
  const over = trends.possibly_over_assessed ?? [];
  const under = trends.possibly_under_assessed ?? [];
  const breakdown = trends.tax_breakdown ?? [];

  const rateUp = hist["2025"] && hist["2024"] ? Math.round(((hist["2025"] - hist["2024"]) / hist["2024"]) * 1000) / 10 : null;

  const chartRows = useMemo(() => years.map((y) => y.sales), [years]);
  const totalSales = chartRows.reduce((a, b) => a + b, 0);

  return (
    <section className="mt-8">
      <div className="rounded-lg border border-stone-300 bg-white p-5">
        <h2 className="font-serif text-xl font-semibold text-stone-900">
          What the numbers say
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Built from {trends.parcel_count} Pembroke parcels with a recent arm&apos;s-length sale.
        </p>

        {/* --- the tax rate, the number residents actually feel --- */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            Your tax bill is about {((rate / 1000) * 100).toFixed(2)}% of the assessed value
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-900/90">
            Pembroke&apos;s 2025 tax rate is <strong>${rate.toFixed(2)} per $1,000</strong> of
            assessed value
            {rateUp !== null ? (
              <>
                , up {rateUp}% from ${hist["2024"]} the year before
              </>
            ) : null} . Revaluation years make year-to-year rates hard to compare
            &mdash; see the{" "}
            <Link
              href="/taxes/history"
              className="font-medium underline underline-offset-2"
            >
              full tax history
            </Link>{" "}for the year-by-year detail.
            . Separately, the town&apos;s current assessments line up with what homes were selling
            for around 2022–2023 — homes sold in 2026 are going for roughly 30% more than the
            assessment says. Assessments are set periodically, not daily, so that gap is normal
            and expected.
          </p>

          {breakdown.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Where your tax dollar goes
              </h4>
              <div className="mt-2 flex h-6 w-full overflow-hidden rounded-md border border-amber-300">
                {breakdown.map((b, i) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
                    }}
                    title={`${b.label}: $${b.rate} per $1,000 (${b.pct}%)`}
                  >
                    {b.pct >= 8 ? `${b.pct}%` : ""}
                  </div>
                ))}
              </div>
              <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {breakdown.map((b, i) => (
                  <li key={b.label} className="flex items-center gap-2 text-xs text-amber-900/90">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }}
                    />
                    <span className="flex-1">{b.label}</span>
                    <span className="font-semibold">${b.rate.toFixed(2)}</span>
                    <span className="text-amber-700/70">{b.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Median bill, town-wide" value={money(trends.tax_bill?.median)} sub="per year" />
            <Tile label="On a $300k home" value={money(trends.tax_bill?.on_300k)} sub="per year" />
            <Tile label="On a $450k home" value={money(trends.tax_bill?.on_450k)} sub="per year" />
            <Tile label="Most homes fall between" value={`${money(trends.tax_bill?.p10)}–${money(trends.tax_bill?.p90)}`} sub="per year" />
          </div>
          <p className="mt-2 text-xs text-amber-900/70">
            Rate set by the NH Department of Revenue Administration on October 22, 2025. Bills are
            before any exemptions or veteran&apos;s credits you may qualify for.
          </p>
        </div>

        {/* --- charts --- */}
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <PricePerSqftChart years={years} />
          <AssessmentRatioChart years={years} />
        </div>

        {/* --- size bands --- */}
        <div className="mt-8 border-t border-stone-200 pt-5">
          <SizeBandTable bands={trends.size_bands ?? []} />
        </div>

        {/* --- the outlier lists --- */}
        {(over.length > 0 || under.length > 0) && (
          <div className="mt-8 grid gap-6 border-t border-stone-200 pt-5 lg:grid-cols-2">
            {over.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-stone-900">
                  Possibly over-assessed
                </h4>
                <p className="mt-0.5 text-xs text-stone-600">
                  Recent sales where the town&apos;s assessment came in over 20% above what the
                  home sold for. If one of these is yours, it may be worth asking the assessor
                  about it — an over-assessment means paying tax on value the market didn&apos;t
                  agree with.
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {over.map((o) => (
                    <li key={o.address} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-stone-100 pb-1.5">
                      <span className="font-medium text-stone-900">{o.address}</span>
                      <span className="text-xs text-stone-600">
                        sold {money(o.sale_price)} vs assessed {money(o.assessed)} ·{" "}
                        <span className="font-semibold text-red-700">{o.pct.toFixed(0)}%</span> ·{" "}
                        bill {money(o.tax_bill)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {under.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-stone-900">
                  Assessing well under market
                </h4>
                <p className="mt-0.5 text-xs text-stone-600">
                  The other side of the coin. The owner is paying tax on less than the home is
                  worth, so these are the properties most likely to take a bigger hit at the next
                  re-assessment.
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {under.slice(0, 8).map((o) => (
                    <li key={o.address} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-stone-100 pb-1.5">
                      <span className="font-medium text-stone-900">{o.address}</span>
                      <span className="text-xs text-stone-600">
                        sold {money(o.sale_price)} vs assessed {money(o.assessed)} ·{" "}
                        <span className="font-semibold text-green-700">+{o.pct.toFixed(0)}%</span> ·{" "}
                        bill {money(o.tax_bill)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">
          {totalSales} arm&apos;s-length sales since 2022 are behind these figures. Sales that
          weren&apos;t open-market transactions — family transfers, court sales, foreclosures —
          are excluded, because they don&apos;t tell you what the market will pay. The town&apos;s
          assessment is a tax number set at the last re-assessment, not an appraisal of
          today&apos;s market value.
        </p>
      </div>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-white/70 px-3 py-2">
      <div className="font-serif text-lg font-semibold text-stone-900">{value}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-stone-600">
        {label}
        {sub ? <span className="block text-stone-400">{sub}</span> : null}
      </div>
    </div>
  );
}
