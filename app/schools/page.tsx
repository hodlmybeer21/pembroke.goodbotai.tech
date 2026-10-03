// app/schools/page.tsx — Schools serving Pembroke residents.
//
// SAU 53 (School Administrative Unit 53) covers Pembroke's K-12 students.
// The district operates Three Rivers School (K-4) and Pembroke Academy
// (5-12). Their calendar lives on the SchoolBlocks CMS, which is a JS SPA
// and not easily scrapable — we link out rather than embed.

import type { Metadata } from "next";
import { RelatedPages } from "@/components/RelatedPages";

export const metadata: Metadata = {
  title: "Schools — Pembroke, NH",
  description:
    "SAU 53 schools serving Pembroke, NH: Three Rivers School (K-4) and Pembroke Academy (5-12). Calendars, board meetings, and school resources.",
};

interface SchoolLink {
  name: string;
  level: string;
  url: string;
  notes: string;
}

const SCHOOLS: SchoolLink[] = [
  {
    name: "SAU 53 (district office)",
    level: "District administration",
    url: "https://www.sau53.org/",
    notes:
      "Superintendent's office, school board agendas, district policies, and budget. The school board meets monthly; agendas are posted the Friday before each meeting.",
  },
  {
    name: "Three Rivers School",
    level: "K-4 elementary",
    url: "https://www.threeriverssau53.org/",
    notes:
      "Pembroke's elementary school. Serves roughly 350 students across K-4. Drop-off/pickup is on Route 3; watch the school zone speed limit.",
  },
  {
    name: "Pembroke Academy",
    level: "5-12 middle + high school",
    url: "https://www.pembrokeacademy.org/",
    notes:
      "Pembroke's middle and high school. Roughly 600 students. Athletics, arts, and the public graduation ceremony each June.",
  },
];

const QUICK_RESOURCES = [
  { label: "District calendar", url: "https://www.sau53.org/en-US/calendar" },
  { label: "School board meeting agendas", url: "https://www.sau53.org/en-US/board-meetings" },
  { label: "Bus routes & transportation", url: "https://www.sau53.org/en-US/transportation" },
  { label: "Lunch menus", url: "https://www.sau53.org/en-US/food-services" },
  { label: "School cancellation / delays", url: "https://www.sau53.org/" },
  { label: "Register a new student", url: "https://www.sau53.org/en-US/registration" },
];

export default function SchoolsPage() {
  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Schools
        </h1>
        <p className="text-stone-600 mt-2">
          Pembroke students attend schools in SAU 53. Here's how to find
          calendars, board agendas, and the day-to-day stuff.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="font-serif text-base uppercase tracking-wider text-stone-500 pb-2 mb-3 border-b border-stone-200">
          The schools
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SCHOOLS.map((s) => (
            <li key={s.name} className="surface p-4">
              <div className="text-sm font-medium text-stone-900">
                <a className="underline" href={s.url}>{s.name}</a>
              </div>
              <div className="text-xs text-stone-500 mt-0.5">{s.level}</div>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                {s.notes}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-base uppercase tracking-wider text-stone-500 pb-2 mb-3 border-b border-stone-200">
          Quick resources
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {QUICK_RESOURCES.map((r) => (
            <li key={r.url}>
              <a
                className="block surface p-3 text-sm text-stone-700 hover:text-brand-700 hover:border-brand-500"
                href={r.url}
              >
                <span className="font-medium">{r.label}</span>
                <span className="block text-xs text-stone-500 mt-0.5">
                  {r.url}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 surface p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-2">
          What's missing here
        </h2>
        <p className="text-sm text-stone-700 leading-relaxed">
          SAU 53 uses a SchoolBlocks CMS, which is a heavy JavaScript site.
          We don't currently pull school events or board agendas into the
          daily brief. If you want a school event on this site, the
          workaround is: check the{" "}
          <a className="underline" href="https://www.sau53.org/en-US/calendar">
            SAU 53 calendar
          </a>{" "}
          directly. If you'd like a more integrated view, that's a real
          build — let us know.
        </p>
      </section>

      <p className="text-xs text-stone-500 mt-12 pt-6 border-t border-stone-200">
        School URLs verified from sau53.org. Calendar links may shift when
        the district redesigns their site; let us know if a link breaks.
      </p>

      <RelatedPages page="schools" />
    </div>
  );
}