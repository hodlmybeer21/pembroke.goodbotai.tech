"use client";

// components/MobileBottomNav.tsx — Sticky bottom navigation for mobile.
//
// Renders only on small screens (hidden on sm+). Five primary destinations:
// Home, Ask, Trash, Archive, More. The "More" button opens a full-screen
// drawer with the rest of the navigation. The active route is highlighted.
//
// Why bottom nav: thumb reach on modern phones. Bottom nav puts every
// primary destination within thumb range. Material Design and iOS HIG
// both recommend this for content apps.

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenu } from "./MobileMenu";

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "w-6 h-6"}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const TABS: Tab[] = [
  {
    href: "/",
    label: "Home",
    icon: <Icon d="M3 12l9-9 9 9M5 10v10h14V10" />,
    match: (p) => p === "/",
  },
  {
    href: "/ask",
    label: "Ask",
    icon: <Icon d="M21 12a8 8 0 1 1-3.6-6.7L21 4l-1 4h-3a8 8 0 0 1 4 4z" />,
    match: (p) => p === "/ask",
  },
  {
    href: "/trash",
    label: "Trash",
    icon: <Icon d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />,
    match: (p) => p === "/trash",
  },
  {
    href: "/archive",
    label: "Archive",
    icon: <Icon d="M12 8v4l3 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />,
    match: (p) => p === "/archive",
  },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  // The "More" tab is "active" when on a page that isn't one of the
  // four primary tabs. This highlights it whenever the user is on
  // a secondary page (officials, schools, settings, etc.).
  const isMoreActive = !TABS.some((t) => t.match(pathname));

  // Close the drawer on navigation.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // Lock body scroll when the drawer is open.
  useEffect(() => {
    if (moreOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [moreOpen]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-stone-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 max-w-md mx-auto">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-xs font-medium " +
                    (active
                      ? "text-brand-700"
                      : "text-stone-600 hover:text-stone-900")
                  }
                >
                  <span className={active ? "text-brand-700" : "text-stone-500"}>
                    {t.icon}
                  </span>
                  <span>{t.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-label="More navigation"
              className={
                "w-full flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-xs font-medium " +
                (isMoreActive
                  ? "text-brand-700"
                  : "text-stone-600 hover:text-stone-900")
              }
            >
              <span className={isMoreActive ? "text-brand-700" : "text-stone-500"}>
                <Icon d="M4 6h16M4 12h16M4 18h16" />
              </span>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
      {moreOpen && <MobileMenu onClose={() => setMoreOpen(false)} />}
    </>
  );
}