"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./SignUpClient").then((m) => m.SignUpClient), {
  ssr: false,
  loading: () => <div className="container-page py-12 text-stone-500">Loading sign-up…</div>,
});

export default function SignUpPage() {
  return <Inner />;
}