// app/trash/page.tsx — Street-by-street trash & recycling pickup lookup.
// Server component loads the data; client component handles search.

import { loadTrashRoutes } from "@/lib/trash";
import { TrashLookup } from "@/components/TrashLookup";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 3600;
export const metadata = {
  title: "Trash & recycling — Pembroke, NH",
  description:
    "Street-by-street trash and recycling pickup day lookup for Pembroke, NH. Type your street, get your pickup day.",
  openGraph: {
    title: "When is my trash day? — Pembroke, NH",
    description:
      "Type your street. Get your pickup day. Carts out by 6:45 AM. Recycling is mandatory.",
    images: [{ url: "/og-trash.svg", width: 1200, height: 630, alt: "Pembroke trash day lookup" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "When is my trash day? — Pembroke, NH",
    images: ["/og-trash.svg"],
  },
};

export default function TrashPage() {
  const routes = loadTrashRoutes();
  if (!routes) {
    return (
      <div className="container-page">
        <h1 className="font-serif text-2xl font-semibold text-stone-900 mb-3">
          Trash & recycling pickup
        </h1>
        <p className="text-sm text-stone-600">
          Route data hasn't been loaded yet. The town's pickup schedule is
          published as a PDF on{" "}
          <a
            href="https://www.pembroke-nh.com/1298/Solid-Waste-Collection"
            className="underline"
          >
            pembroke-nh.com
          </a>
          .
        </p>
      </div>
    );
  }

  // Render days in the order the town PDF uses. Pembroke has no Tuesday
  // or weekend service, so we preserve whatever order the data file
  // stores (which mirrors the PDF).
  const byDayOrder = Object.keys(routes.byDay);

  return (
    <div className="container-page">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Trash & recycling pickup
        </h1>
        <p className="text-stone-600 mt-2 text-base">
          Find your street to see which day curbside pickup runs. Recycling is
          mandatory in Pembroke — place it in the same cart as trash (zero-sort).
        </p>
      </header>

      <TrashLookup
        byDay={routes.byDay}
        noPickup={routes.noPickup}
        byDayOrder={byDayOrder}
        generatedAt={routes.generatedAt}
        sourceByDay={routes.sourceUrls.byDay}
        sourceByStreet={routes.sourceUrls.byStreet}
      />

      <section className="mt-10 surface p-5">
        <h2 className="font-serif text-base font-semibold text-stone-900 mb-2">
          Found your street?
        </h2>
        <p className="text-sm text-stone-700 leading-relaxed mb-3">
          Send this to a neighbor who keeps asking "is today pickup day?"
        </p>
        <ShareButton
          url="https://pembroke-goodbotai-tech.vercel.app/trash"
          title="Pembroke trash & recycling day lookup"
          body="Hey — pembroke-goodbotai-tech.vercel.app/trash tells you which day your street gets picked up. Type your street, get the day. Carts out by 6:45 AM."
        />
      </section>
    </div>
  );
}
