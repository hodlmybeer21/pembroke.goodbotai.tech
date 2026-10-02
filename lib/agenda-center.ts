// lib/agenda-center.ts — Parse the CivicEngage agenda center HTML for
// recent agenda/minutes postings. Server-only (consumed by Server Components).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface AgendaDoc {
  committee: string;
  docType: "Agenda" | "Minutes";
  meetingDate: string; // raw display string e.g., "Oct 7, 2026"
  title: string;
  url: string;
  guid: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_RE = new RegExp(
  `\\b(${MONTHS.join("|")})\\s+\\d{1,2},\\s+\\d{4}\\b`,
);

const COMMITTEE_PAT = new RegExp(
  "\\b(?:Board of Select(?:men|board)|" +
  "Select Board|" +
  "Planning Board(?:\\s+Workshop|\\s+Public\\s+Hearing)?|" +
  "Budget Committee|" +
  "Capital Improvement Program(?:\\s+Committee)?|" +
  "CIP Committee|" +
  "Roads Committee|" +
  "Conservation Commission|" +
  "Energy Committee|" +
  "Recreation Commission|" +
  "Cemetery Commission|" +
  "Water Works|" +
  "Sewer Commission|" +
  "Solid Waste Advisory Committee|" +
  "Zoning Board(?:\\s+of\\s+Adjustment)?|" +
  "Economic Development Committee|" +
  "Joint Loss Management Committee|" +
  "Trustees of Trust Funds|" +
  "Meet Me In Suncook|" +
  "Range Roads Subcommittee|" +
  "Supervisors of the Checklist|" +
  "Facilities and Grounds Committee|" +
  "Blood Drive)\\b",
  "i",
);

export const WANT_COMMITTEES = new Set([
  "Select Board",
  "Board of Selectmen",
  "Planning Board",
  "Planning Board Workshop",
  "Planning Board Public Hearing",
  "Budget Committee",
  "Capital Improvement Program",
  "CIP Committee",
  "Roads Committee",
  "Water Works",
  "Recreation Commission",
  "Conservation Commission",
]);

export function parseAgendaCenter(html: string): AgendaDoc[] {
  const out: AgendaDoc[] = [];
  const rows = html.split(/<\/tr>/i);
  for (const row of rows) {
    if (!row.includes("ViewFile")) continue;
    const dateMatch = MONTH_RE.exec(row);
    if (!dateMatch) continue;
    const meetingDate = dateMatch[0];
    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gis)].map((m) => m[1]);
    if (cells.length === 0) continue;
    const firstCell = cells[0]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const descriptor = MONTH_RE
      .exec(firstCell.replace(MONTH_RE, ""))?.[0]
      ?? firstCell.replace(MONTH_RE, "").trim();
    const cmMatch = COMMITTEE_PAT.exec(descriptor);
    if (!cmMatch) continue;
    const committee = cmMatch[0];
    const title = descriptor
      .slice(cmMatch.index + cmMatch[0].length)
      .trim()
      .replace(/^[\s\-,.]+|[\s\-,.]+$/g, "")
      || `${committee} Meeting`;
    const seenIds = new Set<number>();
    for (const [kind, slug] of [
      ["Agenda", "Agenda"],
      ["Minutes", "Minutes"],
    ] as const) {
      for (const m of row.matchAll(
        new RegExp(
          `href="(/AgendaCenter/ViewFile/${slug}/(_(\\d{8})-(\\d+)))`,
          "g",
        ),
      )) {
        const path = m[1];
        const internalId = m[2];
        const numericId = Number(m[4]);
        if (seenIds.has(numericId)) continue;
        seenIds.add(numericId);
        const url = `https://www.pembroke-nh.com${path.split("?")[0]}`;
        out.push({
          committee,
          docType: kind,
          meetingDate,
          title,
          url,
          guid: `${committee}|${kind}|${meetingDate}|${internalId}`,
        });
      }
    }
  }
  return out;
}

export async function fetchAgendaCenter(timeoutMs = 15000): Promise<AgendaDoc[]> {
  const url = "https://www.pembroke-nh.com/agendacenter";
  const res = await fetch(url, {
    headers: { "User-Agent": "pembroke-goodbotai-tech/0.1 (+pembroke.goodbotai.tech)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return [];
  const html = await res.text();
  return parseAgendaCenter(html).filter((d) => WANT_COMMITTEES.has(d.committee));
}

// OCR summaries are produced by Tyler's Mac cron (`pembroke_town_brief.py`)
// and exported to data/ocr-summaries.json in the repo. The site reads this
// at ISR time and shows summaries inline on /agendas.

export interface OcrSummary {
  ocr_text: string;
  summary: string;
  url: string;
  ts: string;
}

export interface OcrExport {
  generated_at: string;
  source: string;
  seen_guids: string[];
  summaries: Record<string, OcrSummary>;
}

export function loadOcrExport(): OcrExport | null {
  try {
    const p = join(process.cwd(), "data", "ocr-summaries.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as OcrExport;
  } catch {
    return null;
  }
}

export function findSummary(doc: AgendaDoc, ocr: OcrExport | null): string | null {
  if (!ocr) return null;
  return ocr.summaries[doc.guid]?.summary ?? null;
}