import "server-only";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// lib/data-status.ts — how fresh each data feed is.
//
// Every feed on this site is a JSON file committed by a job on Tyler's
// Mac (Hermes crons). Nothing here can see the Mac, so freshness is read
// from each file's own generated_at stamp. A file that stops updating is
// the visible symptom of a job that failed.
//
// Optional heartbeat file: data/cron-status.json. If a job writes it, the
// /status page shows last run / last success / last error per job:
//   {
//     "jobs": {
//       "<job-name>": {
//         "last_run": "ISO8601",
//         "last_success": "ISO8601" | null,
//         "last_error": "short message" | null
//       }
//     }
//   }
// It's optional; the page works without it.

export type Cadence = "hourly" | "daily" | "weekly" | "monthly" | "annual" | "manual";

export interface FeedSpec {
  file: string;          // path relative to repo root
  label: string;
  usedOn: string;
  cadence: Cadence;
  /** Hours after which the feed is called late. null = never (manual). */
  lateAfterHours: number | null;
  /** Which timestamp field to read. */
  field?: string;
}

export const FEEDS: FeedSpec[] = [
  { file: "data/calendar.json", label: "Town calendar", usedOn: "/, /calendar, /officials", cadence: "daily", lateAfterHours: 36 },
  { file: "data/archive-index.json", label: "Agenda & minutes archive", usedOn: "/agendas, /archive, /ask", cadence: "daily", lateAfterHours: 36 },
  { file: "data/ocr-summaries.json", label: "OCR summaries", usedOn: "/, /agendas", cadence: "daily", lateAfterHours: 36 },
  { file: "data/town-info.json", label: "Town info pages", usedOn: "/ask", cadence: "daily", lateAfterHours: 36 },
  { file: "data/property-values.json", label: "Property sales vs. assessed", usedOn: "/property-values", cadence: "daily", lateAfterHours: 60 },
  { file: "data/property-listings.json", label: "Listings matched to parcels", usedOn: "/property-values", cadence: "daily", lateAfterHours: 60 },
  { file: "data/pembroke-listings.json", label: "Raw listings scrape", usedOn: "/property-values", cadence: "daily", lateAfterHours: 60 },
  { file: "data/property-trends.json", label: "Property trends & tax bills", usedOn: "/, /property-values", cadence: "manual", lateAfterHours: null },
  { file: "data/governance-summary.json", label: "Decisions analysis", usedOn: "/, /decisions", cadence: "manual", lateAfterHours: null },
  { file: "public/data/nh-tax-rates.json", label: "NH tax-rate map (DRA rates published; checked monthly)", usedOn: "/", cadence: "annual", lateAfterHours: 24 * 400, field: "completed_as_of" },
  { file: "data/officials.json", label: "Officials directory", usedOn: "/officials", cadence: "manual", lateAfterHours: null },
  { file: "data/trash-routes.json", label: "Trash routes", usedOn: "/trash", cadence: "manual", lateAfterHours: null },
];

export interface FeedStatus extends FeedSpec {
  asOf: string | null;
  ageHours: number | null;
  state: "ok" | "late" | "missing" | "manual";
}

export interface JobHeartbeat {
  name: string;
  last_run: string | null;
  last_success: string | null;
  last_error: string | null;
}

function readJson(rel: string): Record<string, unknown> | null {
  try {
    const p = join(process.cwd(), rel);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function loadFeedStatus(now = new Date()): FeedStatus[] {
  return FEEDS.map((f) => {
    const j = readJson(f.file);
    const raw = j ? (j[f.field ?? "generated_at"] as string | undefined) : undefined;
    const asOf = raw && !isNaN(new Date(raw).getTime()) ? raw : null;
    const ageHours = asOf ? (now.getTime() - new Date(asOf).getTime()) / 3600000 : null;
    let state: FeedStatus["state"];
    if (!j || !asOf) state = "missing";
    else if (f.lateAfterHours === null) state = "manual";
    else state = ageHours! > f.lateAfterHours ? "late" : "ok";
    return { ...f, asOf, ageHours, state };
  });
}

export function loadHeartbeats(): JobHeartbeat[] {
  const j = readJson("data/cron-status.json") as { jobs?: Record<string, Partial<JobHeartbeat>> } | null;
  if (!j?.jobs) return [];
  return Object.entries(j.jobs).map(([name, v]) => ({
    name,
    last_run: v.last_run ?? null,
    last_success: v.last_success ?? null,
    last_error: v.last_error ?? null,
  }));
}
