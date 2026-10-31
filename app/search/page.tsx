// app/search/page.tsx — search the text of every published minute.
//
// The archive at /archive browses by month and committee. This is the
// other half: the words inside the documents. 593 documents, about 2.1
// million characters, searched word for word.

import { MinutesSearch } from "@/components/MinutesSearch";
import { ShareButton } from "@/components/ShareButton";
import { loadTaxHistory } from "@/lib/tax-history";

export const revalidate = 3600;

export const metadata = {
  title: "Search the minutes — Pembroke, NH",
  description:
    "Search the full text of every published Pembroke meeting minute — Select Board, Planning Board, Budget Committee, Sewer Commission and more. Search a street, a topic or a name.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search the Pembroke minutes",
    description:
      "Every published Pembroke meeting minute, searchable word for word.",
    url: "/search",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Pembroke, NH" }],
  },
};

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").toString();
  const tax = loadTaxHistory();
  const span =
    tax?.years?.length
      ? `${tax.years[0].tax_year}–${tax.years[tax.years.length - 1].tax_year}`
      : null;

  return (
    <div className="container-page">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Search the minutes
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Every published meeting minute the town has posted — Select Board,
          Planning Board, Budget Committee, Sewer Commission, Water Works and
          the rest — searched word for word, not just the titles.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ShareButton
            url={q ? `/search?q=${encodeURIComponent(q)}` : "/search"}
            title="Search the Pembroke minutes"
            body="Search the full text of every published Pembroke meeting minute."
          />
        </div>
      </header>

      <div className="rounded-lg border border-stone-300 bg-white p-5">
        <MinutesSearch initialQuery={q} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-900">
            Looking for something else?
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <a href="/archive" className="text-brand-700 underline underline-offset-2">
                Browse the archive
              </a>{" "}
              <span className="text-stone-600">
                by month and committee
              </span>
            </li>
            <li>
              <a href="/decisions" className="text-brand-700 underline underline-offset-2">
                How the town decides things
              </a>{" "}
              <span className="text-stone-600">
                — every motion and vote in one place
              </span>
            </li>
            <li>
              <a href="/ask" className="text-brand-700 underline underline-offset-2">
                Ask
              </a>{" "}
              <span className="text-stone-600">
                — a plain question, a plain answer
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-sm font-semibold text-stone-900">
            What is in the archive
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            630 documents on file, 593 of them with readable text. The
            minutes from 2018 and earlier are scans read by OCR, so a name or
            a street spelled unusually can be missed &mdash; if a search comes
            back empty, try a shorter word.
          </p>
          {span && (
            <p className="mt-2 text-xs text-stone-500">
              Tax and budget context for {span} is on the{" "}
              <a href="/taxes/history" className="underline">
                tax history page
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
