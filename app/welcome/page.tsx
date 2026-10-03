// app/welcome/page.tsx — First-month-in-Pembroke checklist for new residents.
//
// The town website buries the "I just moved here, what do I do" answers
// across a dozen pages. This is the single checklist that walks a new
// resident through the first 30 days.

import type { Metadata } from "next";
import { ShareButton } from "@/components/ShareButton";

export const metadata: Metadata = {
  title: "New resident guide — Pembroke, NH",
  description:
    "First-month checklist for new Pembroke, NH residents: voter registration, trash setup, library card, dog license, and more.",
};

interface Task {
  title: string;
  when: string;
  steps: { text: string; href?: string; hrefLabel?: string }[];
  important?: boolean;
}

const TASKS: Task[] = [
  {
    title: "Register to vote",
    when: "Do this first — you can do it on move-in day",
    important: true,
    steps: [
      {
        text:
          "Same-day registration is available at the Town Clerk's office (8 Exchange Street, weekdays 8 AM – 4:30 PM). Bring a photo ID and a piece of mail with your new Pembroke address.",
        href: "https://www.pembroke-nh.com/1335/Voter-Registration",
        hrefLabel: "Voter registration page",
      },
      {
        text:
          "If you miss the in-person deadline, you can still register at the polls on Election Day.",
      },
    ],
  },
  {
    title: "Set up trash and recycling pickup",
    when: "Within your first week",
    important: true,
    steps: [
      {
        text:
          "Pembroke uses single-stream recycling (one cart for trash, one for recyclables). Carts are provided by the town — call Public Works to request yours.",
        href: "tel:16034854422",
        hrefLabel: "Public Works: 603-485-4422",
      },
      {
        text:
          "Find out which day your street gets picked up.",
        href: "/trash",
        hrefLabel: "Trash day lookup",
      },
      {
        text:
          "Place carts curbside by 6:45 AM on your pickup day. Recycling is mandatory.",
      },
    ],
  },
  {
    title: "Get a library card",
    when: "Within your first week",
    steps: [
      {
        text:
          "The Pembroke Town Library is at 313 Pembroke Street (next to Town Hall). Bring a photo ID and a piece of mail with your Pembroke address.",
        href: "https://www.pembroke-nh.com/1236/Library",
        hrefLabel: "Library hours and info",
      },
      {
        text:
          "Card is free for Pembroke residents. Kids get their own card.",
      },
    ],
  },
  {
    title: "Register your dog (if you have one)",
    when: "Within 30 days of move-in",
    steps: [
      {
        text:
          "All dogs 4 months and older need a Pembroke license. Bring current rabies certificate. $10 for spayed/neutered, $15 otherwise.",
      },
      {
        text:
          "Renewable each year by April 30. Late fee applies after that.",
        href: "https://www.pembroke-nh.com",
        hrefLabel: "Town Clerk's office",
      },
    ],
  },
  {
    title: "Register your car",
    when: "Within 60 days (NH DMV requirement)",
    steps: [
      {
        text:
          "New Hampshire requires vehicle registration within 60 days of establishing residency. You can do this at any NH DMV office or online.",
        href: "https://www.nh.gov/dmv/",
        hrefLabel: "NH DMV",
      },
      {
        text:
          "You'll also need to update your driver's license at a DMV office within 60 days.",
      },
    ],
  },
  {
    title: "Find your trash day and transfer station info",
    when: "First week",
    steps: [
      {
        text:
          "Type your street to find your pickup day.",
        href: "/trash",
        hrefLabel: "Trash day lookup",
      },
      {
        text:
          "The transfer station is for items that don't fit the cart — appliances, bulky waste, construction debris. Fees apply for some items.",
        href: "https://www.pembroke-nh.com/1299/Solid-Waste-Transfer-Facility",
        hrefLabel: "Transfer station info",
      },
    ],
  },
  {
    title: "Connect to the schools (if applicable)",
    when: "Before the school year",
    steps: [
      {
        text:
          "Pembroke students attend schools in SAU 53. Three Rivers School is K-4, Pembroke Academy is 5-12.",
        href: "/schools",
        hrefLabel: "Schools page",
      },
      {
        text:
          "Registration is at the school, not the district office. Bring proof of residency, immunization records, and birth certificate.",
      },
    ],
  },
  {
    title: "Subscribe to alerts (optional)",
    when: "Whenever you want",
    steps: [
      {
        text:
          "Sign up for email alerts when new agendas or minutes are posted. Pick the topics you care about (school, roads, budget).",
        href: "/settings",
        hrefLabel: "Alert settings",
      },
      {
        text:
          "Or use the daily brief on the home page — it surfaces what's happening in town this week.",
        href: "/",
        hrefLabel: "Daily brief",
      },
    ],
  },
];

export default function WelcomePage() {
  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Welcome to Pembroke
        </h1>
        <p className="text-stone-600 mt-2">
          Your first-month checklist. None of this is legally required in
          any particular order except the items marked <strong>important</strong> —
          but this is the order most people find useful.
        </p>
        <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
          <strong>One thing to do first:</strong> register to vote. New
          Hampshire allows same-day registration, so even if you moved
          yesterday you can vote in the next election.
        </p>
      </header>

      <ol className="space-y-8">
        {TASKS.map((task, idx) => (
          <li key={task.title}>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-serif text-2xl font-semibold text-stone-400">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h2 className="font-serif text-xl font-semibold text-stone-900">
                {task.title}
              </h2>
              {task.important && (
                <span className="tag-pill bg-amber-100 text-amber-900 text-xs">
                  Important
                </span>
              )}
            </div>
            <div className="text-xs text-stone-500 mb-2">{task.when}</div>
            <ol className="space-y-2 text-sm text-stone-700 ml-12">
              {task.steps.map((step, i) => (
                <li key={i} className="leading-relaxed">
                  <span className="text-stone-400 mr-1">{i + 1}.</span>
                  {step.text}
                  {step.href && (
                    <>
                      {" "}
                      <a className="underline" href={step.href}>
                        {step.hrefLabel ?? step.href}
                      </a>
                      .
                    </>
                  )}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>

      <p className="text-xs text-stone-500 mt-12 pt-6 border-t border-stone-200">
        Phone numbers, fees, and deadlines verified from pembroke-nh.com
        and direct calls to town offices. If something has changed, let us
        know and we'll update this page.
      </p>

      <section className="mt-8 surface p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-2">
          Know someone moving to Pembroke?
        </h2>
        <p className="text-sm text-stone-700 leading-relaxed mb-3">
          Send them this page. It's the one thing every new resident needs
          in their first month — vote, trash, library, dog license, school.
        </p>
        <ShareButton
          url="https://pembroke-goodbotai-tech.vercel.app/welcome"
          title="New to Pembroke? Start here."
          body="Hey — I use pembroke.goodbotai.tech/welcome for the new-resident checklist. If you're moving to Pembroke, this is the one page you need in your first month (voter registration, trash, library, schools)."
        />
      </section>
    </div>
  );
}