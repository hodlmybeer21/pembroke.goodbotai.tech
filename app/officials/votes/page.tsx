// app/officials/votes/page.tsx — the issue-by-official grid.
//
// Every tracked subject from /decisions, and for each one what each
// member's recorded vote was. A cell is only filled in when the minutes
// recorded that person's vote by name. Everything else reads "not
// recorded by name" - because most Pembroke minutes record only that
// the motion carried.
//
// No scores, no grades, no ranking, no adjectives.

import type { Metadata } from "next";
import Link from "next/link";
import { loadOfficialRecords } from "@/lib/official-records";
import { formatEt } from "@/lib/dates";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Every official side by side — Pembroke, NH",
  description:
    "How each Pembroke official is recorded voting on each subject the town tracks, with dissents marked and unnamed votes left blank.",
  alternates: { canonical: "/officials/votes" },
  openGraph: {
    title: "Every official side by side — Pembroke, NH",
    description:
      "How each Pembroke official is recorded voting on each subject the town tracks.",
    url: "/officials/votes",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Pembroke, NH" }],
  },
};

export default function OfficialsVotesPage() {
  const data = loadOfficialRecords();
  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-stone-600">
          The voting record is not available right now.
        </p>
      </main>
    );
  }

  // Only the people with at least one named vote — a column of blanks
  // for everyone else tells a resident nothing.
  const people = data.officials
    .filter((o) => o.votes_recorded > 0)
    .sort((a, b) => a.name.split(" ").slice(-1)[0].localeCompare(b.name.split(" ").slice(-1)[0]));

  // The subjects where at least one named vote exists.
  const rows = data.grid.filter((r) =>
    Object.values(r.members).some((m) => m.decisions > 0),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <p className="text-xs uppercase tracking-widest text-stone-500">
        <Link href="/officials" className="hover:underline">
          Town officials
        </Link>{" "}
        / voting record
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-stone-900">
        Every official side by side
      </h1>
      <p className="mt-3 max-w-2xl text-stone-700">
        Each subject the town tracks, and how each member is recorded
        voting on it. A cell is filled in only when the minutes recorded
        that person&apos;s vote by name.
      </p>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        <strong>Most votes in Pembroke are not recorded by name.</strong>{" "}
        The minutes usually say only that the motion carried, and a
        roll call happens on a minority of decisions. Across the{" "}
        {data.counts.named_vote_blocks} decisions where a roll call does
        appear, there are {data.counts.named_votes_cast} individual votes.
        Everything else is left blank here rather than guessed at.
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-stone-600">
          No named votes have been recorded yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                <th className="py-2 pr-3 font-semibold text-stone-900">
                  Subject
                </th>
                {people.map((p) => (
                  <th
                    key={p.slug}
                    className="px-2 py-2 text-center font-semibold text-stone-900"
                  >
                    <Link
                      href={`/officials/${p.slug}`}
                      className="hover:underline"
                    >
                      {p.name.split(" ").slice(-1)[0]}
                    </Link>
                  </th>
                ))}
                <th className="py-2 pl-3 text-right font-semibold text-stone-900">
                  Named votes
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.issue} className="border-b border-stone-200 align-middle">
                  <th scope="row" className="py-3 pr-3 text-left font-medium text-stone-900">
                    {row.issue}
                    <div className="text-xs font-normal text-stone-500">
                      {row.decisions_with_named_vote} of {row.decisions}{" "}
                      decisions recorded by name
                    </div>
                  </th>
                  {people.map((p) => {
                    const cell = row.members[p.slug];
                    const has = cell && cell.decisions > 0;
                    return (
                      <td key={p.slug} className="px-2 py-3 text-center">
                        {has ? (
                          <span
                            className={
                              cell.no > 0
                                ? "font-semibold text-red-700"
                                : cell.abstain > 0
                                  ? "font-semibold text-amber-700"
                                  : "text-stone-700"
                            }
                          >
                            {cell.yes} yes
                            {cell.no > 0 && `, ${cell.no} no`}
                            {cell.abstain > 0 && `, ${cell.abstain} abstain`}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">
                            not recorded by name
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 pl-3 text-right text-stone-600">
                    {row.decisions_with_named_vote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------- every recorded vote */}
      <section className="mt-12">
        <h2 className="font-serif text-xl font-semibold text-stone-900">
          Every recorded vote
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          All {data.counts.named_vote_blocks} roll calls in the archive, with
          the subject and a link to the source minutes. Where a member voted
          no or abstained, that is the only thing marked.
        </p>
        <div className="mt-4 space-y-4">
          {data.vote_blocks.map((b, i) => {
            const dissent = b.voters.filter((v) => v.vote === "no" || v.vote === "abstain");
            return (
              <div
                key={i}
                className="rounded-lg border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 text-xs text-stone-500">
                  <span>
                    {b.date ? formatEt(b.date + "T12:00:00", { dateOnly: true }) : "—"}
                  </span>
                  <span className="font-medium text-stone-700">{b.committee}</span>
                  {b.tally && <span>Tally {b.tally}</span>}
                  {b.issue && <span>{b.issue}</span>}
                </div>
                <div className="mt-1 text-sm text-stone-900">
                  {b.subject ?? "Subject not recorded"}
                </div>
                <div className="mt-2 text-xs text-stone-600">
                  {b.voters.map((v) => (
                    <span
                      key={v.name}
                      className={
                        v.vote === "no"
                          ? "mr-2 font-semibold text-red-700"
                          : v.vote === "abstain"
                            ? "mr-2 font-semibold text-amber-700"
                            : "mr-2"
                      }
                    >
                      {v.name}: {v.vote}
                    </span>
                  ))}
                </div>
                {dissent.length > 0 && (
                  <p className="mt-2 text-xs text-stone-600">
                    Not unanimous:{" "}
                    {dissent.map((v) => `${v.name} voted ${v.vote}`).join(", ")}.
                  </p>
                )}
                {b.url && (
                  <a
                    className="mt-2 inline-block text-xs text-brand-700 underline"
                    href={b.url}
                  >
                    Source minutes →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------- method note */}
      <section className="mt-10 rounded-lg border border-stone-300 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          How this page is built
        </h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed text-stone-600">
          <div>
            <dt className="font-medium text-stone-800">Where it comes from</dt>
            <dd>
              {data.source}. {data.counts.minutes_with_text ?? "The"} minutes
              with text, {data.counts.named_vote_blocks} roll-call votes,{" "}
              {data.counts.named_votes_cast} individual votes recorded by
              name, across {data.counts.officials} people the minutes
              name.
            </dd>
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
          <Link href="/decisions" className="underline">
            How the town decides
          </Link>{" "}
          has the decisions these votes were taken on.
        </p>
      </section>
    </main>
  );
}
