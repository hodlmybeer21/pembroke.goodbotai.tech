// app/trash/page.tsx — Street-by-street trash & recycling pickup lookup.
// Server component loads the data; client component handles search.

import { loadTrashRoutes } from "@/lib/trash";
import { TrashLookup } from "@/components/TrashLookup";

export const revalidate = 3600;

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
    </div>
  );
}
