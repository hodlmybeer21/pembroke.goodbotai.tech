"use client";

// SnowTestMode — client component that reads ?snow=test from the URL
// and forces the snow banner to render. For Tyler's testing before the
// first real storm. Not linked from any UI.
//
// Usage: visit https://pembroke-goodbotai-tech.vercel.app/?snow=test
// to see the banner. The test mode also adds a small "TEST MODE" pill
// in the corner so it's obvious the banner is being forced.

import { useEffect, useState } from "react";
import { SnowBanner } from "./SnowBanner";

interface TestNotice {
  title: string;
  until: Date;
  url: string;
}

const TEST_NOTICE: Omit<TestNotice, "until"> = {
  title: "Snow emergency parking ban in effect",
  url: "https://www.pembroke-nh.com/1303/Winter-Parking-and-Snow-Emergency-Info",
};

export function SnowTestMode() {
  const [notice, setNotice] = useState<TestNotice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("snow") === "test") {
      setNotice({
        ...TEST_NOTICE,
        until: new Date(Date.now() + 12 * 3600 * 1000),
      });
    }
  }, []);

  if (!notice) return null;

  return (
    <>
      <SnowBanner notice={notice} />
      <div
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs font-semibold shadow-lg"
        role="status"
        aria-label="Test mode active"
      >
        TEST MODE
      </div>
    </>
  );
}