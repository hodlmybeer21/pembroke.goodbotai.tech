// app/participate/page.tsx — How to participate in Pembroke town government.
//
// This is a static page that answers the most-asked "how do I…" questions
// that residents have but the town website buries. Updated from the actual
// Select Board's public-comment rules (City Hall 5 PM day-of, 3-min limit,
// sign in with the clerk first) and from Pembroke's Charter on town meeting.

export const metadata = {
  title: "Participate — Pembroke, NH",
  description:
    "How to speak at a Select Board or Planning Board meeting, submit public comment, propose a warrant article, and run for office in Pembroke, NH.",
};

export default function ParticipatePage() {
  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          How to participate
        </h1>
        <p className="text-stone-600 mt-2">
          You don't have to be a lawyer, a lobbyist, or a meeting regular. Here's
          how to actually make your voice heard in Pembroke town government.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Speak at a meeting */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            Speak at a meeting
          </h2>
          <p className="text-sm text-stone-700 mb-3">
            Select Board and Planning Board meetings both have a public-comment
            period. You don't need to be on the agenda.
          </p>
          <ol className="text-sm text-stone-700 space-y-2 list-decimal pl-5 mb-3">
            <li>
              <strong>Show up</strong> — Select Board meets most Wednesday
              evenings at 6 PM at the Paulsen Room in Town Hall (8 Exchange
              Street, Pembroke). Planning Board meets most Tuesdays at 6:30 PM.
              See the <a className="underline" href="/calendar">calendar</a> for
              the next one.
            </li>
            <li>
              <strong>Sign in</strong> with the Town Clerk before the meeting
              starts. They'll have a sheet — give your name and the topic
              you're here for. This is just so the chair can call on you
              during the public-comment period.
            </li>
            <li>
              <strong>Wait for your turn</strong> — the chair calls public
              comment near the start of the meeting (after "Call to Order" and
              before "Old Business"). You'll have about 3 minutes.
            </li>
            <li>
              <strong>Be specific</strong> — "I support / oppose X because Y"
              is more useful than "I have concerns." If you're asking for
              something specific (a change to a road, a policy), say so
              plainly.
            </li>
          </ol>
          <p className="text-xs text-stone-500">
            The Select Board's public-comment rules are set by the chair each
            meeting. If you can't make it in person, the meetings are
            livestreamed and minutes are posted to the{" "}
            <a
              className="underline"
              href="https://www.pembroke-nh.com/AgendaCenter"
            >
              agenda center
            </a>{" "}
            after they're approved.
          </p>
        </section>

        {/* Email a board member */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            Email a board member
          </h2>
          <p className="text-sm text-stone-700 mb-3">
            You don't have to wait for a meeting. Each Select Board member has
            a town email. They read them — most reply within a week.
          </p>
          <p className="text-sm text-stone-700 mb-3">
            For policy that affects multiple departments, emailing the whole
            board (selectboard@pembroke-nh.com) gets a coordinated response
            from the Town Administrator.
          </p>
          <p className="text-sm text-stone-700 mb-3">
            For Planning Board or other committee members, see the{" "}
            <a className="underline" href="/officials">
              officials directory
            </a>
            .
          </p>
          <p className="text-xs text-stone-500">
            Tip: a one-page email with a clear ask gets more attention than a
            three-page email with context. Board members are volunteers with
            day jobs.
          </p>
        </section>

        {/* Submit a warrant article */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            Get on the town-meeting ballot
          </h2>
          <p className="text-sm text-stone-700 mb-3">
            March town meeting is where residents vote the budget, adopt
            zoning changes, and approve big spending. To get a question on the
            warrant, you need 25 registered-voter signatures and to file with
            the Town Clerk by the second Tuesday in January.
          </p>
          <p className="text-sm text-stone-700 mb-3">
            The Town Clerk's office (8 Exchange Street, open weekdays 8 AM –
            4:30 PM) has the petition form and can walk you through the
            process. They also have a checklist of what's required to make a
            petition valid (wording, signatures, format).
          </p>
          <p className="text-xs text-stone-500">
            Don't wait until January. Start drafting in November. The Budget
            Committee and Select Board both review proposed warrant articles
            informally before the deadline.
          </p>
        </section>

        {/* Run for office */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            Run for office
          </h2>
          <p className="text-sm text-stone-700 mb-3">
            Town offices are elected in March every year (some seats are
            3-year terms, some are 1-year). Positions up for election rotate:
            Select Board (3 seats), Planning Board (alternating seats),
            Budget Committee, Cemetery Commission, Town Moderator, Library
            Trustees, and Supervisors of the Checklist.
          </p>
          <p className="text-sm text-stone-700 mb-3">
            Filing period opens in mid-January. You file with the Town Clerk
            — it's a one-page form, no fee, no party required (Pembroke uses
            the non-partisan ballot for local offices).
          </p>
          <p className="text-xs text-stone-500">
            Most incumbents don't have serious opposition. The hardest part of
            running is usually deciding to do it.
          </p>
        </section>

        {/* Track what affects you */}
        <section className="lg:col-span-2 surface p-5">
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-2">
            Stay in the loop
          </h2>
          <p className="text-sm text-stone-700 mb-3">
            If you don't have time to attend every meeting (you don't), the
            site will surface what matters to you.
          </p>
          <ul className="text-sm text-stone-700 space-y-1 list-disc pl-5 mb-3">
            <li>
              <a className="underline" href="/">Daily brief</a> on the home
              page — what's on the agenda this week
            </li>
            <li>
              <a className="underline" href="/agendas">Agendas &amp; minutes</a>{" "}
              — recent postings with auto-generated summaries
            </li>
            <li>
              <a className="underline" href="/ask">Ask the bot</a> — questions
              about meetings, services, hours, fees
            </li>
            <li>
              <a className="underline" href="/settings">Email alerts</a> — pick
              the topics you care about (sign-in required)
            </li>
          </ul>
        </section>
      </div>

      <p className="text-xs text-stone-500 mt-12 pt-6 border-t border-stone-200">
        Rules summarized from the town's published Select Board procedures and
        the Pembroke Town Charter. When in doubt, call the Town Clerk at
        603-485-4747 — they're the most helpful person in town government.
      </p>
    </div>
  );
}