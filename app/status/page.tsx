// app/status/page.tsx — is the data fresh? One row per feed, read from
// each file's own timestamp. Free: no monitoring service, no secrets.

import Link from "next/link";
import { loadFeedStatus, loadHeartbeats } from "@/lib/data-status";
import { formatEt } from "@/lib/dates";

export const revalidate = 3600;

export const metadata = {
  title: "Data status — Pembroke, NH",
  description: "How fresh each data feed behind this site is.",
  alternates: { canonical: "/status" },
};

function age(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return "under an hour";
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}

const BADGE: Record<string, string> = {
  ok: "bg-green-50 text-green-800 border-green-200",
  late: "bg-red-50 text-red-800 border-red-200",
  missing: "bg-red-50 text-red-800 border-red-200",
  manual: "bg-stone-50 text-stone-700 border-stone-200",
};

const LABEL: Record<string, string> = {
  ok: "On time",
  late: "Late",
  missing: "Missing",
  manual: "Updated by hand",
};

export default function StatusPage() {
  const now = new Date();
  const feeds = loadFeedStatus(now);
  const beats = loadHeartbeats();
  const late = feeds.filter((f) => f.state === "late" || f.state === "missing");

  return (
    <div className="container-page">
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:underline">Pembroke</Link> / Data status
      </nav>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-stone-900">Data status</h1>
      <p className="mt-2 max-w-2xl text-stone-700">
        Every page on this site is built from data files refreshed by scheduled
        jobs. This page reads each file&rsquo;s own timestamp, so a job that
        stops running shows up here as <strong>Late</strong>.
      </p>
      <p className={`mt-4 inline-block rounded border px-3 py-1 text-sm font-medium ${late.length ? BADGE.late : BADGE.ok}`}>
        {late.length
          ? `${late.length} feed${late.length === 1 ? " is" : "s are"} late or missing`
          : "All scheduled feeds are on time"}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-3">Feed</th>
              <th className="py-2 pr-3">Data as of</th>
              <th className="py-2 pr-3">Age</th>
              <th className="py-2 pr-3">Expected</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((f) => (
              <tr key={f.file} className="border-b border-stone-100 align-top">
                <td className="py-2 pr-3">
                  <div className="font-medium text-stone-900">{f.label}</div>
                  <div className="text-xs text-stone-500">{f.usedOn}</div>
                </td>
                <td className="py-2 pr-3 text-stone-700">{f.asOf ? formatEt(f.asOf) : "—"}</td>
                <td className="py-2 pr-3 text-stone-700">{age(f.ageHours)}</td>
                <td className="py-2 pr-3 text-stone-700">{f.cadence}</td>
                <td className="py-2 pr-3">
                  <span className={`inline-block rounded border px-2 py-0.5 text-xs ${BADGE[f.state]}`}>
                    {LABEL[f.state]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {beats.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg font-semibold text-stone-900">Job heartbeats</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {beats.map((b) => (
              <li key={b.name} className="surface p-3">
                <div className="font-medium text-stone-900">{b.name}</div>
                <div className="text-xs text-stone-600">
                  Last run {b.last_run ? formatEt(b.last_run) : "—"} · last success{" "}
                  {b.last_success ? formatEt(b.last_success) : "—"}
                </div>
                {b.last_error && (
                  <div className="mt-1 text-xs text-red-700">Last error: {b.last_error}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-stone-500">Checked {formatEt(now)}.</p>
    </div>
  );
}
