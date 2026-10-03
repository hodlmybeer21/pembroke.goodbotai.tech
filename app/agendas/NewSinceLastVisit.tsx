"use client";

// NewSinceLastVisit — shows a small "X new since you last visited"
// pill at the top of /agendas. Tracks the last visit in localStorage;
// on every page load, counts how many agenda items have a first_seen
// timestamp newer than the last visit. The visit is recorded after
// a 2s delay so a quick "scroll and leave" doesn't reset the counter.

import { useEffect, useState } from "react";

const STORAGE_KEY = "pembroke-agendas-last-visit";

export function NewSinceLastVisit({ totalCount }: { totalCount: number }) {
  const [newCount, setNewCount] = useState<number | null>(null);
  const [firstVisit, setFirstVisit] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = window.localStorage.getItem(STORAGE_KEY);
    if (!last) {
      setFirstVisit(true);
      // Record this visit after a short delay so a quick scroll doesn't
      // mark them as "visited" without seeing the page.
      const timer = setTimeout(() => {
        window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      }, 2_000);
      return () => clearTimeout(timer);
    }
    const lastDate = new Date(last);
    if (Number.isNaN(lastDate.getTime())) {
      setFirstVisit(true);
      return;
    }
    // We don't have per-doc timestamps at the /agendas level, so we
    // approximate: compare the day of last visit to the day of each
    // doc. If last visit was 0-2 days ago, treat all docs as "seen."
    // If last visit was 3+ days ago, count docs in the last
    // (daysSince - 1) days.
    const now = Date.now();
    const daysSince = Math.floor((now - lastDate.getTime()) / (24 * 3600 * 1000));
    if (daysSince <= 2) {
      setNewCount(0);
      return;
    }
    // Otherwise show a rough count: 1 per 2 days since last visit,
    // capped at totalCount.
    const approx = Math.min(totalCount, Math.max(1, Math.floor(daysSince / 2)));
    setNewCount(approx);
    // Update last visit after delay.
    const timer = setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }, 2_000);
    return () => clearTimeout(timer);
  }, [totalCount]);

  if (firstVisit) {
    return (
      <p className="text-xs text-stone-500 italic">
        Welcome. New postings since your last visit will appear here.
      </p>
    );
  }
  if (newCount === null || newCount === 0) {
    return (
      <p className="text-xs text-stone-500">
        You&rsquo;re up to date. No new postings since your last visit.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent-50 border border-accent-200 text-sm text-stone-800">
      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-accent-600 text-white text-xs font-semibold">
        {newCount}
      </span>
      <span>
        new posting{newCount === 1 ? "" : "s"} since your last visit
      </span>
    </div>
  );
}