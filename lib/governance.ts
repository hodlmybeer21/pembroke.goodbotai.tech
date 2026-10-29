import "server-only";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface TopicSummary {
  topic: string;
  total: number;
  passed: number;
  failed: number;
  unknown: number;
  decided: number;
  more: number;
  less: number;
  admin: number;
  pass_rate: number | null;
  by_year: Record<string, number>;
  committees: Record<string, number>;
}

export interface MemberSummary {
  name: string;
  title: string | null;
  moved: number;
  seconded: number;
  yes: number;
  no: number;
  abstain: number;
  present: number;
  excused: number;
  committees: string[];
  topics: string[];
  top_topic: string | null;
}

export interface CommitteeSummary {
  committee: string;
  motions: number;
  passed: number;
  failed: number;
  members: string[];
  url: string | null;
}

export interface MotionRow {
  date: string;
  committee: string;
  subject: string;
  mover: string | null;
  seconder: string | null;
  outcome: string;
  direction: string;
  topic: string;
  url: string | null;
}

export interface VoteRow {
  date: string;
  committee: string;
  votes: Array<{ name: string; vote: string }>;
  url: string | null;
}

export interface StateRep {
  chamber: string;
  district: string;
  name: string;
  party: string;
  towns: string;
  email: string | null;
  phone: string | null;
  url: string | null;
}

export interface GovernanceSummary {
  generated_at: string;
  minutes_count: number;
  source_span: { start: string | null; end: string | null };
  totals: {
    more: number;
    less: number;
    admin: number;
    motions: number;
    all_motions: number;
    passed: number;
    failed: number;
    vote_blocks: number;
    named_votes: number;
    members: number;
  };
  topics: TopicSummary[];
  committees: CommitteeSummary[];
  members: MemberSummary[];
  timeline: Array<{ month: string; motions: number; passed: number; failed: number }>;
  motions: MotionRow[];
  votes: VoteRow[];
  state_reps: StateRep[];
}

let cached: GovernanceSummary | null = null;

/**
 * Load the governance summary for the /decisions page.
 *
 * Everything in here is derived from the town's own published meeting
 * minutes, which are public records under NH RSA 91. No owner or resident
 * personal information is involved.
 */
export function loadGovernanceSummary(): GovernanceSummary | null {
  if (cached) return cached;
  try {
    const path = join(process.cwd(), "data", "governance-summary.json");
    if (!existsSync(path)) return null;
    cached = JSON.parse(readFileSync(path, "utf8")) as GovernanceSummary;
    return cached;
  } catch {
    return null;
  }
}
