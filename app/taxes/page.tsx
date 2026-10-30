// app/taxes/page.tsx — the index for anything tax-related.
//
// This route used to 404. It is now a small landing page that points at
// the two places a resident is actually looking for: the history of the
// rate, and what their own house is being taxed at.

import Link from "next/link";
import { loadTaxHistory } from "@/lib/tax-history";

export const revalidate = 86400;

export const metadata = {
  title: "Pembroke taxes — Pembroke, NH",
  description:
    "Pembroke's property tax rate history since 2010, and how your home's assessed value compares to what homes sell for.",
};

export default function TaxesPage() {
  const data = loadTaxHistory();
  const years = data?.years?.length ?? 0;
  const last = data?.years?.length
    ? [...data.years].sort((a, b) => a.tax_year - b.tax_year).slice(-1)[0]
    : null;

  return (
    <div className="container-page">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Taxes in Pembroke
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Two things residents ask about most: what the rate has done over the years,
          and what their own house is being taxed at.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/taxes/history"
          className="rounded-lg border border-stone-300 bg-white p-5 transition-colors hover:border-stone-400"
        >
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Tax rate history
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            {years
              ? `${data?.years?.[0]?.tax_year}–${last?.tax_year}, split into municipal, county, state education and local education, with the budgets residents voted.`
              : "The rate by year, split into its four parts, with the budgets residents voted."}
          </p>
          <p className="mt-2 text-sm font-medium text-brand-700">See the history →</p>
        </Link>

        <Link
          href="/property-values"
          className="rounded-lg border border-stone-300 bg-white p-5 transition-colors hover:border-stone-400"
        >
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            What your house is taxed at
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            Every recent sale next to the town&apos;s assessed value, what your tax bill
            comes to, and how the town&apos;s assessment compares with what homes sell
            for.
          </p>
          <p className="mt-2 text-sm font-medium text-brand-700">See sale values →</p>
        </Link>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-stone-500">
        An unofficial information site, not a town document. For the official record,
        see{" "}
        <a
          href="https://www.pembroke-nh.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          pembroke-nh.com
        </a>
        .
      </p>
    </div>
  );
}
