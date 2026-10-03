// app/layout.tsx — Root layout. Dark navy header with serif wordmark + amber
// accent underline on the active nav link. Body is the warm-stone background
// from the design system.

import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProviderWrapper } from "@/components/ClerkProviderWrapper";
import { NavLink } from "@/components/NavLink";
import { NavAuth } from "@/components/NavAuth";
import { MobileMenu } from "@/components/MobileMenu";
import { SnowBanner } from "@/components/SnowBanner";
import { SnowTestMode } from "@/components/SnowTestMode";
import { Wordmark } from "@/components/Wordmark";
import { getActiveSnowNotice } from "@/lib/snow";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pembroke, NH — town brief",
  description:
    "What Pembroke NH town government is doing — meetings, agendas, decisions. Daily brief for residents.",
  openGraph: {
    title: "Pembroke, NH — town brief",
    description:
      "Pembroke's town government, in plain English. Meetings, agendas, trash day, who to call. Refreshed every hour.",
    images: [{ url: "/og-default.svg", width: 1200, height: 630, alt: "Pembroke, NH" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pembroke, NH — town brief",
    description: "Pembroke's town government, in plain English.",
    images: ["/og-default.svg"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Snow emergency banner sits above the navy header. The fetch is
  // best-effort — if the iCal feed is slow or down, we render nothing
  // rather than blocking the whole page.
  const snow = await getActiveSnowNotice().catch(() => null);
  return (
    <ClerkProviderWrapper>
      <html lang="en">
        <body className="min-h-screen flex flex-col">
          {snow && <SnowBanner notice={snow} />}
          <SnowTestMode />
          <header className="surface-header sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
            <div className="max-w-site mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
              <Link
                href="/"
                className="font-serif text-xl font-semibold tracking-tight text-white shrink-0 flex items-center gap-2"
              >
                <Wordmark className="w-6 h-6" />
                <span>Pembroke, NH</span>
              </Link>
              <nav className="hidden lg:flex gap-5 text-white items-center text-sm">
                <NavLink href="/calendar">Calendar</NavLink>
                <NavLink href="/agendas">Agendas</NavLink>
                <NavLink href="/archive">Archive</NavLink>
                <NavLink href="/ask">Ask</NavLink>
                <NavLink href="/trash">Trash</NavLink>
                <NavLink href="/officials">Officials</NavLink>
                <NavLink href="/report">Report</NavLink>
                <NavLink href="/participate">Participate</NavLink>
                <NavLink href="/welcome">Welcome</NavLink>
                <NavLink href="/schools">Schools</NavLink>
                <NavLink href="/about">About</NavLink>
                <span className="border-l border-white/20 pl-3 ml-1">
                  <NavAuth />
                </span>
              </nav>
              {/* Medium screens (sm-lg) — show a trimmed inline nav of
                  the four highest-traffic pages plus a hamburger for the rest. */}
              <nav className="hidden sm:flex lg:hidden gap-4 text-white text-sm items-center">
                <NavLink href="/calendar">Calendar</NavLink>
                <NavLink href="/agendas">Agendas</NavLink>
                <NavLink href="/ask">Ask</NavLink>
                <NavLink href="/trash">Trash</NavLink>
              </nav>
              {/* Small screens — just the wordmark + hamburger. */}
              <div className="flex sm:hidden items-center gap-3 text-white">
                <NavAuth />
                <MobileMenu />
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-stone-200 bg-white">
            <div className="max-w-site mx-auto px-4 sm:px-6 py-5 text-xs text-stone-500 flex flex-col sm:flex-row sm:justify-between gap-2">
              <div>
                Built for Pembroke, NH residents · data from{" "}
                <a href="https://www.pembroke-nh.com" className="underline">
                  pembroke-nh.com
                </a>
              </div>
              <div className="flex items-center gap-4">
                <span>Refreshes hourly</span>
                <Link href="/privacy" className="underline">Privacy</Link>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProviderWrapper>
  );
}