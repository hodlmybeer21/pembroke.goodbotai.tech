"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function NavAuthClerk() {
  const [configured, setConfigured] = useState(false);
  useEffect(() => {
    setConfigured(
      typeof process !== "undefined" &&
        Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    );
  }, []);

  if (!configured) {
    return (
      <Link href="/sign-in" className="text-sm text-brand-600 underline">
        Sign in
      </Link>
    );
  }

  return (
    <>
      <SignedIn>
        <Link href="/settings">Settings</Link>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-sm text-brand-600 underline">Sign in</button>
        </SignInButton>
      </SignedOut>
    </>
  );
}