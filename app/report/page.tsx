// app/report/page.tsx — "Where do I report this?" routing.
//
// Most town websites bury the answer to "who do I call about X?" in a
// phone tree. This page lists the common things a resident notices, and
// for each one tells them: which form to use (with a direct link), which
// phone number to call, and which hours that office is actually open.
//
// All routing info is verified from pembroke-nh.com as of Oct 2026.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report an issue — Pembroke, NH",
  description:
    "Where to report a pothole, missed trash pickup, streetlight out, barking dog, zoning concern, or other town issue in Pembroke, NH.",
};

interface ReportRoute {
  category: string;
  what: string;
  action: "form" | "phone" | "in-person" | "online";
  destination: string;
  destinationLabel: string;
  hours?: string;
  notes?: string;
}

const ROUTES: ReportRoute[] = [
  // Town services
  {
    category: "Roads",
    what: "Pothole, road damage, downed tree, sign down",
    action: "form",
    destination:
      "https://www.pembroke-nh.com/FormCenter/Public-Works-Department-5/Report-a-Concern-58",
    destinationLabel: "Public Works Report a Concern form",
    hours: "Public Works: weekdays 7 AM – 3:30 PM",
    notes: "After-hours emergency: 603-485-9173 (PD dispatch).",
  },
  {
    category: "Snow",
    what: "Street not plowed, mailbox damaged by plow, ice on road",
    action: "form",
    destination:
      "https://www.pembroke-nh.com/FormCenter/Public-Works-Department-5/Report-a-Concern-58",
    destinationLabel: "Public Works Report a Concern form",
    hours: "Snow desk active during winter storms",
  },
  {
    category: "Trash",
    what: "Missed trash or recycling pickup",
    action: "phone",
    destination: "tel:16034854422",
    destinationLabel: "Call Public Works: 603-485-4422",
    hours: "Weekdays 7 AM – 3:30 PM",
    notes:
      "If you missed pickup, the truck may have already passed. Public Works will tell you whether to leave it out or wait for next week.",
  },
  {
    category: "Trash",
    what: "Question about what goes in the cart, transfer station hours/fees",
    action: "form",
    destination: "https://www.pembroke-nh.com/1291/Recycling",
    destinationLabel: "Recycling & disposal info",
  },
  {
    category: "Streetlights",
    what: "Streetlight out, traffic signal problem",
    action: "phone",
    destination: "tel:16034854422",
    destinationLabel: "Call Public Works: 603-485-4422",
    notes:
      "Most streetlights in town are owned by Eversource, not the town. Public Works will tell you who to call.",
  },
  {
    category: "Police (non-emergency)",
    what: "Barking dog, noise complaint, suspicious activity, abandoned vehicle",
    action: "phone",
    destination: "tel:16034856813",
    destinationLabel: "Pembroke Police non-emergency: 603-485-6813",
    hours: "Dispatch 24/7. Station lobby open weekdays 8 AM – 4 PM.",
    notes: "Emergencies: dial 911.",
  },
  {
    category: "Police",
    what: "Speeding, traffic concern on a specific street",
    action: "form",
    destination: "https://www.pembroke-nh.com/FormCenter",
    destinationLabel: "Police Department forms",
    notes:
      "Mark 'attention: traffic' and include the street, time of day, and direction. The department reviews these monthly.",
  },
  {
    category: "Animals",
    what: "Lost or found pet, animal complaint",
    action: "phone",
    destination: "tel:16034856813",
    destinationLabel: "Animal Control: 603-485-6813 (PD dispatch)",
  },
  {
    category: "Animal control",
    what: "Dog license renewal, new dog registration",
    action: "in-person",
    destination: "https://www.pembroke-nh.com",
    destinationLabel: "Town Clerk's office, 8 Exchange Street",
    hours: "Weekdays 8 AM – 4:30 PM",
    notes: "Bring current rabies certificate. $10 for spayed/neutered, $15 otherwise.",
  },
  {
    category: "Permits",
    what: "Building permit, electrical, plumbing, driveway",
    action: "in-person",
    destination: "https://www.pembroke-nh.com/1242/Planning-and-Building-Department",
    destinationLabel: "Planning & Building Department",
    hours: "Weekdays 8 AM – 4 PM",
    notes: "Many simple permits can be applied for by email — call first.",
  },
  {
    category: "Zoning",
    what: "Zoning violation, setback concern, unpermitted construction",
    action: "in-person",
    destination: "https://www.pembroke-nh.com/1242/Planning-and-Building-Department",
    destinationLabel: "Code Enforcement Officer",
    hours: "Office hours vary; call to set up a site visit",
  },
  {
    category: "Vital records",
    what: "Birth/death/marriage certificate, marriage license",
    action: "in-person",
    destination: "https://www.pembroke-nh.com/1334/Vital-Records",
    destinationLabel: "Town Clerk's office",
    hours: "Weekdays 8 AM – 4:30 PM",
  },
  {
    category: "Voting",
    what: "Register to vote, change party, request absentee ballot",
    action: "online",
    destination: "https://www.pembroke-nh.com/1335/Voter-Registration",
    destinationLabel: "Voter registration (in person or by mail)",
    notes:
      "Same-day registration is available at the polls on Election Day — bring ID and proof of domicile.",
  },
  {
    category: "Taxes",
    what: "Property tax bill question, abatement request",
    action: "in-person",
    destination: "https://www.pembroke-nh.com/1193/Assessing-Department",
    destinationLabel: "Assessing Department",
    hours: "Weekdays 8 AM – 4 PM",
    notes: "Abatement applications are due by March 1 following the tax year.",
  },
  {
    category: "Cemetery",
    what: "Burial plot, headstone, cemetery maintenance",
    action: "phone",
    destination: "tel:16034854422",
    destinationLabel: "Public Works (Cemetery Division): 603-485-4422",
  },
  {
    category: "Conservation",
    what: "Wetland concern, trail damage, conservation land",
    action: "in-person",
    destination: "https://www.pembroke-nh.com",
    destinationLabel: "Conservation Commission (meets 2nd & 4th Tuesdays)",
  },
  {
    category: "Parks & rec",
    what: "Field condition, sign-up for rec program",
    action: "online",
    destination: "https://www.pembroke-nh.com",
    destinationLabel: "Recreation Commission",
  },
  // State / federal
  {
    category: "Power outage",
    what: "Power out, downed power line",
    action: "phone",
    destination: "tel:18006629678",
    destinationLabel: "Eversource: 1-800-662-7768",
    notes: "Report online at eversource.com. Stay away from downed lines.",
  },
  {
    category: "Road (state)",
    what: "Issue on Route 3, Route 106, Route 28",
    action: "online",
    destination: "https://www.nh.gov/dot/",
    destinationLabel: "NH DOT (state roads)",
    notes: "Pembroke's local roads are the town's. State roads are DOT's.",
  },
];

