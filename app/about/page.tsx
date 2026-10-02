export default function AboutPage() {
  return (
    <div className="container-page">
      <h1 className="text-2xl font-semibold mb-4">About this site</h1>

      <section className="space-y-4 text-sm">
        <p>
          <strong>pembroke.goodbotai.tech</strong> is a public, free site for
          residents of Pembroke, New Hampshire. It surfaces what's happening in
          town government — upcoming meetings, agendas, minutes, and recent
          decisions — in plain English.
        </p>

        <p>
          Data comes directly from the{" "}
          <a href="https://www.pembroke-nh.com" className="underline">
            Town of Pembroke's official website
          </a>
          . Refreshes hourly. No login required.
        </p>

        <h2 className="text-base font-semibold pt-2">Who built it</h2>
        <p>
          Built by Tyler Dubuque, a Pembroke resident, with help from Hermes
          Agent. This is a personal project, not affiliated with the Town of
          Pembroke government.
        </p>

        <h2 className="text-base font-semibold pt-2">Roadmap</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><s>v1: Browse-only site (this release)</s> — DONE</li>
          <li>v2: OCR auto-summaries of agendas/minutes; ask-the-bot LLM endpoint</li>
          <li>v3: Personalized alerts by life-situation (parent, homeowner, etc.)</li>
          <li>v4: Multi-town coverage (Manchester, Concord, others)</li>
        </ul>

        <h2 className="text-base font-semibold pt-2">For town government questions</h2>
        <p>
          This site is a third-party aggregator. For official town records,
          contact the{" "}
          <a href="https://www.pembroke-nh.com/1315/Town-Administration" className="underline">
            Pembroke Town Administrator
          </a>{" "}
          or the{" "}
          <a href="https://www.pembroke-nh.com/1323/Town-Clerk" className="underline">
            Town Clerk
          </a>{" "}
          directly.
        </p>
      </section>
    </div>
  );
}