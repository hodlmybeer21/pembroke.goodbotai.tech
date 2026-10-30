// app/calendar/page.tsx — what's coming up, and when each body last met.
//
// Built from two committed files:
//   data/calendar.json  - upcoming meetings scraped from the town's own
//                         calendar (the iCal endpoints are dead)
//   data/archive-index.json - the meeting archive, used to show each
//                         body's regular pattern and its last meeting
//
// The town only publishes forward dates for the Select Board and the
// Planning Board, so the other bodies are shown with the pattern the
// minutes reveal, clearly labelled as a pattern rather than a schedule.

import { formatEt } from "@/lib/dates";
import Link from "next/link";
import {
  loadCalendar,
  loadMeetingPatterns,
  type CalendarEvent,
} from "@/lib/town-data";

export const metadata = {
  title: "Meeting calendar — Pembroke, NH",
  description:
    "Upcoming Pembroke Select Board, Planning Board and committee meetings, with times, from the town's published calendar.",
  alternates: { canonical: "/calendar" },
  openGraph: {
    title: "Meeting calendar — Pembroke, NH",
    description:
      "Upcoming Pembroke Select Board, Planning Board and committee meetings, with times, from the town's published calendar.",
    url: "/calendar",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Pembroke, NH" }],
  },
};

export const revalidate = 3600;

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function fmtShort(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CalendarPage() {
  const calendar = loadCalendar();
  const patterns = loadMeetingPatterns();
  const meetings = calendar?.meetings ?? [];

  // Group confirmed meetings by month.
  const byMonth = new Map<string, CalendarEvent[]>();
  for (const e of meetings) {
    const key = new Date(e.date + "T12:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  // Bodies with a clear pattern but no published future date.
  const publishedFirstWords = new Set(
    meetings.map((e) => e.title.toLowerCase().replace(/\s*meetings?\s*$/, "").split(" ")[0])
  );
  const unscheduled = patterns.filter((p) => {
    if (p.meetings < 4) return false;
    const first = p.committee.toLowerCase().split(" ")[0];
    if (publishedFirstWords.has(first)) return false;
    if (first === "select" || first === "planning") return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-10">
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:underline">
          Pembroke
        </Link>{" "}
        / Calendar
      </nav>

      <h1 className="mt-2 font-serif text-3xl font-bold text-stone-900">
        What&rsquo;s coming up
      </h1>
      <p className="mt-2 max-w-2xl text-stone-700">
        Every meeting the town has published for the next few months,
        straight from the{" "}
        <a
          href="https://www.pembroke-nh.com/calendar.aspx"
          className="underline"
        >
          town&rsquo;s calendar
        </a>
        . Where a meeting is coming up, you can jump to what that body
        decided last time.
      </p>

      {meetings.length === 0 ? (
        <div className="mt-8 rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Nothing on the published calendar
          </h2>
          <p className="mt-2 text-sm text-stone-700">
            The town has not posted future meeting dates right now. Meeting
            minutes and agendas are still in the{" "}
            <Link href="/archive" className="underline">
              archive
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[...byMonth.entries()].map(([month, items]) => (
            <section key={month}>
              <h2 className="border-b border-stone-200 pb-2 font-serif text-sm uppercase tracking-wider text-stone-500">
                {month}
              </h2>
              <ul className="mt-3 space-y-3">
                {items.map((e, i) => (
                  <li
                    key={`${e.date}-${i}`}
                    className="rounded-lg border border-stone-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-serif text-base font-semibold text-stone-900">
                        {fmtDate(e.date)}
                      </span>
                      {e.time && (
                        <span className="text-sm text-stone-600">{e.time}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-base font-medium text-stone-900">
                      {e.title}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-stone-700"
                      >
                        Town calendar details →
                      </a>
                      {e.last_minutes_url && e.last_meeting && (
                        <span className="text-stone-600">
                          Last met {fmtShort(e.last_meeting)} —{" "}
                          <Link
                            href={`/archive?committee=${encodeURIComponent(
                              e.title.replace(/\s*meetings?\s*$/i, "")
                            )}`}
                            className="underline"
                          >
                            see what they decided
                          </Link>
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {unscheduled.length > 0 && (
        <section className="mt-10 border-t border-stone-200 pt-6">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            The rest of town&rsquo;s boards
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            The town only publishes future dates for some of its bodies.
            These meet on a regular rhythm that the minutes make clear —
            so here is how often each one meets and when it last met.
          </p>
          <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-200">
            {unscheduled.map((p) => (
              <li
                key={p.committee}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <span className="font-medium text-stone-900">
                  {p.committee}
                </span>
                <span className="text-sm text-stone-600">
                  meets {p.cadence}
                  {p.weekday ? ` on ${p.weekday}s` : ""}
                  {p.last_met ? ` · last met ${fmtShort(p.last_met)}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-stone-500">
            The rhythm is calculated from the town&rsquo;s own posted minutes.
            It is a pattern, not a published schedule — always confirm on
            the{" "}
            <a
              href="https://www.pembroke-nh.com/calendar.aspx"
              className="underline"
            >
              town calendar
            </a>
            .
          </p>
        </section>
      )}

      {calendar?.other && calendar.other.length > 0 && (
        <section className="mt-10 border-t border-stone-200 pt-6">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Closures and holidays
          </h2>
          <ul className="mt-3 space-y-1.5">
            {calendar.other.map((e, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-4 text-sm">
                <span className="text-stone-800">{e.title}</span>
                <span className="text-stone-500">{fmtShort(e.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {calendar?.generated_at && (
        <p className="mt-10 text-xs text-stone-500">
          Calendar checked {formatEt(calendar.generated_at)}
          . This is the town&rsquo;s published calendar; it changes when they
          post new dates.
        </p>
      )}
    </main>
  );
}
