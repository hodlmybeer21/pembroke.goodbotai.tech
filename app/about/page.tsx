// app/about/page.tsx — About this site.
//
// v6 era: describes the actual feature set as of late 2026.

import Link from "next/link";

export const metadata = {
  title: "About — Pembroke, NH",
  description:
    "pembroke.goodbotai.tech is a free, public, third-party site for Pembroke, NH residents. Surfaces what town government is doing in plain English.",
};

export default function AboutPage() {
  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          About this site
        </h1>
        <p className="text-stone-600 mt-2 text-base">
          A free, public site for residents of Pembroke, New Hampshire. Surfaces
          what's happening in town government in plain English.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            What's here
          </h2>
          <ul className="space-y-2 text-sm text-stone-700">
            <li>
              <Link className="underline" href="/">Daily brief</Link> — meetings
              in the next 90 days, grouped by what affects you (your wallet,
              your commute, your kids, your property, your community).
            </li>
            <li>
              <Link className="underline" href="/calendar">Calendar</Link> —
              all upcoming Select Board, Planning Board, Budget Committee, and
              Roads Committee meetings.
            </li>
            <li>
              <Link className="underline" href="/agendas">Agendas</Link> and{" "}
              <Link className="underline" href="/archive">Archive</Link> —
              recent and historical agendas and minutes, with auto-generated
              summaries from on-device OCR.
            </li>
            <li>
              <Link className="underline" href="/ask">Ask the bot</Link> —
              plain-language questions about meetings, services, hours, fees.
              Answers come from the town's own website.
            </li>
            <li>
              <Link className="underline" href="/trash">Trash day lookup</Link>{" "}
              — type your street, get your pickup day.
            </li>
            <li>
              <Link className="underline" href="/report">Report an issue</Link>{" "}
              — pothole, missed trash, streetlight, barking dog, zoning
              concern. Routes to the right form or phone number.
            </li>
            <li>
              <Link className="underline" href="/officials">Officials
              directory</Link> — every Select Board, Planning Board, and
              state representative, with how-to-contact.
            </li>
            <li>
              <Link className="underline" href="/participate">How to
              participate</Link> — speak at a meeting, get on the warrant, run
              for office.
            </li>
            <li>
              <Link className="underline" href="/welcome">New resident
              guide</Link> and{" "}
              <Link className="underline" href="/schools">Schools</Link> —
              first-month checklist for new residents, SAU 53 info.
            </li>
            <li>
              Email alerts — sign in at{" "}
              <Link className="underline" href="/settings">Settings</Link> to
              pick the topics you care about. "Watch this street" lets you
              get an email when a specific street is mentioned in any
              agenda or minutes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            What's <em>not</em> here
          </h2>
          <ul className="space-y-2 text-sm text-stone-700">
            <li>
              We are not the Town of Pembroke government. For official records,
              permits, vital records, tax bills, or anything that needs a
              legal signature, contact the{" "}
              <a
                className="underline"
                href="https://www.pembroke-nh.com/1323/Town-Clerk"
              >
                Town Clerk
              </a>{" "}
              directly.
            </li>
            <li>
              We do not host school calendars. SAU 53 uses a heavy
              JavaScript CMS we can't scrape — link out from our{" "}
              <Link className="underline" href="/schools">Schools</Link>{" "}
              page.
            </li>
            <li>
              We don't do comments, discussion forums, or resident-to-resident
              messaging. Town meeting is the place for that.
            </li>
            <li>
              We don't cover other towns yet. This site is Pembroke-only.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            How it works
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed mb-3">
            The site reads from the same public sources the town does:
          </p>
          <ul className="space-y-1 text-sm text-stone-700 list-disc list-inside mb-3">
            <li>
              The town's{" "}
              <a
                className="underline"
                href="https://www.pembroke-nh.com"
              >
                pembroke-nh.com
              </a>{" "}
              website for service pages, hours, and fees
            </li>
            <li>
              The town's iCal feeds for meeting schedules (auto-updated every
              hour)
            </li>
            <li>
              The town's{" "}
              <a
                className="underline"
                href="https://www.pembroke-nh.com/agendacenter"
              >
                agenda center
              </a>{" "}
              for new agendas and minutes, OCR'd on a personal Mac and pushed
              to this site
            </li>
            <li>
              The town's{" "}
              <a
                className="underline"
                href="https://www.pembroke-nh.com/1291/Recycling"
              >
                recycling and transfer station pages
              </a>{" "}
              for the trash-day route list
            </li>
            <li>
              NH{" "}
              <a className="underline" href="https://gc.nh.gov/house/members/">
                House
              </a>{" "}
              and Senate directories for state reps
            </li>
          </ul>
          <p className="text-sm text-stone-700 leading-relaxed">
            Every page is rebuilt on the hour from these sources. No manual
            editing of town records.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            Who built it
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed mb-3">
            Tyler Dubuque, a Pembroke resident, with help from Hermes Agent
            (an AI coding agent). This is a personal project, not affiliated
            with the Town of Pembroke government. The town does not endorse
            or fund it.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            Source code on{" "}
            <a
              className="underline"
              href="https://github.com/hodlmybeer21/pembroke.goodbotai.tech"
            >
              GitHub
            </a>
            . Built with Next.js, deployed on Vercel, data on Vercel Postgres.
          </p>
        </section>

        <section className="lg:col-span-2 surface p-5">
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-2">
            Report a mistake
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Spotted wrong data, a broken link, or a feature that doesn't
            work? Email{" "}
            <a
              className="underline"
              href="mailto:hello@pembroke.goodbotai.tech"
            >
              hello@pembroke.goodbotai.tech
            </a>
            . Most fixes ship within a day.
          </p>
        </section>
      </div>

      <p className="text-xs text-stone-500 mt-12 pt-6 border-t border-stone-200">
        Last updated October 2026. Major milestones: v1 (October 2025) →
        OCR + LLM (v2) → alerts (v3) → snow banner + trash lookup +
        officials directory (v4) → archive + watch this street + mobile
        nav (v5) → polish + visual identity (v6).
      </p>
    </div>
  );
}