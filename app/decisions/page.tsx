// app/decisions/page.tsx — how the town has been deciding things.
//
// This page reads the town's own published meeting minutes and shows
// what was decided, who moved it, who seconded it, how it turned out,
// and where the source document is.
//
// It deliberately does NOT score, rank, or label anybody. The minutes
// only name individual votes in a minority of meetings, so a per-member
// score would look authoritative while being mostly fiction — and a
// label attached to a named neighbour in a town this size does lasting
// damage. The record is useful and defensible on its own; a verdict
// built on top of it is neither.
//
// Every figure here comes from the town's own minutes, which are public
// records in New Hampshire (RSA 91). No resident personal information
// is involved.

import Link from "next/link";
import { loadGovernanceSummary } from "@/lib/governance";
import { DecisionsView } from "@/components/DecisionsView";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 86400;

export const metadata = {
  title: "How Pembroke decides things — Pembroke, NH",
  description:
    "What the town has been deciding, how it leaned on each subject, and who moved what — read straight out of Pembroke's own published meeting minutes.",
  openGraph: {
    title: "How Pembroke decides things",
    description:
      "The direction of the town, and who moved what — from the town's own meeting minutes.",
    url: "https://pembroke.goodbotai.tech/decisions",
  },
};

export default function DecisionsPage() {
  const summary = loadGovernanceSummary();

  if (!summary || !summary.motions?.length) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-serif text-2xl font-bold text-stone-900">
          How Pembroke decides things
        </h1>
        <p className="mt-3 text-stone-700">
          We&apos;re still reading the town&apos;s meeting minutes. Check back
          shortly.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-10">
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:underline">
          Pembroke
        </Link>{" "}
        / How the town decides
      </nav>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            How Pembroke decides things
          </h1>
          <p className="mt-2 max-w-2xl text-stone-700">
            Two years of the town&apos;s own meeting minutes, read straight
            through: what the town spent its attention on, which way each
            subject leaned, and who moved what. Every decision links back to
            the source document.
          </p>
        </div>
        <ShareButton
          title="How Pembroke decides things"
          body="What the town has been deciding, which way each subject leaned, and who moved what — from Pembroke's own published meeting minutes."
          url="https://pembroke.goodbotai.tech/decisions"
        />
      </div>

      <div className="mt-8">
        <DecisionsView summary={summary} />
      </div>
    </main>
  );
}
