import { fetchAllFeeds, dedupeByDateTitle, filterHorizon } from "@/lib/ical";

export const revalidate = 3600;

export default async function CalendarPage() {
  const events = await fetchAllFeeds().catch(() => []);
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const upcoming = dedupeByDateTitle(filterHorizon(events, now, horizonEnd));

  // Group by month
  const byMonth = new Map<string, typeof upcoming>();
  for (const e of upcoming) {
    const key = e.start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  return (
    <div className="container-page">
      <h1 className="text-2xl font-semibold mb-1">Calendar — next 90 days</h1>
      <p className="text-sm text-stone-500 mb-6">
        Town board and committee meetings. Updated hourly from{" "}
        <a href="https://www.pembroke-nh.com" className="underline">pembroke-nh.com</a>.
      </p>

      {upcoming.length === 0 ? (
        <p className="text-stone-500">No meetings scheduled in the next 90 days.</p>
      ) : (
        <div className="space-y-6">
          {[...byMonth.entries()].map(([month, items]) => (
            <section key={month}>
              <h2 className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-2">
                {month}
              </h2>
              <ul className="divide-y divide-stone-200 border border-stone-200 rounded-md bg-white">
                {items.map((e, idx) => (
                  <li key={idx} className="px-3 py-2 text-sm flex items-baseline gap-3">
                    <span className="text-stone-500 w-32 shrink-0">
                      {e.start.toLocaleDateString("en-US", { weekday: "short" })}
                      {" "}
                      {e.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {", "}
                      {e.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="font-medium">{e.committee}</span>
                    <span className="text-stone-700">— {e.summary}</span>
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