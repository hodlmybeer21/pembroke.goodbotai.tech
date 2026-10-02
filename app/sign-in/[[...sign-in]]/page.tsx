"use client";

// Sign-in catchall — loads Clerk's SignIn widget client-side only so the
// static prerender doesn't need a Clerk key.

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./SignInClient").then((m) => m.SignInClient), {
  ssr: false,
  loading: () => <div className="container-page py-12 text-stone-500">Loading sign-in…</div>,
});

export default function SignInPage() {
  return <Inner />;
}