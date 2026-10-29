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
  /** The town's own action word, straight from the motion text. */
  verb: string;
  topic: string;
  issue: string;
  amount: number | null;
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

export interface IssueDecision {
  date: string;
  month: string;
  subject: string;
  verb: string;
  direction: string;
  outcome: string;
  mover: string | null;
  seconder: string | null;
  committee: string | null;
  amount: number | null;
  url: string | null;
}

export interface IssueSummary {
  issue: string;
  count: number;
  more: number;
  less: number;
  admin: number;
  first: string | null;
  last: string | null;
  committees: Record<string, number>;
  money_named: number;
  largest_amount: number | null;
  movers: Record<string, number>;
  /** The town's own action words: "approve" 9, "deny" 3, ... */
  verbs: Record<string, number>;
  /** Decision counts per month, split by direction. */
  months: Record<string, { more: number; less: number; admin: number; total: number }>;
  decisions: IssueDecision[];
}

export interface AttendanceRow {
  committee: string;
  meetings: number;
  people: Array<{
    name: string;
    present: number;
    excused: number;
    rate: number;
  }>;
}

export interface Relationship {
  mover: string;
  seconder: string;
  count: number;
}

export interface VotePair {
  a: string;
  b: string;
  together: number;
  share: number | null;
}

export interface ContestedVote {
  date: string;
  committee: string;
  votes: Array<{ name: string; vote: string }>;
  url: string | null;
  dissenters: string[];
  abstentions: string[];
}

export interface MoneyRow {
  date: string;
  committee: string;
  subject: string;
  amount: number;
  mover: string | null;
  issue: string;
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
    contested: number;
    members: number;
    committees: number;
    issues: number;
    money_motions: number;
  };
  topics: TopicSummary[];
  issues: IssueSummary[];
  /** Every month in the window, for stable axes. */
  months: string[];
  committees: CommitteeSummary[];
  attendance: AttendanceRow[];
  members: MemberSummary[];
  relationships: Relationship[];
  vote_pairs: VotePair[];
  contested: ContestedVote[];
  money: MoneyRow[];
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
