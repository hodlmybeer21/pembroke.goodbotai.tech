// app/taxes/history/page.tsx — how Pembroke's tax rate and budgets have
// changed since 2010.
//
// Every number on this page was compiled and verified by the Chief of
// Staff and committed as data. Nothing here is derived at build time and
// nothing is re-derived in the browser. A value that could not be
// confirmed stays null and is shown as a gap with its note.
//
// The page is deliberately careful about one thing: it does not say that
// any person, party or body raised or lowered a tax rate or a budget.
// It shows what was voted and what was set, and leaves the reading to
// the resident.

import { loadPartisanBands, loadTaxHistory, readTaxHistoryDoc } from "@/lib/tax-history";
import {
  BudgetChart,
  PartisanBands,
  RateStackChart,
  type BudgetPoint,
} from "@/components/TaxHistoryCharts";
import { DocMarkdown } from "@/components/DocMarkdown";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 86400;

export const metadata = {
  title: "Tax rate history, 2010–2025 — Pembroke, NH",
  description:
    "Pembroke's total property tax rate by year, split into municipal, county, state education and local education, with the school and town operating budgets voters approved. Includes revaluation years and known data gaps.",
  openGraph: {
    title: "How Pembroke's tax rate has changed since 2010",
    description:
      "Sixteen years of tax rates, four parts each, and the budgets residents voted — with the gaps marked.",
    images: [{ url: "/og-tax-history.png", width: 1200, height: 630, alt: "Pembroke tax rate history" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How Pembroke's tax rate has changed since 2010",
    images: ["/og-tax-history.png"],
  },
};

const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function fmtMeeting(d: string | null): string | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d.trim());
  if (!m) return d;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[Number(m[2]) - 1];
  return m[3] ? `${month} ${Number(m[3])}, ${m[1]}` : `${month} ${m[1]}`;
}

function fmtLongDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function TaxHistoryPage() {
  const data = loadTaxHistory();
  const bands = loadPartisanBands();
  const sourcesDoc = readTaxHistoryDoc("SOURCES.md");
  const gapsDoc = readTaxHistoryDoc("GAPS.md");

  if (!data || !data.years?.length) {
    return (
      <div className="container-page">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Tax rate history
        </h1>
        <p className="mt-3 text-stone-600">
          This data hasn&apos;t been loaded yet.
        </p>
      </div>
    );
  }

  const years = [...data.years].sort((a, b) => a.tax_year - b.tax_year);

  // One point per calendar year. The school budget voted in March of
  // year Y is the budget for fiscal year Y+1, so it is plotted at Y.
  const budgetPoints: BudgetPoint[] = [];
  for (const y of years) {
    budgetPoints.push({
      year: y.tax_year,
      school: y.school_budget?.approved_operating_budget_usd ?? null,
      schoolFy: y.school_budget?.fiscal_year ?? null,
      schoolMeeting: fmtMeeting(y.school_budget?.meeting_date ?? null),
      schoolNote: y.school_budget?.note ?? null,
      schoolUrl: y.school_budget?.url ?? null,
      town: y.town_budget?.approved_operating_budget_usd ?? null,
      townNote: y.town_budget?.note ?? null,
      townUrl: y.town_budget?.url ?? null,
    });
  }
  const extraSchool = data.school_budget_extra?.meeting_2026;
  if (extraSchool) {
    budgetPoints.push({
      year: 2026,
      school: extraSchool.approved_operating_budget_usd ?? null,
      schoolFy: extraSchool.fiscal_year ?? null,
      schoolMeeting: fmtMeeting(extraSchool.meeting_date ?? null),
      schoolNote: extraSchool.note ?? null,
      schoolUrl: extraSchool.url ?? null,
      town: data.school_budget_extra?.town_2026?.approved_operating_budget_usd ?? null,
      townNote: data.school_budget_extra?.town_2026?.note ?? null,
      townUrl: data.school_budget_extra?.town_2026?.url ?? null,
    });
  }

  const first = years[0];
  const last = years[years.length - 1];
  const rateChange = Math.round(((last.total_rate - first.total_rate) / first.total_rate) * 1000) / 10;

  return (
    <div className="container-page">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Tax rate history, {first.tax_year}&ndash;{last.tax_year}
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          What Pembroke residents pay per $1,000 of assessed value, split into its
          four parts, and the operating budgets they voted &mdash; school and town.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-stone-500">
            Data as of {fmtLongDate(data.as_of)}
          </span>
          <ShareButton
            url="/taxes/history"
            title="Pembroke tax rate history"
            body="Sixteen years of Pembroke's tax rate by part, and the school and town budgets residents voted."
          />
        </div>
      </header>

      {/* The nonpartisan note. It goes first, not last, because everything
          below it should be read with it in mind. */}
      <section className="mb-6 rounded-lg border-2 border-stone-300 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          How Pembroke&apos;s taxes are actually set
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
          <li className="flex gap-2">
            <span className="text-stone-400" aria-hidden="true">&bull;</span>
            <span>
              Pembroke&apos;s <strong>Select Board, School Board and Budget Committee are
              nonpartisan</strong>. They are elected on ballots that do not list a party,
              and no party is assigned to any of them.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-stone-400" aria-hidden="true">&bull;</span>
            <span>
              The <strong>school operating budget</strong> is set by voters at the annual
              School District Meeting, and the <strong>town operating budget</strong> by
              voters at Town Meeting. Both are Pembroke residents voting.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-stone-400" aria-hidden="true">&bull;</span>
            <span>
              The <strong>state education</strong> portion of the rate and the state aid
              formulas are set by the state, and changes to them affect the school portion
              of the rate.
            </span>
          </li>
        </ul>
        <p className="mt-3 border-t border-stone-200 pt-3 text-xs leading-relaxed text-stone-500">
          This page reports what was voted and what was set. It does not claim that any
          person, party or body caused a rate or budget to rise or fall, and it does not
          rank or grade anyone.
        </p>
      </section>

      {/* --- the rate chart --- */}
      <section className="mb-8 rounded-lg border border-stone-300 bg-white p-5">
        <h2 className="font-serif text-xl font-semibold text-stone-900">
          The tax rate, year by year
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          The total rate in {last.tax_year} is ${last.total_rate.toFixed(2)} per $1,000,{" "}
          {rateChange >= 0 ? "up" : "down"} {Math.abs(rateChange)}% from{" "}
          ${first.total_rate.toFixed(2)} in {first.tax_year}. Read that with the
          revaluation years in mind: a rate can fall because assessed values rose.
        </p>
        <div className="mt-5">
          <RateStackChart years={years} />
        </div>
        {bands && (
          <PartisanBands bands={bands} years={years} />
        )}
      </section>

      {/* --- the budget chart --- */}
      <section className="mb-8 rounded-lg border border-stone-300 bg-white p-5">
        <h2 className="font-serif text-xl font-semibold text-stone-900">
          What voters approved
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          The operating budgets residents voted, in dollars. The school budget is the
          one for the fiscal year that begins the following July, voted the previous
          March.
        </p>
        <div className="mt-5">
          <BudgetChart points={budgetPoints} />
        </div>

        {/* the same numbers in a form a screen reader and a resident can both use */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                <th className="py-1.5 pr-3 font-semibold text-stone-700">Year</th>
                <th className="py-1.5 pr-3 text-right font-semibold text-stone-700">School operating budget</th>
                <th className="py-1.5 pr-3 text-right font-semibold text-stone-700">Town operating budget</th>
              </tr>
            </thead>
            <tbody>
              {budgetPoints.map((p) => (
                <tr key={p.year} className="border-b border-stone-200 align-top">
                  <td className="py-2 pr-3 text-stone-900">{p.year}</td>
                  <td className="py-2 pr-3 text-right text-stone-700">
                    {p.school !== null ? (
                      <>
                        <span className="font-medium text-stone-900">{money(p.school)}</span>
                        <span className="block text-xs text-stone-500">
                          {p.schoolFy}
                          {p.schoolMeeting ? ` · voted ${p.schoolMeeting}` : ""}
                        </span>
                        {p.schoolNote && (
                          <span className="mt-0.5 block text-xs italic leading-snug text-stone-500">
                            {p.schoolNote}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-stone-500">
                        not available
                        {p.schoolNote ? (
                          <span className="mt-0.5 block italic leading-snug">{p.schoolNote}</span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right text-stone-700">
                    {p.town !== null ? (
                      <>
                        <span className="font-medium text-stone-900">{money(p.town)}</span>
                        {p.townNote && (
                          <span className="mt-0.5 block text-xs italic leading-snug text-stone-500">
                            {p.townNote}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-stone-500">
                        not available
                        {p.townNote ? (
                          <span className="mt-0.5 block italic leading-snug">{p.townNote}</span>
                        ) : null}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- method notes carried in the data --- */}
      {data.notes?.length > 0 && (
        <section className="mb-8 rounded-lg border border-stone-300 bg-white p-5">
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            How to read these numbers
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            {data.notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-stone-400" aria-hidden="true">&bull;</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- sources --- */}
      {sourcesDoc && (
        <section className="mb-8 rounded-lg border border-stone-300 bg-white p-5">
          <h2 className="font-serif text-xl font-semibold text-stone-900">Sources</h2>
          <p className="mt-1 text-sm text-stone-600">
            Every figure above comes from one of these.
          </p>
          <div className="mt-3">
            <DocMarkdown text={sourcesDoc} />
          </div>
        </section>
      )}

      {/* --- known gaps --- */}
      {gapsDoc && (
        <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-serif text-xl font-semibold text-stone-900">Known gaps</h2>
          <p className="mt-1 text-sm text-amber-900/80">
            What is missing, what is only partly confirmed, and what to be careful about.
            A number that is not here was not found &mdash; it was not guessed.
          </p>
          <div className="mt-3">
            <DocMarkdown text={gapsDoc} />
          </div>
        </section>
      )}

      <p className="mb-8 text-xs leading-relaxed text-stone-500">
        Data as of {fmtLongDate(data.as_of)}. Coverage: {data.coverage} This is an
        unofficial information site, not a town document. For the official record, see{" "}
        <a href="https://www.pembroke-nh.com" target="_blank" rel="noopener noreferrer" className="underline">
          pembroke-nh.com
        </a>
        .
      </p>
    </div>
  );
}
