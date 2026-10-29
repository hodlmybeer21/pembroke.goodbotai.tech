"use client";

// components/DecisionsView.tsx — how the town has been deciding things.
//
// Everything on this page comes from the town's own published meeting
// minutes (public records, NH RSA 91). There are no scores, no rankings
// and no labels on anyone. What it shows is the record: what was decided,
// who moved it, who seconded it, how it turned out, and where the source
// document is. Residents draw their own conclusions from that - which is
// the entire point of publishing it.

import { useMemo, useState } from "react";
import type {
  GovernanceSummary,
  MemberSummary,
  MotionRow,
} from "@/lib/governance";

const DIR_MORE = "#15803d";
const DIR_ADMIN = "#a8a29e";
const DIR_LESS = "#b45309";

const directionLabel: Record<string, string> = {
  "toward more": "Moved toward more",
  "toward less": "Moved toward less",
  administrative: "Routine",
};

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ------------------------------------------------------- topic attention
function TopicChart({ topics }: { topics: GovernanceSummary["topics"] }) {
  const max = Math.max(...topics.map((t) => t.total), 1);
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        Where the town&apos;s attention has gone
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Substantive motions by subject, January 2025 onward. Routine items
        — approving minutes, paying bills, scheduling meetings — are left out.
      </p>
      <ul className="mt-3 space-y-1.5">
        {topics.map((t) => (
          <li key={t.topic} className="flex items-center gap-2">
            <span className="w-32 shrink-0 truncate text-xs text-stone-700 sm:w-44">
              {t.topic}
            </span>
            <span className="h-4 flex-1 overflow-hidden rounded-sm bg-stone-100">
              <span
                className="block h-full rounded-sm bg-stone-700"
                style={{ width: `${(t.total / max) * 100}%` }}
              />
            </span>
            <span className="w-7 shrink-0 text-right text-xs font-medium text-stone-900">
              {t.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------- the direction
function DirectionChart({ topics }: { topics: GovernanceSummary["topics"] }) {
  const shown = topics.filter((t) => t.total > 0);
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        Which way each subject is heading
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Read the action the motion asked for, not just whether it passed.
        A motion to approve a variance points one way; a motion to deny an
        abatement points the other.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <Legend color={DIR_MORE} label="Moved toward more" />
        <Legend color={DIR_ADMIN} label="Routine" />
        <Legend color={DIR_LESS} label="Moved toward less" />
      </div>
      <ul className="mt-3 space-y-2.5">
        {shown.map((t) => (
          <li key={t.topic}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-stone-800">{t.topic}</span>
              <span className="shrink-0 text-[11px] text-stone-500">
                {t.more} more · {t.less} less · {t.admin} routine
              </span>
            </div>
            <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-sm bg-stone-100">
              <span style={{ width: `${(t.more / t.total) * 100}%`, backgroundColor: DIR_MORE }} />
              <span style={{ width: `${(t.admin / t.total) * 100}%`, backgroundColor: DIR_ADMIN }} />
              <span style={{ width: `${(t.less / t.total) * 100}%`, backgroundColor: DIR_LESS }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

// ------------------------------------------------------- attention grid
// Which issues consumed the town's attention, month by month. Cell
// darkness is the number of decisions in that month. Purely a count -
// no weighting, no interpretation.
function AttentionGrid({
  issues,
  months,
}: {
  issues: GovernanceSummary["issues"];
  months: string[];
}) {
  const shown = issues.filter((i) => i.count >= 2).slice(0, 9);
  const max = Math.max(
    ...shown.flatMap((i) => Object.values(i.months).map((m) => m.total)),
    1
  );
  if (!shown.length || !months.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        How the town&apos;s attention shifted
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Each cell is the number of decisions on that issue in that month.
        Darker means more of the town&apos;s time went there.
      </p>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="flex">
            <div className="w-36 shrink-0" />
            {months.map((m) => (
              <div key={m} className="flex-1 text-center text-[9px] text-stone-400">
                {m.slice(2)}
              </div>
            ))}
          </div>
          {shown.map((i) => (
            <div key={i.issue} className="flex items-center gap-1 py-0.5">
              <div className="w-36 shrink-0 truncate pr-2 text-[11px] text-stone-700">
                {i.issue}
              </div>
              {months.map((m) => {
                const c = i.months[m];
                const n = c?.total ?? 0;
                return (
                  <div key={m} className="flex-1 px-px">
                    <div
                      className="flex h-6 items-center justify-center rounded-[2px] text-[9px] font-medium"
                      style={{
                        backgroundColor:
                          n === 0
                            ? "#f5f5f4"
                            : `rgba(30, 58, 138, ${0.15 + (n / max) * 0.85})`,
                        color: n / max > 0.55 ? "white" : "#57534e",
                      }}
                      title={`${i.issue} — ${m}: ${n} decision${n === 1 ? "" : "s"}`}
                    >
                      {n || ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------ issue evolution
// The conversation on one issue, in order: each decision as a dot on the
// timeline, with a running line showing the cumulative lean. The running
// line is "more" minus "less" so far - it goes up when the town approved
// something and down when it denied or deferred something.
function IssueEvolution({
  issues,
  months,
}: {
  issues: GovernanceSummary["issues"];
  months: string[];
}) {
  const usable = issues.filter((i) => i.count >= 2);
  const [sel, setSel] = useState<string>(usable[0]?.issue ?? "");
  const issue = usable.find((i) => i.issue === sel) ?? usable[0];
  if (!issue || !months.length) return null;

  const W = 620;
  const TOP = 26;
  const DOT_Y = 54;
  const LEAN_TOP = 84;
  const LEAN_H = 76;
  const PAD_L = 34;
  const PAD_R = 12;
  const PAD_B = 22;

  const idx = new Map(months.map((m, i) => [m, i]));
  const span = months.length;
  const x = (month: string) =>
    PAD_L +
    ((idx.get(month) ?? 0) / Math.max(span - 1, 1)) * (W - PAD_L - PAD_R);

  // Running lean: more minus less, cumulative.
  let run = 0;
  const lean = issue.decisions.map((d) => {
    if (d.direction === "toward more") run += 1;
    else if (d.direction === "toward less") run -= 1;
    return { month: d.month, run };
  });
  const maxAbs = Math.max(1, ...lean.map((l) => Math.abs(l.run)));
  const leanY = (v: number) =>
    LEAN_TOP + LEAN_H / 2 - (v / maxAbs) * (LEAN_H / 2 - 6);

  const leanPath = lean
    .map((l, i) => `${i === 0 ? "M" : "L"}${x(l.month)},${leanY(l.run)}`)
    .join(" ");

  const verbEntries = Object.entries(issue.verbs);

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        How the conversation evolved
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Pick an issue. Each dot is one decision, in the order the town made
        it. The line below tracks the running lean — up when the town
        approved something, down when it denied or deferred.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {usable.map((i) => (
          <button
            key={i.issue}
            onClick={() => setSel(i.issue)}
            aria-pressed={sel === i.issue}
            className={`rounded-full border px-3 py-1 text-xs ${
              sel === i.issue
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {i.issue}
          </button>
        ))}
      </div>

      {/* the town's own words */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-stone-600">What the town actually said:</span>
        {verbEntries.map(([v, c]) => (
          <span
            key={v}
            className="rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-700"
          >
            <span className="font-semibold">{v}</span> {c}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${LEAN_TOP + LEAN_H + PAD_B}`} className="mt-2 w-full"
           role="img"
           aria-label={`Decisions on ${issue.issue} over time, and the running lean`}>
        {/* month axis */}
        {months.map((m, i) =>
          i % 3 === 0 || i === months.length - 1 ? (
            <text key={m} x={x(m)} y={LEAN_TOP + LEAN_H + 14} textAnchor="middle"
                  fontSize="9" fill="#a8a29e">
              {m.slice(2)}
            </text>
          ) : null
        )}

        {/* decision dots */}
        {issue.decisions.map((d, i) => (
          <circle
            key={i}
            cx={x(d.month)}
            cy={DOT_Y}
            r="6"
            fill={
              d.direction === "toward more"
                ? DIR_MORE
                : d.direction === "toward less"
                ? DIR_LESS
                : DIR_ADMIN
            }
            stroke="white"
            strokeWidth="1.5"
          >
            <title>{`${d.date}: ${d.subject}`}</title>
          </circle>
        ))}

        {/* lean axis */}
        <line x1={PAD_L} x2={W - PAD_R} y1={leanY(0)} y2={leanY(0)}
              stroke="#d6d3d1" strokeWidth="1" />
        <text x={PAD_L - 6} y={leanY(0) + 3} textAnchor="end" fontSize="9" fill="#a8a29e">
          even
        </text>
        <text x={PAD_L - 6} y={leanY(maxAbs) + 3} textAnchor="end" fontSize="9" fill="#a8a29e">
          +{maxAbs}
        </text>
        <text x={PAD_L - 6} y={leanY(-maxAbs) + 3} textAnchor="end" fontSize="9" fill="#a8a29e">
          −{maxAbs}
        </text>

        {/* the running lean */}
        {lean.length > 1 && (
          <path d={leanPath} fill="none" stroke="#1e3a8a" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
        )}
        {lean.map((l, i) => (
          <circle key={i} cx={x(l.month)} cy={leanY(l.run)} r="3" fill="#1e3a8a" />
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-600">
        <Legend color={DIR_MORE} label="Approved / authorized" />
        <Legend color={DIR_LESS} label="Denied / deferred" />
        <Legend color={DIR_ADMIN} label="Routine" />
      </div>

      {/* the decisions themselves */}
      <ol className="mt-3 space-y-1.5 border-t border-stone-200 pt-2">
        {issue.decisions.map((d, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="w-20 shrink-0 text-stone-500">{fmtDate(d.date)}</span>
            {d.verb && (
              <span className="w-16 shrink-0 font-semibold uppercase tracking-wide text-stone-800">
                {d.verb}
              </span>
            )}
            <span className="min-w-0 flex-1 text-stone-800">{d.subject}</span>
            {d.amount && (
              <span className="shrink-0 font-medium text-stone-700">
                ${d.amount.toLocaleString()}
              </span>
            )}
            {d.url && (
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                 className="shrink-0 underline text-stone-500">
                source
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// -------------------------------------------------------------- issues
function IssueTracker({ summary }: { summary: GovernanceSummary }) {
  const [open, setOpen] = useState<string | null>(null);
  const issues = summary.issues.filter((i) => i.count > 0);
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        The issues the town keeps coming back to
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Substantive motions grouped by the matter they concern. An issue
        with a dozen decisions is a live argument; one with a single
        decision is housekeeping.
      </p>
      <ul className="mt-3 space-y-2">
        {issues.map((i) => {
          const expanded = open === i.issue;
          const movers = Object.entries(i.movers);
          return (
            <li key={i.issue} className="rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i.issue)}
                aria-expanded={expanded}
                className="w-full px-3 py-2.5 text-left"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-medium text-stone-900">{i.issue}</span>
                  <span className="shrink-0 text-xs text-stone-500">
                    {i.count} decision{i.count === 1 ? "" : "s"}
                    {i.first && i.last ? ` · ${fmtDate(i.first)}–${fmtDate(i.last)}` : ""}
                  </span>
                </div>
                <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-sm bg-stone-100">
                  <span style={{ width: `${(i.more / i.count) * 100}%`, backgroundColor: DIR_MORE }} />
                  <span style={{ width: `${(i.admin / i.count) * 100}%`, backgroundColor: DIR_ADMIN }} />
                  <span style={{ width: `${(i.less / i.count) * 100}%`, backgroundColor: DIR_LESS }} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-stone-600">
                  <span>{i.more} toward more</span>
                  <span>{i.less} toward less</span>
                  {i.money_named > 0 && (
                    <span className="font-medium text-stone-800">
                      ${i.money_named.toLocaleString()} named
                    </span>
                  )}
                </div>
                {Object.keys(i.verbs).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(i.verbs).map(([v, c]) => (
                      <span
                        key={v}
                        className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-700"
                      >
                        <span className="font-semibold">{v}</span> {c}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              {expanded && (
                <div className="border-t border-stone-100 px-3 py-2.5">
                  {movers.length > 0 && (
                    <p className="text-xs text-stone-600">
                      Moved most often by{" "}
                      {movers.map(([n, c], i) => (
                        <span key={n}>
                          {i > 0 && ", "}
                          <span className="font-medium text-stone-800">{n}</span> ({c})
                        </span>
                      ))}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1.5">
                    {summary.motions
                      .filter((m) => m.issue === i.issue)
                      .map((m, k) => (
                        <li key={k} className="text-xs">
                          <span className="text-stone-500">{fmtDate(m.date)}</span>{" "}
                          <span className="text-stone-800">{m.subject}</span>
                          {m.mover && (
                            <span className="text-stone-500"> — {m.mover}</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------- attendance
function AttendanceTable({ rows }: { rows: GovernanceSummary["attendance"] }) {
  const [open, setOpen] = useState<string | null>(rows[0]?.committee ?? null);
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        Who shows up
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Meetings each member attended, out of the meetings where the
        minutes record them. An excused absence still counts as being on
        the body.
      </p>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => {
          const expanded = open === r.committee;
          return (
            <li key={r.committee} className="rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : r.committee)}
                aria-expanded={expanded}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="text-sm font-medium text-stone-900">
                  {r.committee}
                </span>
                <span className="shrink-0 text-xs text-stone-500">
                  {r.people.length} people · {r.meetings} meetings recorded
                </span>
              </button>
              {expanded && (
                <ul className="space-y-1.5 border-t border-stone-100 px-3 py-2.5">
                  {r.people.map((p) => (
                    <li key={p.name} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 truncate text-xs text-stone-700 sm:w-40">
                        {p.name}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-sm bg-stone-100">
                        <span
                          className="block h-full rounded-sm bg-stone-600"
                          style={{ width: `${p.rate}%` }}
                        />
                      </span>
                      <span className="w-14 shrink-0 text-right text-[11px] text-stone-500">
                        {p.present}/{p.present + p.excused} · {p.rate}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// -------------------------------------------------------- voting analysis
function VotingAnalysis({ summary }: { summary: GovernanceSummary }) {
  const [tab, setTab] = useState<"contested" | "pairs" | "records">("contested");
  const record = summary.members.filter((m) => m.yes + m.no + m.abstain > 0);
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        How members actually voted
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Only a minority of meetings record who voted which way. This is
        everything the minutes spell out.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["contested", `Where anyone dissented (${summary.contested.length})`],
            ["pairs", "Who votes with whom"],
            ["records", "Every member's record"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`rounded-full border px-3 py-1 text-xs ${
              tab === key
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "contested" && (
        <div className="mt-3">
          {summary.contested.length === 0 ? (
            <p className="text-sm text-stone-600">
              No recorded vote had a no or an abstention.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.contested.map((c, i) => (
                <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs text-stone-600">{fmtDate(c.date)}</span>
                    <span className="text-xs font-medium text-stone-800">
                      {c.committee}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-stone-900">
                    {c.dissenters.length > 0 && (
                      <>
                        <span className="font-semibold text-red-800">
                          {c.dissenters.join(", ")} voted no.
                        </span>{" "}
                      </>
                    )}
                    {c.abstentions.length > 0 && (
                      <span className="text-amber-900">
                        {c.abstentions.join(", ")} abstained.
                      </span>
                    )}
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer"
                       className="mt-1 inline-block text-xs underline text-stone-600">
                      Source minutes
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "pairs" && (
        <ul className="mt-3 space-y-1">
          {summary.vote_pairs.slice(0, 16).map((p, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 border-b border-stone-100 py-1.5 text-sm">
              <span className="min-w-0 truncate text-stone-800">
                {p.a} <span className="text-stone-400">+</span> {p.b}
              </span>
              <span className="shrink-0 text-xs text-stone-500">
                {p.together} vote{p.together === 1 ? "" : "s"} together
                {p.share !== null ? ` · ${p.share}%` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === "records" && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                <th className="py-1.5 pr-3 font-medium text-stone-600">Member</th>
                <th className="py-1.5 pr-3 text-right font-medium text-stone-600">Yes</th>
                <th className="py-1.5 pr-3 text-right font-medium text-stone-600">No</th>
                <th className="py-1.5 pr-3 text-right font-medium text-stone-600">Abstain</th>
                <th className="py-1.5 text-right font-medium text-stone-600">Motions moved</th>
              </tr>
            </thead>
            <tbody>
              {record.map((m) => (
                <tr key={m.name} className="border-b border-stone-100">
                  <td className="py-1.5 pr-3 text-stone-800">{m.name}</td>
                  <td className="py-1.5 pr-3 text-right text-stone-700">{m.yes}</td>
                  <td className={`py-1.5 pr-3 text-right ${m.no ? "font-semibold text-red-800" : "text-stone-400"}`}>
                    {m.no || "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-stone-400">{m.abstain || "—"}</td>
                  <td className="py-1.5 text-right text-stone-600">{m.moved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------- relationships
function Relationships({ summary }: { summary: GovernanceSummary }) {
  const rels = summary.relationships;
  const max = Math.max(...rels.map((r) => r.count), 1);
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        Who works with whom
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        A second is the public act of supporting a motion for discussion.
        These are the pairs that have done it most often — structure, not
        a verdict about anyone.
      </p>
      <ul className="mt-3 space-y-1.5">
        {rels.slice(0, 14).map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-36 shrink-0 truncate text-xs text-stone-700 sm:w-44">
              {r.mover}
            </span>
            <span className="shrink-0 text-xs text-stone-400">→</span>
            <span className="w-32 shrink-0 truncate text-xs text-stone-700 sm:w-40">
              {r.seconder}
            </span>
            <span className="h-3 flex-1 overflow-hidden rounded-sm bg-stone-100">
              <span
                className="block h-full rounded-sm bg-stone-500"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-xs font-medium text-stone-900">
              {r.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --------------------------------------------------------------- money
function MoneyTrail({ rows }: { rows: GovernanceSummary["money"] }) {
  const top = rows.slice(0, 12);
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        The money
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        The largest dollar figures the motions name. Some of these are
        spending; some are moving money between accounts; all of them are
        in the minutes.
      </p>
      <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-200">
        {top.map((m, i) => (
          <li key={i} className="py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-serif text-lg font-semibold text-stone-900">
                ${m.amount.toLocaleString()}
              </span>
              <span className="text-xs text-stone-500">
                {fmtDate(m.date)} · {m.committee}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-stone-800">{m.subject}</div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-stone-500">
              <span>{m.issue}</span>
              {m.mover && <span>moved by {m.mover}</span>}
              {m.url && (
                <a href={m.url} target="_blank" rel="noopener noreferrer"
                   className="underline">
                  Source minutes
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -------------------------------------------------------------- timeline
function Timeline({ data }: { data: GovernanceSummary["timeline"] }) {
  if (!data.length) return null;
  const W = 620;
  const H = 110;
  const PAD_B = 22;
  const max = Math.max(...data.map((d) => d.motions), 1);
  const bw = W / data.length;
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        Activity month by month
      </h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img"
           aria-label={`Motions per month, ${data.length} months from ${data[0].month} to ${data[data.length-1].month}`}>
        {data.map((d, i) => {
          const h = (d.motions / max) * (H - PAD_B);
          return (
            <g key={d.month}>
              <rect
                x={i * bw + bw * 0.18}
                y={H - PAD_B - h}
                width={bw * 0.64}
                height={Math.max(h, 1)}
                fill="#57534e"
                rx="1"
              >
                <title>{`${d.month}: ${d.motions} motions`}</title>
              </rect>
              {(i % 3 === 0 || i === data.length - 1) && (
                <text x={i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#78716c">
                  {d.month.slice(2)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ------------------------------------------------------- representation
function Representation({ summary }: { summary: GovernanceSummary }) {
  const board = summary.committees.find((c) =>
    /select ?board|selectmen/i.test(c.committee));
  const reps = summary.state_reps.filter((r) =>
    (r.towns || "").includes("Pembroke"));

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        Who represents you
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Pembroke elects town officials at-large — everyone votes for the same
        slate. Your <em>state</em> representatives are the ones elected by
        district.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {reps.map((r) => (
          <div key={r.chamber + r.district} className="rounded-lg border border-stone-200 p-3">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              {r.chamber === "senate" ? "State Senate" : "State House"} · District {r.district}
            </div>
            <div className="mt-0.5 font-serif text-lg font-semibold text-stone-900">
              {r.name}
            </div>
            <div className="mt-0.5 text-xs text-stone-600">
              {r.party === "R" ? "Republican" : "Democrat"}
            </div>
            {r.url && (
              <a href={r.url} target="_blank" rel="noopener noreferrer"
                 className="mt-1.5 inline-block text-xs underline text-stone-700">
                Official profile
              </a>
            )}
          </div>
        ))}
      </div>

      {board && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-stone-900">
            Board of Selectmen
          </h4>
          <p className="mt-0.5 text-xs text-stone-600">
            The town&apos;s executive branch — five members elected to
            three-year terms, meeting twice a month.
          </p>
          <ul className="mt-2 divide-y divide-stone-100">
            {summary.members
              .filter((m) => m.committees.some((c) => /select ?board|selectmen/i.test(c)))
              .map((m) => (
                <MemberRow key={m.name} m={m} />
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemberRow({ m }: { m: MemberSummary }) {
  const topic = m.top_topic;
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
      <span className="min-w-0">
        <span className="font-medium text-stone-900">{m.name}</span>
        {m.title && (
          <span className="ml-1.5 text-xs text-stone-500">{m.title}</span>
        )}
        <span className="block text-xs text-stone-600">
          {m.committees.slice(0, 3).join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-right text-xs text-stone-600">
        {m.present > 0 && (
          <span className="block">
            present at {m.present} meeting{m.present === 1 ? "" : "s"}
          </span>
        )}
        {m.moved > 0 && (
          <span className="block">
            moved {m.moved} motion{m.moved === 1 ? "" : "s"}
            {topic && topic !== "Other business" ? `, mostly ${topic.toLowerCase()}` : ""}
          </span>
        )}
        {(m.yes > 0 || m.no > 0) && (
          <span className="block">
            {m.yes} recorded yes{m.no ? `, ${m.no} no` : ""}
          </span>
        )}
      </span>
    </li>
  );
}

// ------------------------------------------------------------ the record
function MotionRecord({ motions }: { motions: MotionRow[] }) {
  const [committee, setCommittee] = useState("all");
  const [topic, setTopic] = useState("all");
  const [issue, setIssue] = useState("all");
  const [direction, setDirection] = useState("all");
  const [query, setQuery] = useState("");

  const committees = useMemo(
    () => Array.from(new Set(motions.map((m) => m.committee))).sort(),
    [motions]
  );
  const topics = useMemo(
    () => Array.from(new Set(motions.map((m) => m.topic))).sort(),
    [motions]
  );
  const issues = useMemo(
    () => Array.from(new Set(motions.map((m) => m.issue))).sort(),
    [motions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return motions.filter((m) => {
      if (committee !== "all" && m.committee !== committee) return false;
      if (topic !== "all" && m.topic !== topic) return false;
      if (issue !== "all" && m.issue !== issue) return false;
      if (direction !== "all" && m.direction !== direction) return false;
      if (q) {
        const hay = `${m.subject} ${m.mover ?? ""} ${m.seconder ?? ""} ${m.topic} ${m.issue}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [motions, committee, topic, issue, direction, query]);

  const sel = "rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm";

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">The record</h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Every substantive motion we could read out of the minutes. Tap any
        row to open the source document.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search decisions…"
          className={`${sel} sm:col-span-2`}
          aria-label="Search decisions"
        />
        <select value={committee} onChange={(e) => setCommittee(e.target.value)}
                className={sel} aria-label="Filter by committee">
          <option value="all">All committees</option>
          {committees.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={topic} onChange={(e) => setTopic(e.target.value)}
                className={sel} aria-label="Filter by subject">
          <option value="all">All subjects</option>
          {topics.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={issue} onChange={(e) => setIssue(e.target.value)}
                className={sel} aria-label="Filter by issue">
          <option value="all">All issues</option>
          {issues.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["all", "toward more", "toward less", "administrative"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            aria-pressed={direction === d}
            className={`rounded-full border px-3 py-1 text-xs ${
              direction === d
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {d === "all" ? "Everything" : directionLabel[d]}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-stone-500">
        Showing {filtered.length} of {motions.length}
      </p>

      <ul className="mt-2 divide-y divide-stone-100 border-t border-stone-200">
        {filtered.slice(0, 120).map((m, i) => (
          <li key={`${m.date}-${m.committee}-${i}`} className="py-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xs text-stone-500">{fmtDate(m.date)}</span>
              <span className="text-xs font-medium text-stone-700">
                {m.committee}
              </span>
              <DirectionBadge direction={m.direction} />
            </div>
            <div className="mt-0.5 text-sm text-stone-900">{m.subject}</div>
            <div className="mt-0.5 text-xs text-stone-600">
              {m.mover ? (
                <>Moved by <span className="font-medium">{m.mover}</span></>
              ) : (
                "Mover not recorded"
              )}
              {m.seconder && (
                <>
                  {" · "}Seconded by{" "}
                  <span className="font-medium">{m.seconder}</span>
                </>
              )}
            </div>
            {m.verb && (
              <div className="mt-1 inline-block rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-700">
                {m.verb}
              </div>
            )}
            {m.url && (
              <a href={m.url} target="_blank" rel="noopener noreferrer"
                 className="mt-0.5 inline-block text-xs underline text-stone-500">
                Source minutes
              </a>
            )}
          </li>
        ))}
      </ul>
      {filtered.length > 120 && (
        <p className="mt-2 text-xs text-stone-500">
          Showing the first 120. Narrow the filters to see more.
        </p>
      )}
    </div>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  const color =
    direction === "toward more"
      ? "bg-green-100 text-green-900"
      : direction === "toward less"
      ? "bg-amber-100 text-amber-900"
      : "bg-stone-100 text-stone-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] ${color}`}>
      {directionLabel[direction] ?? direction}
    </span>
  );
}

// ------------------------------------------------------------ the votes
function RecordedVotes({ summary }: { summary: GovernanceSummary }) {
  if (!summary.votes.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">
        Votes where the minutes name who voted how
      </h3>
      <p className="mt-0.5 text-xs text-stone-600">
        Most committees record &ldquo;all in favor&rdquo; without naming
        anyone. These are the ones that spell it out — the closest thing to a
        written record of how each member voted.
      </p>
      <ul className="mt-3 space-y-2">
        {summary.votes.map((v, i) => (
          <li key={`${v.date}-${i}`} className="rounded-lg border border-stone-200 p-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs text-stone-500">{fmtDate(v.date)}</span>
              <span className="text-xs font-medium text-stone-700">
                {v.committee}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {v.votes.map((rec, j) => (
                <span
                  key={j}
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    rec.vote === "yes"
                      ? "bg-green-100 text-green-900"
                      : rec.vote === "no"
                      ? "bg-red-100 text-red-900"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {rec.name}{rec.vote === "yes" ? " — yes" : rec.vote === "no" ? " — no" : ` — ${rec.vote}`}
                </span>
              ))}
            </div>
            {v.url && (
              <a href={v.url} target="_blank" rel="noopener noreferrer"
                 className="mt-1.5 inline-block text-xs underline text-stone-500">
                Source minutes
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ main
export function DecisionsView({ summary }: { summary: GovernanceSummary }) {
  const { totals, source_span } = summary;
  return (
    <div>
      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={String(totals.motions)} label="decisions read from the minutes" />
        <Stat value={String(totals.issues)} label="distinct issues the town has worked" />
        <Stat value={String(totals.less)} label="moved the town toward less" tone="amber" />
        <Stat value={String(totals.contested)} label="votes where anyone dissented" tone="amber" />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <TopicChart topics={summary.topics} />
        <DirectionChart topics={summary.topics} />
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <IssueTracker summary={summary} />
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <AttentionGrid issues={summary.issues} months={summary.months} />
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <IssueEvolution issues={summary.issues} months={summary.months} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <AttendanceTable rows={summary.attendance} />
        <Relationships summary={summary} />
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <VotingAnalysis summary={summary} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <MoneyTrail rows={summary.money} />
        <div>
          <Timeline data={summary.timeline} />
        </div>
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <Representation summary={summary} />
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <MotionRecord motions={summary.motions} />
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <RecordedVotes summary={summary} />
      </div>

      <div className="mt-8 rounded-lg border border-stone-300 bg-stone-50 p-5">
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          How to read this
        </h3>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-stone-700">
          <li>
            Everything here comes from the town&apos;s own published meeting
            minutes, which are public records in New Hampshire. Each decision
            links back to the document it came from, so you can check it.
          </li>
          <li>
            <strong>The town&apos;s own words are the evidence.</strong> The
            little action chips — <em>approve</em>, <em>deny</em>,{" "}
            <em>waive</em>, <em>table</em> — are the words in the motion
            itself. The &ldquo;toward more&rdquo; and &ldquo;toward less&rdquo;
            labels are our reading of those words; the chips beside them are
            the fact. Every decision shows its own wording and links to the
            document it came from, so you can check our reading against
            the source.
          </li>
          <li>
            <strong>Nobody is scored or ranked.</strong> There is no
            &ldquo;pro&rdquo; or &ldquo;anti&rdquo; rating for any member,
            and deliberately no overall score. Most committees record
            &ldquo;all in favor&rdquo; without naming individuals, so a score
            would be built on the minority of meetings that do name votes
            and would look authoritative while being mostly fiction.
          </li>
          <li>
            The direction label reads the action a motion asked for. A
            motion to approve something points one way; a motion to deny
            something points the other. It is a plain reading of the words,
            not a judgement about anyone.
          </li>
          <li>
            &ldquo;Moved&rdquo; means the person who made the motion;
            &ldquo;Seconded&rdquo; means the person who supported it for
            discussion. Both are recorded in the minutes.
          </li>
          <li>
            Routine business — approving minutes, paying bills, scheduling
            meetings — is filtered out. It is real, but it does not show
            which way the town is heading.
          </li>
          <li>
            <strong>Attendance is attendance, not a verdict.</strong> Some
            committees are small and meet irregularly, so a percentage
            means different things in different rooms. It is here because
            showing up is a fact, not because it is a judgement.
          </li>
          <li>
            <strong>&ldquo;Who works with whom&rdquo; is structure, not
            influence.</strong> A second is the public act of supporting a
            motion for discussion. We do not turn that into a measure of
            anyone&rsquo;s power, and we do not rank names.
          </li>
          <li>
            Issues are grouped by the matter a motion concerns, so
            &ldquo;sewer billing and abatements&rdquo; brings together
            every late-penalty decision the commission made. The grouping
            is ours, not the town&rsquo;s — the wording of each decision is
            the town&rsquo;s own.
          </li>
        </ul>
        <p className="mt-4 text-xs text-stone-500">
          Covers {source_span.start ? fmtDate(source_span.start) : "—"} to{" "}
          {source_span.end ? fmtDate(source_span.end) : "—"} ·{" "}
          {summary.minutes_count} meeting documents read
        </p>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "green" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-green-800"
      : tone === "amber"
      ? "text-amber-800"
      : "text-stone-900";
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className={`font-serif text-2xl font-semibold ${color}`}>{value}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-stone-600">{label}</div>
    </div>
  );
}
