"use client";

// components/TrashLookup.tsx — Search-as-you-type street lookup.
// Receives the full route index from the server, indexes it in
// memory, and re-renders the result list as the user types. No network
// round-trips after the initial load.

import { useMemo, useState } from "react";

interface TrashHit {
  street: string;
  day: string;
}

interface Props {
  byDay: Record<string, string[]>;
  noPickup: string[];
  byDayOrder: string[];
  generatedAt: string;
  sourceByDay: string;
  sourceByStreet: string;
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TrashLookup({
  byDay,
  noPickup,
  byDayOrder,
  generatedAt,
  sourceByDay,
}: Props) {
  const [q, setQ] = useState("");

  // Build a flat searchable list once. We sort by the original by-day
  // list order (Monday, Wednesday, Thursday, Friday — Pembroke has no
  // Tuesday service) so the day-grouped "browse" view below the
  // search box stays in the same order as the town PDF.
  const flat: TrashHit[] = useMemo(() => {
    const out: TrashHit[] = [];
    const order = byDayOrder.length ? byDayOrder : DAY_ORDER;
    for (const day of order) {
      for (const street of byDay[day] ?? []) {
        out.push({ street, day });
      }
    }
    for (const street of noPickup) {
      out.push({ street, day: "No pickup" });
    }
    return out;
  }, [byDay, noPickup, byDayOrder]);

  const trimmed = q.trim().toLowerCase();
  const hits: TrashHit[] = useMemo(() => {
    if (!trimmed) return [];
    const scored: Array<{ hit: TrashHit; pos: number; len: number }> = [];
    for (const h of flat) {
      const pos = h.street.toLowerCase().indexOf(trimmed);
      if (pos < 0) continue;
      scored.push({ hit: h, pos, len: h.street.length });
    }
    scored.sort((a, b) => a.pos - b.pos || a.len - b.len);
    return scored.slice(0, 8).map((s) => s.hit);
  }, [flat, trimmed]);

  return (
    <div>
      <div className="mb-6">
        <label htmlFor="street-input" className="block text-sm font-medium text-stone-700 mb-1.5">
          Find your street
        </label>
        <input
          id="street-input"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Main Street, Buck, Plausawa Hill"
          className="w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm bg-white focus:border-brand-500"
        />
        <p className="mt-1.5 text-xs text-stone-500">
          {trimmed
            ? `${hits.length} match${hits.length === 1 ? "" : "es"}`
            : "Type to search the town's full route list. Matches are case-insensitive and partial (e.g. \"Buck\" finds both halves of Buck Street)."}
        </p>
      </div>

      {/* Search results — only shown when the user has typed something */}
      {trimmed && (
        <div className="surface p-4 mb-8">
          {hits.length === 0 ? (
            <p className="text-sm text-stone-600">
              No match in the town's route list. Try a shorter prefix, or{" "}
              <a
                href="https://www.pembroke-nh.com/1298/Solid-Waste-Collection"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                check the Solid Waste page
              </a>{" "}
              on pembroke-nh.com.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {hits.map((h) => (
                <li key={h.street} className="py-2.5 first:pt-0 last:pb-0 flex items-baseline gap-3">
                  <span className="font-medium text-stone-900 flex-1">{h.street}</span>
                  <span
                    className={
                      h.day === "No pickup"
                        ? "text-xs font-medium text-stone-500"
                        : "text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                    }
                  >
                    {h.day}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Curbside reminder — same for every day. */}
      {trimmed && hits.length > 0 && hits[0].day !== "No pickup" && (
        <div className="surface p-4 mb-8 border-l-4 border-amber-400">
          <div className="text-sm font-medium text-stone-900 mb-1">Reminder</div>
          <p className="text-sm text-stone-700">
            Carts curbside by <strong>6:45 am</strong> on {hits[0].day}. Recycling
            pickup is mandatory in Pembroke — recyclables go in the same cart as
            trash (zero-sort). The new truck picks up one side of the street at a
            time, so your pickup may arrive at a different hour than in past
            years.
          </p>
        </div>
      )}

      {/* Browse view — full route list grouped by day. */}
      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          All streets by pickup day
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(byDayOrder.length ? byDayOrder : DAY_ORDER).map((day) => {
            const streets = byDay[day] ?? [];
            if (streets.length === 0) return null;
            return (
              <div key={day} className="surface p-4">
                <h3 className="font-serif text-sm font-semibold text-stone-900 mb-2 border-b border-stone-100 pb-1.5">
                  {day}
                  <span className="ml-1.5 text-xs font-normal text-stone-500">
                    {streets.length}
                  </span>
                </h3>
                <ul className="text-xs text-stone-700 space-y-0.5">
                  {streets.map((s) => (
                    <li
                      key={s}
                      className="cursor-pointer hover:text-brand-700"
                      onClick={() => setQ(s)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {noPickup.length > 0 && (
          <div className="mt-4 text-xs text-stone-500">
            <strong>No curbside pickup:</strong> {noPickup.join(", ")}
          </div>
        )}
        <div className="mt-6 text-xs text-stone-500 flex flex-col sm:flex-row sm:justify-between gap-2">
          <span>
            Source:{" "}
            <a href={sourceByDay} className="underline" target="_blank" rel="noreferrer">
              pembroke-nh.com Rubbish Routes
            </a>
            . Refreshed {new Date(generatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}.
          </span>
          <span>
            Questions?{" "}
            <a href="tel:6034854422" className="underline">
              603-485-4422
            </a>{" "}
            (Public Works).
          </span>
        </div>
      </section>
    </div>
  );
}
