// app/page.tsx — the front door.
//
// Design intent: a resident should land here and immediately see that
// this site knows what the town is doing, then be pulled toward the two
// things that make it different from the town's own website — how the
// town decides, and what a home is actually worth. The utility pages
// (trash day, report an issue) stay one tap away but subordinate.

import { fetchAgendaCenter, loadOcrExport, findSummary } from "@/lib/agenda-center";
import { buildBrief } from "@/lib/brief";
import { Brief } from "@/components/Brief";
import { PersonaOnboardingGate } from "@/components/PersonaOnboardingGate";
import Link from "next/link";
import { type ImpactTag } from "@/lib/impact";
import { auth, currentUser } from "@clerk/nextjs/server";
import { findPersona } from "@/lib/categories";
import { getProfile } from "@/lib/db";
import {
  loadCalendarEvents,
  dedupeByDateTitle,
  filterHorizon,
  loadUpcomingMeetings,
} from "@/lib/town-data";
import { loadGovernanceSummary } from "@/lib/governance";
import { NhTaxHeatMap } from "@/components/NhTaxHeatMap";
import { loadPropertyValues } from "@/lib/property-values";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const revalidate = 3600;

function readJson<T>(file: string): T | null {
  try {
    const path = join(process.cwd(), "data", file);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const events = loadCalendarEvents();
  const [docs, governance, values, trends] = await Promise.all([
    fetchAgendaCenter().catch(() => []),
    Promise.resolve(loadGovernanceSummary()),
    Promise.resolve(loadPropertyValues()),
    Promise.resolve(
      readJson<{ tax_rate: number; tax_bill: { median: number | null } }>(
        "property-trends.json"
      )
    ),
  ]);

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const dedupedEvents = dedupeByDateTitle(filterHorizon(events, now, horizonEnd));

  const brief = buildBrief(dedupedEvents, docs, { now });

  const items = [...brief.thisWeek, ...brief.later].map((it) => ({
    kind: it.kind,
    committee: it.committee,
    title: it.title,
    when: it.when,
    tags: it.tags,
    url: it.url,
  }));

  const lastRefresh = brief.generatedAt;
  const ocr = loadOcrExport();

  // The next meeting the town has published.
  const next = loadUpcomingMeetings(1)[0];

  // Live numbers for the two feature panels.
  const decisions = governance?.totals.motions ?? 0;
  const issues = governance?.totals.issues ?? 0;
  const dissents = governance?.totals.contested ?? 0;
  const sales = values?.sales?.length ?? 0;
  const taxRate = trends?.tax_rate ?? 21.84;
  const medianBill = trends?.tax_bill?.median ?? null;

  // Read the user's persona (signed in only) so the impact sections
  // surface in the order that matters most to them.
  //
  // auth() THROWS when Clerk isn't configured or the middleware didn't
  // run, so it has to be guarded - otherwise the whole home page 500s
  // rather than just skipping the signed-in extras.
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    userId = null;
  }
  let persona = null;
  let hasPersona = false;
  if (userId) {
    try {
      const user = await currentUser();
      if (user) {
        const profile = await getProfile(userId).catch(() => null);
        if (profile?.persona) {
          const found = findPersona(profile.persona);
          if (found) {
            persona = found;
            hasPersona = true;
          }
        }
      }
    } catch {
      persona = null;
    }
  }
  const tagOrder: ImpactTag[] | undefined = persona?.primaryTags as ImpactTag[] | undefined;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-10">
      {/* ---------------------------------------------------------- hero */}
      <section className="mb-10">
        <p className="text-xs uppercase tracking-widest text-stone-500">
          Pembroke, New Hampshire
        </p>
        <h1 className="mt-2 max-w-2xl font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
          Pembroke&rsquo;s town government, in plain English.
        </h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Every meeting the town has scheduled, every decision it has
          actually made, and what the numbers say about your house — read
          straight out of the town&rsquo;s own records.
        </p>

        {/* live facts - the proof that this site is alive */}
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <LiveFact
            label="Next meeting"
            value={
              next
                ? `${next.when.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}${next.time ? `, ${next.time}` : ""}`
                : "Nothing published"
            }
            sub={next ? next.title : "Check the town's calendar"}
            href="/calendar"
          />
          <LiveFact
            label="Decisions read from the minutes"
            value={String(decisions)}
            sub={
              dissents > 0
                ? `${issues} issues · ${dissents} vote${dissents === 1 ? "" : "s"} where someone dissented`
                : `${issues} distinct issues`
            }
            href="/decisions"
          />
          <LiveFact
            label="What a home costs in tax"
            value={`$${taxRate.toFixed(2)}`}
            sub={
              medianBill
                ? `per $1,000 assessed · median bill $${Math.round(medianBill).toLocaleString()}`
                : "per $1,000 of assessed value"
            }
            href="/property-values"
          />
        </dl>
      </section>

      {/* ------------------------------------------------- the two flagships */}
      <section className="mb-12 grid gap-4 sm:grid-cols-2">
        <FeatureCard
          href="/decisions"
          eyebrow="Read the record"
          title="How the town decides"
          body="Two years of meeting minutes read straight through. Which issues the town keeps coming back to, which way each one leaned, who moved what, and the votes where anyone dissented."
          facts={[
            `${decisions} decisions`,
            `${issues} issues`,
            dissents > 0
              ? `${dissents} recorded dissents`
              : "every vote linked to its source",
          ]}
        />
        <FeatureCard
          href="/property-values"
          eyebrow="Know the numbers"
          title="What your home is worth"
          body="Every recent sale next to the town’s assessed value, on a map and in a table — with the annual tax bill it implies, and where the market actually is."
          facts={[
            `${sales} recent sales`,
            `$${taxRate.toFixed(2)} per $1,000 tax rate`,
            medianBill
              ? `median bill $${Math.round(medianBill).toLocaleString()}`
              : "map + table",
          ]}
        />
      </section>

      {/* --------------------------------------------------- the tax map */}
      <section className="mb-12 border-t border-stone-200 pt-10">
        <div className="mb-1 text-xs uppercase tracking-widest text-stone-500">
          Compare
        </div>
        <h2 className="font-serif text-2xl font-semibold text-stone-900">
          How Pembroke&rsquo;s tax rate stacks up
        </h2>
        <p className="mt-2 max-w-2xl text-stone-700">
          Every New Hampshire town, shaded by the tax rate the state sets
          on each $1,000 of assessed value. Zoom in to compare Pembroke
          with its neighbours, or flip the shading to see whether a
          town&rsquo;s rate is driven by schools or by town services.
        </p>
        <div className="mt-5">
          <NhTaxHeatMap />
        </div>
      </section>

      {/* ------------------------------------------------------ quick access */}
      <nav aria-label="Quick access" className="mb-12">
        <h2 className="mb-3 font-serif text-sm uppercase tracking-wider text-stone-500">
          Get something done
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <QuickCard href="/trash" title="Trash day" body="Your pickup day" />
          <QuickCard href="/report" title="Report an issue" body="Who to call" />
          <QuickCard href="/officials" title="Officials" body="Who represents you" />
          <QuickCard href="/participate" title="Take part" body="Speak at a meeting" />
          <QuickCard href="/welcome" title="New here?" body="Moving in checklist" />
        </ul>
      </nav>

      {/* -------------------------------------------------------- this week */}
      {items.length === 0 ? (
        <p className="mb-12 text-stone-600">
          Nothing on the town calendar in the next 90 days.{" "}
          <Link href="/calendar" className="underline">
            See the calendar
          </Link>{" "}
          or{" "}
          <Link href="/agendas" className="underline">
            browse the agenda archive
          </Link>
          .
        </p>
      ) : (
        <section className="mb-12">
          <h2 className="mb-3 font-serif text-sm uppercase tracking-wider text-stone-500">
            This week
          </h2>
          <Brief
            items={items}
            weekEnd={brief.weekEnd}
            laterCap={brief.laterCap}
            generatedAt={brief.generatedAt}
            tagOrder={tagOrder}
          />
        </section>
      )}

      {/* Persona onboarding — shown when the user is signed in but has
          never picked a persona. Mounts as a client component that
          opens the picker on first visit. */}
      {userId && <PersonaOnboardingGate hasPersona={hasPersona} />}

      {/* ---------------------------------------------------- newest postings */}
      {brief.newDocs.length > 0 && (
        <section className="mt-12 border-t border-stone-200 pt-8">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-sm uppercase tracking-wider text-stone-500">
              Newest postings
            </h2>
            <Link href="/agendas" className="text-xs text-stone-500 underline">
              Every agenda and minute →
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {brief.newDocs.slice(0, 6).map((d, idx) => {
              const summary = findSummary(
                { ...d, docType: d.docType as "Agenda" | "Minutes" } as never,
                ocr,
              );
              return (
                <li key={idx} className="surface p-4">
                  <div className="flex items-baseline gap-2 text-xs text-stone-500">
                    <time>
                      {d.when.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    <span className="font-medium text-stone-700">{d.committee}</span>
                    <span className="tag-pill ml-auto">{d.docType}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-stone-900">
                    {d.title}
                  </div>
                  {summary && (
                    <p className="mt-2 text-xs leading-relaxed text-stone-600">
                      {summary.length > 220
                        ? summary.slice(0, 219).trimEnd() + "…"
                        : summary}
                    </p>
                  )}
                  {d.url && (
                    <a
                      className="mt-2 inline-block text-xs text-brand-700 underline"
                      href={d.url}
                    >
                      Read full document →
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-12 text-xs text-stone-500">
        Refreshed{" "}
        {lastRefresh.toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}{" "}
        · every hour from{" "}
        <a href="https://www.pembroke-nh.com" className="underline">
          pembroke-nh.com
        </a>
      </p>
    </main>
  );
}

function LiveFact({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-stone-400"
    >
      <dt className="text-[11px] uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-xl font-semibold text-stone-900">
        {value}
      </dd>
      <dd className="mt-0.5 text-xs text-stone-600">{sub}</dd>
    </Link>
  );
}

function FeatureCard({
  href,
  eyebrow,
  title,
  body,
  facts,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  facts: string[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-stone-300 bg-white p-5 transition-colors hover:border-stone-500"
    >
      <span className="text-[11px] uppercase tracking-widest text-stone-500">
        {eyebrow}
      </span>
      <h2 className="mt-1.5 font-serif text-xl font-semibold text-stone-900">
        {title} →
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-700">
        {body}
      </p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {facts.map((f) => (
          <li
            key={f}
            className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-700"
          >
            {f}
          </li>
        ))}
      </ul>
    </Link>
  );
}

function QuickCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block surface p-3 h-full hover:border-brand-500 transition-colors"
      >
        <div className="font-serif text-sm font-semibold text-stone-900">
          {title} →
        </div>
        <div className="mt-0.5 text-xs leading-relaxed text-stone-600">
          {body}
        </div>
      </Link>
    </li>
  );
}
