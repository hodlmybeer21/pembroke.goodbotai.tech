// components/RelatedPages.tsx — small "Related pages" footer for the
// static content pages (/welcome, /report, /participate, /schools).
// Removes dead ends — every static page points to its neighbors.

import Link from "next/link";

interface RelatedLink {
  href: string;
  title: string;
  body: string;
}

const LINK_SETS: Record<string, RelatedLink[]> = {
  welcome: [
    { href: "/report", title: "Report an issue", body: "Pothole, missed trash, streetlight, barking dog." },
    { href: "/trash", title: "Find your trash day", body: "Type your street, get your pickup day." },
    { href: "/ask", title: "Ask the bot", body: "Plain-language questions about town services." },
  ],
  report: [
    { href: "/officials", title: "Email an official", body: "Direct contacts for Select Board, Planning Board, state reps." },
    { href: "/participate", title: "How to participate", body: "Speak at a meeting, get on the warrant, run for office." },
    { href: "/ask", title: "Ask the bot", body: "For general questions about hours, fees, and rules." },
  ],
  participate: [
    { href: "/officials", title: "Officials directory", body: "Names, emails, terms for every board and state rep." },
    { href: "/calendar", title: "Meeting calendar", body: "When's the next Select Board or Planning Board meeting?" },
    { href: "/archive", title: "Past meetings", body: "See what was actually decided at recent meetings." },
  ],
  schools: [
    { href: "/welcome", title: "New resident guide", body: "First-month checklist for anyone moving to Pembroke." },
    { href: "/calendar", title: "Meeting calendar", body: "Includes school board meeting dates." },
    { href: "/ask", title: "Ask the bot", body: "Questions about the school district." },
  ],
};

export function RelatedPages({ page }: { page: keyof typeof LINK_SETS }) {
  const links = LINK_SETS[page];
  if (!links || links.length === 0) return null;
  return (
    <section className="mt-12 pt-6 border-t border-stone-200">
      <h2 className="font-serif text-base uppercase tracking-wider text-stone-500 mb-3">
        Related
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block surface p-3 hover:border-brand-500 transition-colors h-full"
            >
              <div className="text-sm font-medium text-stone-900">{l.title} →</div>
              <div className="text-xs text-stone-600 mt-1">{l.body}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}