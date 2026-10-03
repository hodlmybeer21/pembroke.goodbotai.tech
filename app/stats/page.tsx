// app/stats/page.tsx — Public adoption + freshness stats.
//
// This is the "town will look at this when they come asking" page.
// Honest numbers: archive size, street count, signed-up residents,
// active street watches, last refresh timestamp. No PII — counts only.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";
import Link from "next/link";

export const revalidate = 3600; // refresh hourly

interface ArchiveIndex {
  count: number;
  generated_at: string;
}

interface StreetsFile {
  count: number;
  generated_at: string;
}

function loadArchive(): ArchiveIndex | null {
  try {
    const p = join(process.cwd(), "data", "archive-index.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as ArchiveIndex;
  } catch {
    return null;
  }
}

function loadStreets(): StreetsFile | null {
  try {
    const p = join(process.cwd(), "data", "streets.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as StreetsFile;
  } catch {
    return null;
  }
}

async function getCounts(): Promise<{ users: number; watches: number; alertsSent: number }> {
  const out = { users: 0, watches: 0, alertsSent: 0 };
  try {
    await ensureSchema();
    const u = await sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM profiles`;
    out.users = u.rows[0]?.n ?? 0;
    const w = await sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM street_watches`;
    out.watches = w.rows[0]?.n ?? 0;
    return out;
  } catch {
    // Postgres unreachable or not configured. The site still renders;
    // users see 0 instead of an error.
    return out;
  }
}

export default async function StatsPage() {
  const [archive, streets, counts] = await Promise.all([
    Promise.resolve(loadArchive()),
    Promise.resolve(loadStreets()),
    getCounts(),
  ]);

  const now = new Date();
  const archiveAge = archive
    ? Math.max(0, Math.round((now.getTime() - new Date(archive.generated_at).getTime()) / 60000))
    : null;

  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Stats
        </h1>
        <p className="text-stone-600 mt-2">
          How much of Pembroke is on here, and how fresh the data is. Counts
          only — no individual records. Updated hourly.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Meeting summaries on file"
          value={archive?.count ?? 0}
          hint={
            archive
              ? `Going back to ${new Date(archive.generated_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
              : "No archive yet"
          }
        />
        <Stat
          label="Streets with known pickup day"
          value={streets?.count ?? 0}
          hint="Source: town's published route list"
        />
        <Stat
          label="Residents signed up for alerts"
          value={counts.users}
          hint="Includes both category alerts and street watches"
        />
        <Stat
          label="Streets being watched"
          value={counts.watches}
          hint="Alerts when any agenda mentions a watched street"
        />
      </div>

      <section className="mt-10 surface p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          Freshness
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wider">
              Calendar last refreshed
            </dt>
            <dd className="text-stone-800 mt-0.5">
              {archiveAge !== null ? `${archiveAge} min ago` : "unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wider">
              Town-info pages last scraped
            </dt>
            <dd className="text-stone-800 mt-0.5">
              {streets
                ? `${Math.max(0, Math.round((now.getTime() - new Date(streets.generated_at).getTime()) / 60000))} min ago`
                : "unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wider">
              Archive last rebuilt
            </dt>
            <dd className="text-stone-800 mt-0.5">
              {archive
                ? new Date(archive.generated_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wider">
              Pages on this site
            </dt>
            <dd className="text-stone-800 mt-0.5">
              11 (calendar, agendas, archive, ask, trash, officials, participate, report, schools, welcome, plus about &amp; privacy)
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10 surface p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          What this site covers
        </h2>
        <ul className="text-sm text-stone-700 space-y-1.5 list-disc list-inside">
          <li>
            <strong>Calendar</strong> — Select Board, Planning Board, Budget
            Committee, Roads, Conservation, Recreation, and other town
            boards, 90 days ahead
          </li>
          <li>
            <strong>Agendas + minutes</strong> — auto-OCR'd from the town's
            PDF agenda center, summarized by an on-device tool
          </li>
          <li>
            <strong>Ask the bot</strong> — plain-English questions about
            services, hours, fees, who to contact
          </li>
          <li>
            <strong>Trash &amp; recycling</strong> — street-by-street pickup
            day lookup
          </li>
          <li>
            <strong>Officials</strong> — Select Board, Planning Board, state
            reps, with how-to-contact
          </li>
          <li>
            <strong>Participate</strong> — how to speak at a meeting, run
            for office, get on the town-meeting warrant
          </li>
          <li>
            <strong>Report an issue</strong> — routes to the right form /
            phone number for potholes, missed trash, barking dogs, etc.
          </li>
          <li>
            <strong>Schools</strong> — SAU 53, Three Rivers, Pembroke Academy
          </li>
          <li>
            <strong>New resident guide</strong> — first-month checklist
          </li>
        </ul>
      </section>

      <section className="mt-10 surface p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          For town officials
        </h2>
        <p className="text-sm text-stone-700 leading-relaxed">
          If you're a Town employee or official looking at this site, we'd
          love to hear from you. We're not affiliated with the town — this
          is a community project. Email{" "}
          <a
            className="underline"
            href="mailto:hello@pembroke.goodbotai.tech"
          >
            hello@pembroke.goodbotai.tech
          </a>
          .
        </p>
        <p className="text-sm text-stone-500 mt-3">
          See also: <Link className="underline" href="/about">About this site</Link> ·{" "}
          <Link className="underline" href="/privacy">Privacy policy</Link>
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="surface p-5">
      <div className="text-xs text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="font-serif text-3xl font-semibold text-stone-900 mt-1">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-stone-500 mt-2">{hint}</div>
    </div>
  );
}