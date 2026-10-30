// lib/official-records.ts — the per-official voting record.
//
// Built by ~/.hermes/scripts/pembroke_official_records.py from the
// meeting minutes and the town's own directory of members.
//
// Nothing here is scored, ranked, graded or labelled. Every vote is one
// the minutes recorded by name; every decision that was not recorded by
// name is counted as such rather than filled in.

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface OfficialCommittee {
  committee: string;
  slug: string | null;
  url: string | null;
  role: string | null;
  term_ends: string | null;
}

export interface OfficialVote {
  date: string | null;
  committee: string | null;
  subject: string | null;
  issue: string | null;
  vote: "yes" | "no" | "abstain" | "absent";
  tally: string | null;
  mover: string | null;
  url: string | null;
  title: string | null;
}

export interface OfficialMotion {
  date: string | null;
  committee: string | null;
  subject: string | null;
  outcome: string | null;
  direction: string | null;
  url: string | null;
}

export interface CommitteeRecord {
  committee: string;
  decisions: number;
  decisions_with_named_vote: number;
  decisions_not_recorded_by_name: number;
}

export interface OfficialRecord {
  slug: string;
  name: string;
  committees: OfficialCommittee[];
  minutes_committees: string[];
  in_directory: boolean;
  aliases: string[];
  attendance: {
    present: number;
    excused: number;
    meetings_listed: number;
    rate: number | null;
  };
  motions_moved: number;
  motions_seconded: number;
  motions: OfficialMotion[];
  seconded: OfficialMotion[];
  votes: OfficialVote[];
  votes_recorded: number;
  issues: Record<
    string,
    { yes: number; no: number; abstain: number; absent: number; decisions: number }
  >;
  committee_record: CommitteeRecord[];
  decisions_total: number;
  decisions_not_recorded_by_name: number;
}

export interface GridCell {
  name: string;
  yes: number;
  no: number;
  abstain: number;
  absent: number;
  decisions: number;
  in_directory: boolean;
}

export interface GridRow {
  issue: string;
  members: Record<string, GridCell>;
  decisions: number;
  decisions_with_named_vote: number;
}

export interface VoteBlock {
  date: string | null;
  committee: string | null;
  subject: string | null;
  issue: string | null;
  tally: string | null;
  mover: string | null;
  url: string | null;
  title: string | null;
  voters: { name: string; vote: string }[];
}

export interface OfficialRecordsFile {
  generated_at: string;
  source: string;
  issues: string[];
  officials: OfficialRecord[];
  grid: GridRow[];
  vote_blocks: VoteBlock[];
  counts: {
    officials: number;
    in_directory: number;
    issues: number;
    named_vote_blocks: number;
    named_votes_cast: number;
    minutes_with_text: number | null;
  };
  method: {
    attendance: string;
    votes: string;
    no_scores: string;
    roster: string;
  };
}

let cached: OfficialRecordsFile | null = null;

export function loadOfficialRecords(): OfficialRecordsFile | null {
  if (cached) return cached;
  try {
    const p = join(process.cwd(), "data", "official-records.json");
    if (!existsSync(p)) return null;
    cached = JSON.parse(readFileSync(p, "utf8")) as OfficialRecordsFile;
    return cached;
  } catch {
    return null;
  }
}

export function findOfficial(slug: string): OfficialRecord | null {
  const data = loadOfficialRecords();
  if (!data) return null;
  return data.officials.find((o) => o.slug === slug) ?? null;
}

/**
 * The voting-record slug for a person, matched the same way the minutes
 * match them. The directory writes "Clint Hanson" and the minutes write
 * "Clinton Hanson, Jr.", so a plain string lookup is not enough.
 */
export function slugForName(name: string): string | null {
  const data = loadOfficialRecords();
  if (!data || !name) return null;
  const want = canonicalKey(name);
  if (!want) return null;
  for (const o of data.officials) {
    if (canonicalKey(o.name) === want) return o.slug;
  }
  return null;
}

function canonicalKey(name: string): string | null {
  const n = (name || "").trim().toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ");
  if (!n) return null;
  const parts = n.split(" ");
  if (parts.length === 1) return parts[0];
  const first = { clint: "clinton", chris: "christopher", mike: "michael",
                  jim: "james", tom: "thomas", dick: "richard", bob: "robert",
                  ted: "theodore", bill: "william", will: "william" }[parts[0]] ?? parts[0];
  return `${first} ${parts.slice(1).join(" ")}`;
}

/** The people who have at least one named vote recorded. */
export function officialsWithVotes(): OfficialRecord[] {
  const data = loadOfficialRecords();
  if (!data) return [];
  return data.officials.filter((o) => o.votes_recorded > 0);
}
