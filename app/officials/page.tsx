// app/officials/page.tsx — Town officials directory.
//
// Server component loads the scraped officials.json and the iCal feeds
// (for next-meeting dates), then renders the directory grouped by
// committee type, with a "How to participate" footer.

import { committeeLabel, loadCalendar } from "@/lib/town-data";
import { formatEt, parseMeetingDate, townDateTime } from "@/lib/dates";
import { loadOfficials, groupCommittees, type Committee } from "@/lib/officials";
import Link from "next/link";

export const metadata = {
  title: "Town officials & state reps — Pembroke, NH",
  description:
    "Who serves on Pembroke's boards and committees, when they meet next, and who represents Pembroke in Concord.",
  alternates: { canonical: "/officials" },
  openGraph: {
    title: "Town officials & state reps — Pembroke, NH",
    description:
      "Who serves on Pembroke's boards and committees, when they meet next, and who represents Pembroke in Concord.",
    url: "/officials",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Pembroke, NH" }],
  },
};

export const revalidate = 3600;

async function attachNextMeetings(committees: Committee[]): Promise<Committee[]> {
  // For each committee, find the next published meeting on the town
  // calendar whose committee matches. Uses the meeting's real published
  // time (e.g. "2:00 PM") in Eastern time - the previous version built
  // every event at a placeholder noon, so every "Next:" read 12:00 PM.
  const cal = loadCalendar();
  if (!cal) return committees;
  const now = new Date();
  const upcoming = cal.meetings
    .map((e) => {
      const at = townDateTime(e.date, e.time) ?? parseMeetingDate(e.date);
      return { committee: committeeLabel(e.title), at, date: e.date, time: e.time };
    })
    .filter((e): e is { committee: string; at: Date; date: string; time: string } =>
      !!e.at && e.at >= now)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const out: Committee[] = [];
  for (const c of committees) {
    const cName = c.name.toLowerCase();
    const match = upcoming.find((e) => {
      const eName = e.committee.toLowerCase();
      return eName.includes(cName) ||
        cName.includes(eName) ||
        // "Board of Selectmen" vs the calendar's "Select Board"
        cName.replace("board of selectmen", "select board") === eName ||
        cName === eName;
    });
    out.push({
      ...c,
      next_meeting: match ? formatNextMeeting(match.date, match.time) : null,
    });
  }
  return out;
}

