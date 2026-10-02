"use client";

// Client-only nav chrome. Mounts Clerk's auth UI only after hydration, so the
// static prerender doesn't need a real publishable key. Falls back to a plain
// /sign-in link when Clerk isn't configured (build without env).

import dynamic from "next/dynamic";
import Link from "next/link";

const ClerkChrome = dynamic(() => import("./NavAuthClerk").then((m) => m.NavAuthClerk), {
  ssr: false,
  loading: () => (
    <Link href="/sign-in" className="text-sm text-brand-600 underline">
      Sign in
    </Link>
  ),
});

export function NavAuth() {
  return <ClerkChrome />;
}