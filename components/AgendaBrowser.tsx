"use client";

// components/AgendaBrowser.tsx — search and filter the town's agenda
// and minutes archive.
//
// Runs entirely in the browser over the full document index, so all 630
// entries are reachable and the filters respond instantly.

import { useMemo, useState } from "react";
import type { ArchiveDoc } from "@/lib/town-data";
import { formatEt, parseMeetingDate, TOWN_TZ } from "@/lib/dates";

interface Props {
  docs: ArchiveDoc[];
  committees: string[];
  generatedAt?: string;
}

type TypeFilter = "all" | "Agenda" | "Minutes";

/** "Oct 19, 2026" or "2026-10-19" -> a sortable date, or null.
 *  (The old parser only accepted full month names, so every
 *  abbreviated month - i.e. almost the whole archive - sorted as
 *  "no date" and the newest visible entry looked like May.) */
const parseDate = parseMeetingDate;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(s: string) {
  const d = parseDate(s);
  if (!d) return s;
  return d.toLocaleDateString("en-US", {
    timeZone: TOWN_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AgendaBrowser({ docs, committees, generatedAt }: Props) {
  const [committee, setCommittee] = useState("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [show, setShow] = useState(30);

  // Sorted newest first, once.
  const sorted = useMemo(
    () =>
      [...docs].sort((a, b) => {
        const da = parseDate(a.meeting_date)?.getTime() ?? 0;
        const db = parseDate(b.meeting_date)?.getTime() ?? 0;
        return db - da;
      }),
    [docs]
  );

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const d of sorted) {
      const dt = parseDate(d.meeting_date);
      if (dt) set.add(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    return [...set].sort().reverse();
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((d) => {
      if (committee !== "all" && d.committee !== committee) return false;
      if (type !== "all" && d.doc_type !== type) return false;
      if (month !== "all") {
        const dt = parseDate(d.meeting_date);
        if (!dt) return false;
        const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
        if (key !== month) return false;
      }
      if (q) {
        const hay = `${d.title} ${d.committee} ${d.summary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, committee, type, month, query]);

  const sel =
    "rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm";

  return (
    <div>
      {/* filters */}
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShow(30);
          }}
          placeholder="Search agendas and minutes…"
          className={`${sel} sm:col-span-2`}
          aria-label="Search agendas and minutes"
        />
        <select
          value={committee}
          onChange={(e) => {
            setCommittee(e.target.value);
            setShow(30);
          }}
          className={sel}
          aria-label="Filter by committee"
        >
          <option value="all">All committees</option>
          {committees.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setShow(30);
          }}
          className={sel}
          aria-label="Filter by month"
        >
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m.slice(0, 4)} — {MONTHS[Number(m.slice(5)) - 1]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {(["all", "Agenda", "Minutes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setShow(30);
            }}
            aria-pressed={type === t}
            className={`rounded-full border px-3 py-1 text-xs ${
              type === t
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {t === "all" ? "Everything" : t === "Agenda" ? "Agendas" : "Minutes"}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-stone-600">
        Showing{" "}
        <strong className="text-stone-900">
          {Math.min(show, filtered.length)}
        </strong>{" "}
        of {filtered.length} document{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-4 text-stone-600">
          Nothing matches those filters. Try widening the search.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {filtered.slice(0, show).map((d) => (
            <li
              key={d.guid}
              className="rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                <time className="text-stone-500">{fmt(d.meeting_date)}</time>
                <span className="font-medium text-stone-700">
                  {d.committee}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    d.doc_type === "Minutes"
                      ? "bg-stone-100 text-stone-700"
                      : "bg-blue-50 text-blue-900"
                  }`}
                >
                  {d.doc_type}
                </span>
              </div>
              {d.summary ? (
                <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
                  {d.summary.length > 260
                    ? d.summary.slice(0, 259).trimEnd() + "…"
                    : d.summary}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-stone-500">
                  {d.title}
                </p>
              )}
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs underline text-stone-600"
              >
                Read the town&rsquo;s document →
              </a>
            </li>
          ))}
        </ul>
      )}

      {show < filtered.length && (
        <button
          onClick={() => setShow((s) => s + 30)}
          className="mt-4 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
        >
          Show 30 more ({filtered.length - show} left)
        </button>
      )}

      {generatedAt && (
        <p className="mt-8 border-t border-stone-200 pt-4 text-xs text-stone-500">
          Archive read{" "}
          {formatEt(generatedAt)}
          . Summaries are generated on-device from the town&rsquo;s own PDFs.
        </p>
      )}
    </div>
  );
}
