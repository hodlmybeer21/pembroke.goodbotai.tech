"use client";

// components/MoreMenu.tsx — the "More" dropdown for the desktop nav.
//
// The site had thirteen flat links in the header, which is a wall rather
// than a way in. The primary pages stay visible; everything else lives
// behind one menu, grouped by what a resident is trying to do.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: Array<{ title: string; items: Array<{ href: string; label: string }> }> = [
  {
    title: "Your house",
    items: [
      { href: "/property-values", label: "Home sale values" },
      { href: "/taxes/history", label: "Tax rate history" },
      { href: "/trash", label: "Trash day lookup" },
      { href: "/schools", label: "Schools (SAU 53)" },
      { href: "/welcome", label: "New resident checklist" },
    ],
  },
  {
    title: "Town business",
    items: [
      { href: "/calendar", label: "Meeting calendar" },
      { href: "/agendas", label: "Agendas & minutes" },
      { href: "/archive", label: "Meeting archive" },
      { href: "/officials", label: "Officials directory" },
      { href: "/participate", label: "Take part" },
      { href: "/report", label: "Report an issue" },
    ],
  },
  {
    title: "About",
    items: [
      { href: "/about", label: "About this site" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-white text-sm hover:opacity-80 transition-opacity"
      >
        More ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-64 rounded-lg border border-stone-200 bg-white p-3 shadow-xl z-50">
          {GROUPS.map((g) => (
            <div key={g.title} className="mb-3 last:mb-0">
              <div className="px-2 pb-1 text-[10px] uppercase tracking-widest text-stone-500">
                {g.title}
              </div>
              <ul>
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="block rounded px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
