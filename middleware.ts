// middleware.ts — Clerk authentication middleware.
//
// Protects /settings and /api/alerts/* by requiring a signed-in user.
// All other routes are public.
//
// When Clerk isn't configured (no publishable key in env), we skip the
// Clerk middleware entirely so `next build` prerender works AND the deployed
// preview doesn't 500 before Tyler wires up his Clerk app.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtected = createRouteMatcher([
  "/settings(.*)",
  "/api/alerts/(.*)",
]);

function clerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return false;
  if (key.startsWith("pk_test_local")) return false;
  if (key.includes("local_only")) return false;
  return true;
}

const noopMiddleware = (_req: NextRequest) => NextResponse.next();

const realMiddleware = clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

// Edge runtime can't easily conditional-import at top level, so we pick the
// middleware at module init. If Clerk isn't configured, the no-op runs and
// public pages load without any auth check.
export default clerkConfigured() ? realMiddleware : noopMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};