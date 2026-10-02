// components/ClerkProviderWrapper.tsx — Wraps children in ClerkProvider when
// configured. ClerkProvider is dynamically imported so the Clerk SDK never
// loads during static prerender (it throws on import if the key is missing).

import type { ReactNode } from "react";
import { headers } from "next/headers";

const PLACEHOLDER_PREFIXES = ["pk_test_local", "pk_local_placeholder"];

function isConfigured(): boolean {
  // Don't try to read env during static build (it would still trigger Clerk
  // SDK validation). Check at module top is fine; Clerk doesn't load until
  // we dynamic-import it below.
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return false;
  if (PLACEHOLDER_PREFIXES.some((p) => key.startsWith(p))) return false;
  if (key.includes("local_only")) return false;
  return true;
}

export async function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  if (!isConfigured()) {
    return <>{children}</>;
  }

  // Dynamic import keeps the module out of the build-time dependency graph.
  const { ClerkProvider } = await import("@clerk/nextjs");
  return <ClerkProvider>{children}</ClerkProvider>;
}

// Used only at build time on a server without a real key.
export function isClerkConfigured() {
  return isConfigured();
}

// Re-export `headers` to avoid an unused-import warning if we strip later.
export const __headers_marker = headers;