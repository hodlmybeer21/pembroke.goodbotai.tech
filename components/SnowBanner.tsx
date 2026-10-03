"use client";

// components/SnowBanner.tsx — Amber alert bar that sits above the navy
// header on every page. Server component fetches the notice (or returns
// null), then passes it as a prop. This thin client wrapper handles the
// dismiss button (localStorage) so a returning visitor doesn't see the
// same notice twice.

import { useEffect, useState } from "react";
import type { SnowNotice } from "@/lib/snow";

const DISMISS_KEY_PREFIX = "snow-banner-dismissed:";

function dismissKey(n: SnowNotice): string {
  // Key on the start of the ban's "until" timestamp — that changes whenever
  // a new declaration supersedes a dismissed one.
  return DISMISS_KEY_PREFIX + n.until.toISOString();
}

export function SnowBanner({ notice }: { notice: SnowNotice }) {
  const [hidden, setHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // After hydration, check localStorage for a previous dismiss. Default
  // to visible on the server pass so SSR markup matches what the user
  // sees in their first paint.
  useEffect(() => {
    setHydrated(true);
    try {
      if (window.localStorage.getItem(dismissKey(notice)) === "1") {
        setHidden(true);
      }
    } catch {
      // localStorage may be unavailable (private mode, etc.) — show banner.
    }
  }, [notice]);

  if (hydrated && hidden) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(dismissKey(notice), "1");
    } catch {
      // ignore
    }
    setHidden(true);
  };

  // Format the end timestamp as a short ET string. e.g. "until Sat 6 am".
  const until = notice.until.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full text-stone-900"
      style={{ background: "var(--accent)", borderBottom: "1px solid #b25e05" }}
    >
      <div className="max-w-site mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="font-medium">
          <span className="font-semibold mr-1">Snow emergency:</span>
          {notice.title}
          {" · "}
          <span className="opacity-80">until {until}</span>
          {notice.url && (
            <>
              {" · "}
              <a
                href={notice.url}
                className="underline font-medium hover:no-underline"
                target="_blank"
                rel="noreferrer"
              >
                Town notice
              </a>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 -mr-1 px-2 py-0.5 rounded text-stone-900/70 hover:text-stone-900 hover:bg-black/5 focus:outline-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