/** "Tue, Nov 3, 2:00 PM ET" from the calendar's date + local time. */
function formatNextMeeting(date: string, time: string): string {
  const day = parseMeetingDate(date);
  if (!day) return "";
  const d = day.toLocaleDateString("en-US", {
    timeZone: "UTC", // parseMeetingDate anchors at 12:00 UTC on the calendar day
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return time ? `${d}, ${time} ET` : d;
}

export default async function OfficialsPage() {
  const data = loadOfficials();
  if (!data) {
    return (
      <div className="container-page">
        <h1 className="font-serif text-2xl font-semibold text-stone-900 mb-3">
          Town officials
        </h1>
        <p className="text-sm text-stone-600">
          Officials data hasn't been loaded yet. Check back soon.
        </p>
      </div>
    );
  }

  const enrichedCommittees = await attachNextMeetings(data.committees);
  const grouped = groupCommittees(enrichedCommittees);

  return (
    <div className="container-page">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Town officials directory
        </h1>
        <p className="text-stone-600 mt-2 text-base">
          Who's who in Pembroke town government — elected boards, appointed
          committees, and your state reps. Refreshed when the town's staff
          directory changes.
        </p>
        <p className="text-xs text-stone-500 mt-2">
          Data from{" "}
          <a
            href="https://www.pembroke-nh.com/m/directory"
            className="underline"
          >
            pembroke-nh.com staff directory
          </a>
          . Directory checked {formatEt(data.generated_at)}.
        </p>
      </header>

      {/* State reps at the top — they're the highest-leverage contact for most residents. */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3 pb-1.5 border-b border-stone-200">
          Your state reps
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Pembroke is in <strong>Merrimack County District 12</strong> (House)
          and <strong>Senate District 17</strong>. These legislators vote on
          state laws that affect the town (school funding, transportation,
          housing, etc.).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.state_reps.map((r, i) => (
            <div key={i} className="surface p-4">
              <div className="text-xs text-stone-500 uppercase tracking-wider">
                {r.chamber === "senate" ? "NH Senate" : "NH House"} · {r.district}
              </div>
              <div className="mt-1 font-medium text-stone-900">
                {r.name} <span className="text-stone-500 font-normal">({r.party})</span>
              </div>
              <div className="mt-1 text-xs text-stone-600">{r.towns}</div>
              <div className="mt-2 text-sm space-y-0.5">
                <div>
                  <a
                    href={`mailto:${r.email}`}
                    className="text-brand-700 underline break-all"
                  >
                    {r.email}
                  </a>
                </div>
                {r.phone && <div className="text-stone-600">{r.phone}</div>}
                <div>
                  <a href={r.url} className="text-xs text-stone-500 underline" target="_blank" rel="noreferrer">
                    Profile
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Committees grouped by category. */}
      {grouped.map((cat) => (
        <section key={cat.name} className="mb-10">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-1 pb-1.5 border-b border-stone-200">
            {cat.name}
          </h2>
          {cat.description && (
            <p className="text-xs text-stone-500 mb-4">{cat.description}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {cat.committees.map((c) => (
              <CommitteeCard key={c.slug} committee={c} />
            ))}
          </div>
        </section>
      ))}

      {/* How to participate */}
      <section className="mb-10 pt-6 border-t border-stone-200">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          How to participate
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div className="surface p-4">
            <div className="font-medium text-stone-900 mb-1.5">Attend a meeting</div>
            <p className="text-stone-700">
              Board and committee meetings are open to the public. Most
              meet at <strong>Town Hall (311 Pembroke Street)</strong> and
              are also live-streamed. Check the{" "}
              <Link href="/calendar" className="underline">calendar</Link> for
              times.
            </p>
          </div>
          <div className="surface p-4">
            <div className="font-medium text-stone-900 mb-1.5">Submit public comment</div>
            <p className="text-stone-700">
              Most boards accept public comment at the start of each
              meeting. You can also email a board or the Town Clerk
              in advance to have materials distributed to the board
              before a meeting.
            </p>
          </div>
          <div className="surface p-4">
            <div className="font-medium text-stone-900 mb-1.5">Email a board member</div>
            <p className="text-stone-700">
              The Board of Selectmen can be reached as a group at{" "}
              <a
                href="mailto:selectmen@pembroke-nh.com"
                className="text-brand-700 underline"
              >
                selectmen@pembroke-nh.com
              </a>
              . Individual members are listed above; their email
              addresses are on the{" "}
              <a
                href="https://www.pembroke-nh.com/m/directory"
                className="underline"
              >
                staff directory
              </a>
              .
            </p>
          </div>
          <div className="surface p-4">
            <div className="font-medium text-stone-900 mb-1.5">When do meetings happen?</div>
            <p className="text-stone-700">
              The <strong>Select Board</strong> meets the{" "}
              <strong>first and third Wednesday</strong> of each month at
              6 pm. The <strong>Planning Board</strong> meets the{" "}
              <strong>second and fourth Tuesday</strong> at 6:30 pm. The{" "}
              <strong>Budget Committee</strong> is most active January
              through Town Meeting in March.
            </p>
          </div>
          <div className="surface p-4">
            <div className="font-medium text-stone-900 mb-1.5">Read the agendas</div>
            <p className="text-stone-700">
              Agendas are posted on the{" "}
              <a
                href="https://www.pembroke-nh.com/agendacenter"
                className="underline"
              >
                agenda center
              </a>{" "}
              a few days before each meeting. Minutes are posted after
              they are approved at the following meeting.
            </p>
          </div>
          <div className="surface p-4">
            <div className="font-medium text-stone-900 mb-1.5">Town Meeting</div>
            <p className="text-stone-700">
              The annual <strong>Town Meeting in March</strong> is where
              the budget and most major decisions are made. All
              registered voters can speak and vote. Watch this site for
              the warrant in February.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CommitteeCard({ committee }: { committee: Committee }) {
  return (
    <div className="surface p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="font-serif text-base font-semibold text-stone-900">
          {committee.name}
        </h3>
        <span className="text-xs text-stone-500 shrink-0">
          {committee.members.length} member{committee.members.length === 1 ? "" : "s"}
        </span>
      </div>
      {committee.meeting_when && (
        <div className="text-xs text-stone-600 mb-2">
          {committee.meeting_when}
        </div>
      )}
      {committee.next_meeting && (
        <div className="mb-2 text-xs">
          <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
            Next: {committee.next_meeting}
          </span>
        </div>
      )}
      <ul className="text-sm divide-y divide-stone-100">
        {committee.members.map((m, i) => (
          <li key={i} className="py-1.5 first:pt-0 last:pb-0 flex items-baseline justify-between gap-2">
            <span className="text-stone-800">
              <span className="font-medium">{m.name}</span>
              {m.title && m.title !== "Member" && (
                <span className="text-stone-500 font-normal"> — {m.title}</span>
              )}
            </span>
            {m.term_ends && (
              <span className="text-xs text-stone-500 shrink-0">
                term {m.term_ends}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-2 border-t border-stone-100">
        <a
          href={committee.url}
          className="text-xs text-brand-700 underline"
          target="_blank"
          rel="noreferrer"
        >
          Agendas & minutes →
        </a>
      </div>
    </div>
  );
}
