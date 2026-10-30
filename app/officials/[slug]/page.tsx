// app/officials/[slug]/page.tsx — one elected official's record.
//
// This is a record, not a verdict. It shows what the minutes say: the
// boards this person sits on, their attendance as the minutes record
// it, every vote the minutes recorded by name, and the decisions their
// boards took that were NOT recorded by name.
//
// There is no score, no grade, no ranking, no attendance league table
// and no adjective anywhere on this page.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { findOfficial, loadOfficialRecords } from "@/lib/official-records";
import { formatEt } from "@/lib/dates";

export const revalidate = 3600;

export function generateStaticParams() {
  const data = loadOfficialRecords();
  if (!data) return [];
  // Only the people with something to show. A page for a name the
  // minutes carry once and never again is noise in a sitemap.
  return data.officials
    .filter((o) => o.votes_recorded > 0 || o.attendance.meetings_listed > 0)
    .map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const o = findOfficial(slug);
  if (!o) return { title: "Official not found — Pembroke, NH" };
  return {
    title: `${o.name} — voting record | Pembroke, NH`,
    description:
      `How ${o.name} is recorded voting in Pembroke's meeting minutes, ` +
      `with every vote linked to the source document.`,
    alternates: { canonical: `/officials/${o.slug}` },
    openGraph: {
      title: `${o.name} — voting record | Pembroke, NH`,
      description:
        `How ${o.name} is recorded voting in Pembroke's meeting minutes.`,
      url: `/officials/${o.slug}`,
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Pembroke, NH" }],
    },
  };
}

const VOTE_LABEL: Record<string, string> = {
  yes: "Yes",
  no: "No",
  abstain: "Abstain",
  absent: "Absent",
};

