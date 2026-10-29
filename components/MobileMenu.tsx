"use client";

// components/MobileMenu.tsx — "More" drawer for the mobile bottom nav.
//
// Controlled component: the bottom nav decides when it's open. The drawer
// shows the secondary destinations (officials, schools, settings, etc.)
// grouped by purpose, plus the user account / persona section at the top
// so it's reachable from anywhere without scrolling.

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  description?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Today",
    items: [
      { href: "/", label: "Daily brief" },
      { href: "/calendar", label: "Meeting calendar" },
      { href: "/agendas", label: "Agendas" },
    ],
  },
  {
    label: "I need to…",
    items: [
      { href: "/report", label: "Report an issue" },
      { href: "/officials", label: "Email an official" },
      { href: "/participate", label: "Speak at a meeting" },
      { href: "/welcome", label: "New resident checklist" },
      { href: "/schools", label: "Schools (SAU 53)" },
      { href: "/property-values", label: "Home sale values" },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/about", label: "About this site" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
  const pathname = usePathname() ?? "";

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="More navigation"
    >
      {/* Backdrop — tap to close */}
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel — slides up from the bottom on mobile (sheet pattern) */}
      <nav
        className="absolute right-0 top-0 bottom-0 w-[300px] max-w-[88vw] bg-white shadow-2xl overflow-y-auto flex flex-col"
        aria-label="Site menu"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 flex-shrink-0">
          <span className="font-serif text-lg font-semibold text-stone-900">
            More
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 -mr-2 text-stone-500 hover:text-stone-700 active:bg-stone-100 rounded-md"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Account / settings shortcut — at the top so the user
              doesn't have to scroll to find it. */}
          <div className="px-5 py-3 border-b border-stone-200">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-stone-50 active:bg-stone-100"
            >
              <span className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                ⚙
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-stone-900">
                  Alert preferences
                </div>
                <div className="text-xs text-stone-500">
                  Persona, categories, street watches
                </div>
              </div>
              <span aria-hidden className="text-stone-400">›</span>
            </Link>
          </div>

          {GROUPS.map((group) => (
            <div key={group.label} className="py-2">
              <div className="px-5 py-1.5 text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
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
                        onClick={onClose}
                        className={
                          "flex items-center px-5 py-3 text-sm transition-colors min-h-[48px] " +
                          (isActive
                            ? "bg-brand-50 text-brand-700 font-semibold border-l-4 border-brand-600"
                            : "text-stone-800 hover:bg-stone-50 active:bg-stone-100 border-l-4 border-transparent")
                        }
                      >
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <span aria-hidden className="text-brand-600 ml-2">
                            ✓
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer — small "made for Pembroke" mark */}
        <div className="px-5 py-3 border-t border-stone-200 text-xs text-stone-500 flex-shrink-0">
          Made for Pembroke, NH
        </div>
      </nav>
    </div>
  );
}