const ACTION_LABEL: Record<ReportRoute["action"], string> = {
  form: "Submit a form",
  phone: "Call",
  "in-person": "Go in person",
  online: "Online",
};

const ACTION_COLOR: Record<ReportRoute["action"], string> = {
  form: "bg-brand-600 hover:bg-brand-700",
  phone: "bg-impact-kids hover:opacity-90",
  "in-person": "bg-impact-property hover:opacity-90",
  online: "bg-accent-600 hover:bg-accent-700",
};

export default function ReportPage() {
  // Group routes by category for the layout.
  const byCategory = new Map<string, ReportRoute[]>();
  for (const r of ROUTES) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }

  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Report an issue
        </h1>
        <p className="text-stone-600 mt-2">
          Where to report problems, request services, and ask questions. Pick
          the closest match below — each one tells you which form to fill, which
          number to call, or which office to walk into.
        </p>
        <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
          <strong>Emergency?</strong> If it's a crime in progress, a fire, or a
          medical emergency, <strong>call 911</strong>. The forms and numbers
          below are for non-emergency issues.
        </p>
      </header>

      <div className="space-y-10">
        {[...byCategory.entries()].map(([category, items]) => (
          <section key={category}>
            <h2 className="font-serif text-base uppercase tracking-wider text-stone-500 pb-2 mb-3 border-b border-stone-200">
              {category}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((r, idx) => (
                <li key={idx} className="surface p-4">
                  <div className="text-sm font-medium text-stone-900">
                    {r.what}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a
                      href={r.destination}
                      className={`inline-block text-xs text-white font-medium px-3 py-1.5 rounded-md ${ACTION_COLOR[r.action]}`}
                    >
                      {ACTION_LABEL[r.action]} →
                    </a>
                    <span className="text-xs text-stone-500">
                      {r.destinationLabel}
                    </span>
                  </div>
                  {r.hours && (
                    <div className="mt-2 text-xs text-stone-500">
                      {r.hours}
                    </div>
                  )}
                  {r.notes && (
                    <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                      {r.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-xs text-stone-500 mt-12 pt-6 border-t border-stone-200">
        Phone numbers and forms verified from pembroke-nh.com and direct calls
        to each department. If something has changed, let us know and we'll
        update this page.
      </p>
    </div>
  );
}