export default async function OfficialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const o = findOfficial(slug);
  const data = loadOfficialRecords();
  if (!o || !data) notFound();

  const boards = o.committees.length ? o.committees : [];
  const roleLine = boards
    .map((c) => [c.role, c.committee].filter(Boolean).join(", "))
    .filter(Boolean);
  const terms = boards
    .filter((c) => c.term_ends)
    .map((c) => `${c.committee}: term ends ${c.term_ends}`);

  const issueRows = Object.entries(o.issues).sort((a, b) => b[1].decisions - a[1].decisions);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24">
      <p className="text-xs uppercase tracking-widest text-stone-500">
        <Link href="/officials" className="hover:underline">
          Town officials
        </Link>{" "}
        / voting record
      </p>

      <h1 className="mt-2 font-serif text-3xl font-semibold text-stone-900">
        {o.name}
      </h1>

      {roleLine.length > 0 && (
        <p className="mt-1 text-stone-700">{roleLine.join(" · ")}</p>
      )}
      {terms.length > 0 && (
        <p className="mt-1 text-sm text-stone-500">{terms.join(" · ")}</p>
      )}
      {!o.in_directory && (
        <p className="mt-3 rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
          This person appears in Pembroke&apos;s meeting minutes but is not
          listed on the town&apos;s current directory of members. Their
          record is shown because it was taken while they served.
        </p>
      )}

      {/* ------------------------------------------------ the plain facts */}
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Attendance where recorded"
          value={
            o.attendance.rate !== null
              ? `${o.attendance.rate}%`
              : "not recorded"
          }
          sub={
            o.attendance.meetings_listed > 0
              ? `present ${o.attendance.present} of ${o.attendance.meetings_listed} meetings listing a roster`
              : "the minutes for this body do not print a roster"
          }
        />
        <Stat
          label="Votes recorded by name"
          value={String(o.votes_recorded)}
          sub="roll-call votes in the minutes that name this person"
        />
        <Stat
          label="Motions moved"
          value={String(o.motions_moved)}
          sub={`${o.motions_seconded} seconded`}
        />
      </dl>

      {/* -------------------------------------------------- the votes */}
      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-stone-900">
          How {o.name.split(" ")[0]} is recorded voting
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Only votes the minutes record by name are listed. Every row links
          to the source document.
        </p>

        {o.votes.length === 0 ? (
          <p className="mt-4 rounded border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            No vote is recorded by name for this person anywhere in the
            minutes this site reads. That is the whole record — there is
            nothing here to infer from, and nothing is inferred.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-300 text-left">
                  <th className="py-2 pr-3 font-semibold text-stone-900">Date</th>
                  <th className="py-2 pr-3 font-semibold text-stone-900">Body</th>
                  <th className="py-2 pr-3 font-semibold text-stone-900">What was decided</th>
                  <th className="py-2 pr-3 font-semibold text-stone-900">Vote</th>
                  <th className="py-2 text-right font-semibold text-stone-900">Tally</th>
                </tr>
              </thead>
              <tbody>
                {o.votes.map((v, i) => (
                  <tr
                    key={`${v.date}-${v.committee}-${i}`}
                    className="border-b border-stone-200 align-top"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">
                      {v.date ? formatEt(v.date + "T12:00:00", { dateOnly: true }) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-stone-700">{v.committee}</td>
                    <td className="py-2 pr-3">
                      <div className="text-stone-900">
                        {v.subject ?? "Subject not recorded"}
                      </div>
                      {v.issue && (
                        <div className="text-xs text-stone-500">{v.issue}</div>
                      )}
                      {v.url && (
                        <a
                          className="mt-0.5 inline-block text-xs text-brand-700 underline"
                          href={v.url}
                        >
                          Source minutes →
                        </a>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          v.vote === "no"
                            ? "font-semibold text-red-700"
                            : v.vote === "abstain"
                              ? "font-semibold text-amber-700"
                              : "text-stone-700"
                        }
                      >
                        {VOTE_LABEL[v.vote] ?? v.vote}
                      </span>
                    </td>
                    <td className="py-2 text-right text-stone-600">{v.tally ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------- by tracked issue */}
      {issueRows.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            By subject
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            The same votes, grouped by the subject the town tracks in{" "}
            <Link href="/decisions" className="underline">
              How the town decides
            </Link>
            .
          </p>
          <ul className="mt-4 space-y-2">
            {issueRows.map(([issue, rec]) => (
              <li
                key={issue}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <Link
                  href={`/decisions#${issue.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className="font-medium text-stone-900 hover:underline"
                >
                  {issue}
                </Link>
                <span className="text-stone-600">
                  {rec.decisions} named vote{rec.decisions === 1 ? "" : "s"}
                </span>
                <span className="text-stone-500">
                  {rec.yes} yes
                  {rec.no > 0 && `, ${rec.no} no`}
                  {rec.abstain > 0 && `, ${rec.abstain} abstained`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------- the honesty section */}
      <section className="mt-10 rounded-lg border border-stone-200 bg-stone-50 p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          What the minutes do not say
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {o.decisions_total > 0 ? (
            <>
              The {o.committees.length === 1 ? "body" : "bodies"} this person
              sits on took{" "}
              <strong>{o.decisions_total}</strong> recorded decisions in the
              minutes this site reads.{" "}
              <strong>{o.decisions_not_recorded_by_name}</strong> of them were
              decided without a roll call that named anybody — the minutes
              say only that the motion carried. Those decisions are counted
              here and left blank rather than filled in.
            </>
          ) : (
            <>
              No decisions by this person&apos;s bodies appear in the minutes
              this site reads.
            </>
          )}
        </p>

        {o.committee_record.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            {o.committee_record.map((c) => (
              <li key={c.committee}>
                <span className="font-medium text-stone-800">{c.committee}:</span>{" "}
                {c.decisions} decisions, {c.decisions_with_named_vote} with a
                named roll call, {c.decisions_not_recorded_by_name} recorded
                only as “motion carried”
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------- motions moved */}
      {o.motions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            Motions {o.name.split(" ")[0]} moved
          </h2>
          <ul className="mt-3 space-y-2">
            {o.motions.slice(0, 25).map((m, i) => (
              <li key={i} className="border-b border-stone-200 pb-2 text-sm">
                <div className="flex flex-wrap gap-x-2 text-xs text-stone-500">
                  <span>
                    {m.date ? formatEt(m.date + "T12:00:00", { dateOnly: true }) : ""}
                  </span>
                  <span>{m.committee}</span>
                </div>
                <div className="text-stone-900">{m.subject}</div>
                {m.url && (
                  <a
                    className="text-xs text-brand-700 underline"
                    href={m.url}
                  >
                    Source minutes →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------- method note */}
      <section className="mt-10 rounded-lg border border-stone-300 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          How this page is built
        </h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed text-stone-600">
          <div>
            <dt className="font-medium text-stone-800">Where it comes from</dt>
            <dd>
              {data.source}. The archive covers{" "}
              {data.counts.minutes_with_text ?? "the"} minutes that carry
              text, from{" "}
              {data.counts.named_vote_blocks} roll-call votes and{" "}
              {data.counts.named_votes_cast} individual votes recorded by
              name.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-stone-800">Attendance</dt>
            <dd>{data.method.attendance}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-800">Votes</dt>
            <dd>{data.method.votes}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-800">No scores</dt>
            <dd>{data.method.no_scores}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-800">Who is on this site</dt>
            <dd>{data.method.roster}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-stone-500">
          Record as of {formatEt(data.generated_at)}.{" "}
          <Link href="/officials/votes" className="underline">
            See every official side by side
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <dt className="text-[11px] uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-serif text-xl font-semibold text-stone-900">
        {value}
      </dd>
      <dd className="text-xs text-stone-600">{sub}</dd>
    </div>
  );
}
