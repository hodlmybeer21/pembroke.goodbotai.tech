// components/MobileMenu.tsx — client-side hamburger menu for the mobile
// nav. On small screens, the desktop nav is hidden and replaced with
// a hamburger button that opens a panel with all 11 nav items grouped
// by purpose. On desktop, this is a no-op (the existing nav shows).

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavGroup {
  label: string;
  items: { href: string; label: string; description?: string }[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Today",
    items: [
      { href: "/", label: "Daily brief" },
      { href: "/calendar", label: "Meeting calendar" },
      { href: "/agendas", label: "Agendas" },
      { href: "/archive", label: "Past meetings" },
    ],
  },
  {
    label: "I need to…",
    items: [
      { href: "/trash", label: "Find my trash day" },
      { href: "/report", label: "Report an issue" },
      { href: "/ask", label: "Ask the bot a question" },
      { href: "/officials", label: "Email an official" },
      { href: "/participate", label: "Speak at a meeting / run for office" },
    ],
  },
  {
    label: "New here?",
    items: [
      { href: "/welcome", label: "New resident checklist" },
      { href: "/schools", label: "Schools (SAU 53)" },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/about", label: "About this site" },
    ],
  },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  // Close the menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="sm:hidden text-white p-2 -mr-2"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <nav
            className="absolute right-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-white shadow-xl overflow-y-auto"
            aria-label="Site menu"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <span className="font-serif text-base font-semibold text-stone-900">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-2 -mr-2 text-stone-500"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="5" y1="5" x2="17" y2="17" />
                  <line x1="17" y1="5" x2="5" y2="17" />
                </svg>
              </button>
            </div>
            <div className="py-2">
              {GROUPS.map((group) => (
                <div key={group.label} className="mb-3">
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map((item) => {
                      const isActive =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={
                              "block px-4 py-2.5 text-sm transition-colors " +
                              (isActive
                                ? "bg-brand-50 text-brand-700 font-medium border-l-2 border-brand-600"
                                : "text-stone-800 hover:bg-stone-50 border-l-2 border-transparent")
                            }
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}