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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return motions.filter((m) => {
      if (committee !== "all" && m.committee !== committee) return false;
      if (topic !== "all" && m.topic !== topic) return false;
      if (direction !== "all" && m.direction !== direction) return false;
      if (q) {
        const hay = `${m.subject} ${m.mover ?? ""} ${m.seconder ?? ""} ${m.topic}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [motions, committee, topic, direction, query]);

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
        <Stat value={String(totals.more)} label="moved the town toward more" tone="green" />
        <Stat value={String(totals.less)} label="moved the town toward less" tone="amber" />
        <Stat value={String(summary.votes.length)} label="votes recorded by name" />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <TopicChart topics={summary.topics} />
        <DirectionChart topics={summary.topics} />
      </div>

      <div className="mt-8">
        <Timeline data={summary.timeline} />
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
