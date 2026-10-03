import { fetchAllFeeds, dedupeByDateTitle, filterHorizon } from "@/lib/ical";

export const revalidate = 3600;

export default async function CalendarPage() {
  const events = await fetchAllFeeds().catch(() => []);
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const upcoming = dedupeByDateTitle(filterHorizon(events, now, horizonEnd));

  // Group by month for bucketed display
  const byMonth = new Map<string, typeof upcoming>();
  for (const e of upcoming) {
    const key = e.start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Calendar
        </h1>
        <p className="text-stone-600 mt-2">
          Town board and committee meetings for the next 90 days.
        </p>
      </header>

      {upcoming.length === 0 ? (
        <p className="text-stone-500">No meetings scheduled in the next 90 days.</p>
      ) : (
        <div className="space-y-10">
          {[...byMonth.entries()].map(([month, items]) => (
            <section key={month}>
              <h2 className="font-serif text-sm text-stone-500 uppercase tracking-wider pb-2 mb-4 border-b border-stone-200">
                {month}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((e, idx) => (
                  <li key={idx} className="surface p-4">
                    <div className="text-xs text-stone-500">
                      {e.start.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                      {e.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                      ·{" "}
                      {e.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div className="mt-1 font-medium text-stone-900">
                      {e.committee}
                    </div>
                    <div className="text-sm text-stone-700">{e.summary}</div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}