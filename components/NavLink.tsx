"use client";

// NavLink — active-state-aware navigation link for the site header.
// Renders as a thin amber underline when the current pathname matches the link's
// href. Otherwise it's white with reduced opacity.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  // Treat "/" as exact; everything else as prefix-match so /calendar also
  // highlights when on /calendar/something-else in the future.
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={
        "relative text-sm transition-opacity " +
        (isActive ? "opacity-100" : "opacity-70 hover:opacity-100")
      }
    >
      {children}
      <span
        aria-hidden
        className={
          "absolute left-0 right-0 -bottom-[14px] h-[2px] rounded-full bg-accent-600 transition-opacity " +
          (isActive ? "opacity-100" : "opacity-0")
        }
      />
    </Link>
  );
}