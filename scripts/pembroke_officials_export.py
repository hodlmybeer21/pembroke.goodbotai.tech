#!/usr/bin/env python3
"""
pembroke_officials_export.py — Scrape Pembroke, NH town board / committee
memberships and the current NH House + Senate reps for the Pembroke
districts. Emit data/officials.json for the public site's /officials page.

Sources:
  - /m/directory              (the staff directory; full membership w/ titles)
  - /1342/Board-of-Selectmen  (Select Board — term end years)
  - /1349/Budget-Committee    (Budget Committee — term end years)
  - /1397/Planning-Board      (Planning Board — term end years)
  - gc.nh.gov Senate District 17 page (Howard Pearl — Pembroke's senator)
  - nhha.org 2025-2026 Legislator List (Brian Seaworth + Dianne Schuett)

The directory page is the primary source for the committee list. The
committee-member pages (Select Board / Planning / Budget) only exist
for a handful — most committees don't have their own /NNNN/ page with
a roster. We use the directory to discover committees and the
committee-member pages to add term-end years where available.

Output: data/officials.json
  {
    "generated_at": "ISO8601",
    "committees": [
      {
        "name": "Select Board",
        "slug": "select-board",
        "url": "https://www.pembroke-nh.com/1342/Board-of-Selectmen",
        "members": [
          {"name": "Karen Yeaton", "title": "Chair", "term_ends": "2029", "email": null, "photo_url": null},
          ...
        ],
        "next_meeting": "ISO8601" or null,
        "meeting_when": "First and third Wednesday of the month, 6 pm"
      }
    ],
    "state_reps": [
      {"chamber": "senate", "district": "17", "name": "Howard Pearl", "party": "R", "email": "...", "phone": "...", "url": "https://gc.nh.gov/..."},
      {"chamber": "house",  "district": "Merrimack 12", "name": "Dianne Schuett", "party": "D", ...},
      {"chamber": "house",  "district": "Merrimack 12", "name": "Brian Seaworth", "party": "R", ...}
    ]
  }

Run from the repo root:
  python3 scripts/pembroke_officials_export.py
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

USER_AGENT = "pembroke.goodbotai.tech/0.4 (+pembroke.goodbotai.tech, officials exporter)"

DIRECTORY_URL = "https://www.pembroke-nh.com/m/directory"
SELECT_BOARD_URL = "https://www.pembroke-nh.com/1342/Board-of-Selectmen"
PLANNING_BOARD_URL = "https://www.pembroke-nh.com/1397/Planning-Board"
BUDGET_COMMITTEE_URL = "https://www.pembroke-nh.com/1349/Budget-Committee"
SENATE_D17_URL = "https://gc.nh.gov/Senate/members/webpages/district17.aspx"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        # GC pages can be cp1252 — use the charset the server says.
        raw = resp.read()
        ct = resp.headers.get_content_charset() or "utf-8"
        try:
            return raw.decode(ct, errors="replace")
        except (LookupError, UnicodeDecodeError):
            return raw.decode("utf-8", errors="replace")


# ── HTML helpers (no lxml dep — only stdlib) ───────────────────────────────


def strip_tags(html: str) -> str:
    """Drop tags and collapse whitespace, for plain-text extraction."""
    s = re.sub(r"<script\b.*?</script>", " ", html, flags=re.S | re.I)
    s = re.sub(r"<style\b.*?</style>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">")
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ── Directory page: people grouped by committee ──────────────────────────


# Committees we WANT to surface on /officials — the elected boards and the
# appointed committees that meet publicly. Drop ad-hoc subcommittees
# (Range Roads), volunteer clubs (Pembroke Women's Club, Meet Me In
# Suncook), and internal-only departments (Tax Collector, Town Clerk).
SHOW_THESE_COMMITTEES = {
    "Board of Selectmen":          "select-board",
    "Planning Board":              "planning-board",
    "Budget Committe":             "budget-committee",  # town misspells it
    "Capital Improvement Program Committee": "cip-committee",
    "Conservation Commission":     "conservation-commission",
    "Cemetery Commission":         "cemetery-commission",
    "Energy Committee":            "energy-committee",
    "Recreation Commission":       "recreation-commission",
    "Roads Committee":             "roads-committee",
    "Sewer Commission":            "sewer-commission",
    "Solid Waste Advisory Committee": "solid-waste-advisory-committee",
    "Water Works":                 "water-works",
    "Zoning Board of Adjustment":  "zoning-board-of-adjustment",
    "Library Trustees":            "library-trustees",
    "Economic Development Committee": "economic-development-committee",
    "Trustees of Trust Funds":     "trustees-of-trust-funds",
    "Range Roads Subcommittee":    "range-roads-subcommittee",
}


def parse_directory(html: str) -> tuple[dict[str, list[dict]], dict[tuple[str, str], str]]:
    """Return ({ committee_name: [ {name, title}, ... ] }, { (committee, name): term_year })

    The page has a 'People' column where each person is listed under
    their committee in the same order the committees appear in the
    page's 'Categories' dropdown. Each person entry is

        <2-letter initials> <Full Name> <Title> <Title> <Committee Name>

    where Title appears twice (the directory's data model renders
    primary + alt title).

    We walk the page in two passes:
      1. Find the position of each person record (anchored by the
         2-letter initials token + name).
      2. For each committee, find ALL person records that are
         immediately preceded by either the committee's own header
         or by another committee that's also in our SHOW_THESE_COMMITTEES
         list. This naturally groups the people by committee.

    The second return value is a side index of "Trustee Term Expires
    NNNN" — Library Trustees have their term-end year baked into the
    title text rather than the title itself. The aggregator uses this
    to fill term_ends for committees that don't have their own
    dedicated /NNNN/ page.
    """
    text = strip_tags(html)
    m_start = text.find("Staff Directory")
    m_end = text.find("Back to Top")
    if m_start < 0 or m_end < 0:
        print("WARN: could not locate Staff Directory markers", file=sys.stderr)
        return {}, {}
    body = text[m_start:m_end]

    # Find all person records. Each starts with a 2-letter initials
    # token. The person's name follows, then a title (possibly
    # doubled), then the committee name. The last name can be a
    # compound: "LePage", "DeLorme", "Castaldo-Rice", "Le Page",
    # "van der Berg", etc. We allow:
    #   - hyphenated last names
    #   - common Dutch/French particle prefixes (de, le, van, von, der)
    # We also allow Jr./Sr./II/III/IV after the last name.
    #
    # The hard part is: the last name can be one OR two words. We use
    # a regex that captures both forms, then reject captures that
    # look like they're already bleeding into the title (the second
    # word of a 2-word last name shouldn't be a common title word like
    # "Member", "Chair", "Representative", etc.).
    person_re = re.compile(
        r"\b([A-Z]{2})\s+"
        r"([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+\"[A-Z][a-z]+\")?\s+"
        r"(?:(?:de|De|Du|Le|Van|Von|der|den|la|La|Della|Di|Du)\s+)?"  # optional particle
        r"[A-Z][a-z]+"             # last name (mandatory)
        r"(?:\s+[A-Z][a-z\-]+)?"   # optional second part of compound
        r"(?:\s*,?\s*(?:III|IV|II|Jr\.?|Sr\.?))?)"
    )

    # A list of "title-looking" words that, if they appear as the 2nd
    # word of a compound last name, are actually the START of the
    # title. Used to reject over-greedy last-name captures.
    # NOTE: the town misspells "Budget Committe" (no the). We include
    # both spellings so the parser doesn't absorb the committee name
    # into the last name.
    TITLE_STOPWORDS = {
        "Member", "Chair", "Chairman", "Chairperson", "Vice", "Alternate", "Treasurer", "Secretary",
        "Director", "Superintendent", "Captain", "Lieutenant", "Chief",
        "Administrator", "Bookkeeper", "Clerk", "Manager", "Resident", "Office",
        "Representative", "Rep", "Alt", "Board", "School", "Town", "City",
        "Planning", "Public", "Range", "Conservation", "Roads", "Solid",
        "Library", "Energy", "Recreation", "Water", "Cemetery", "Sewer",
        "Pembroke", "Epsom", "Concord", "Suncook", "Allenstown", "Borough",
        "Co-Chair", "Co-Secretary", "Co-Chairperson", "Selectmen", "Police", "Trustee",
        "Building", "Emergency", "Budget", "Committee", "Committe", "Commission",
        "Works", "Old", "Department", "Maintenance", "Bicentennial", "Welfare",
        "Planner", "Operator", "Worker", "Foreman",
    }

    # Collect (position, initials, name) for every person record. The
    # directory renders each entry as
    #   <initials> <First> [Middle|Nickname] [Particle] <Last> [<Last2>] [Suffix]
    # The last name can be a compound: "LePage", "DeLorme",
    # "Castaldo-Rice", "Le Page", etc. We allow a single OR
    # two-part last name. The single-part form is "Word" OR
    # "WordWord" (internal uppercase) OR "Word-Word" (hyphenated).
    # The optional second part is just a regular capitalized word
    # (e.g. "Le Page", where "Page" is a separate last-name word).
    records: list[tuple[int, str, str]] = []
    for m in re.finditer(r"\b([A-Z]{2})\s+", body):
        # The first name starts right after the initials.
        start = m.end()
        rest = body[start:]
        # Greedy match for the full name (with optional second-part
        # of compound). Then trim trailing title stopwords.
        long_match = re.match(
            r"([A-Z][a-z]+"           # first name
            r"(?:\s+[A-Z]\.?)?"
            r"(?:\s+\"[A-Z][a-z]+\")?"
            r"\s+"
            r"(?:(?:de|De|Du|Le|Van|Von|der|den|la|La|Della|Di|Du|St\.?)\s+)?"
            # Last name part 1: a word with OPTIONAL internal-cap
            # extension glued on (LePage → Le+Page).
            r"[A-Z][a-z]+(?:[A-Z][a-z]+)?"
            r"(?:-[A-Z][a-z]+)?"     # optional hyphenated second part
            r"(?:\s+[A-Z][a-z]+)?"    # optional space-separated 2nd part
            r"(?:\s+[A-Z][a-z]+)?"    # optional 3rd part
            r"(?:\s*,?\s*(?:III|IV|II|Jr\.?|Sr\.?))?)",
            rest,
        )
        if not long_match:
            continue
        candidate = long_match.group(0).strip()
        # Now we need to BACK OFF the optional 2nd/3rd parts if they
        # are actually title words. The regex was greedy, so it
        # captured up to 3 last-name parts. We trim trailing stopwords
        # BUT we also need to handle a special case: a stopword AS the
        # 2nd or 3rd part of the last name means the regex over-matched
        # into the title. Trim those.
        words = candidate.split()
        # Trim trailing digits (years), "Term", "Expires", and any
        # stopword from the end, repeatedly, until we reach a
        # non-stopword word.
        # First pass: trim "Term Expires YYYY" or "Alternate Term
        # Expires YYYY" suffix. Walk back from end.
        # Pattern: at the end, we expect the name. Anything after
        # the last non-stopword word is over-match. Find the boundary
        # by walking forward from word 0 and counting consecutive
        # non-stopword words starting from index 1 (the last name).
        # A last name can have multiple words if NONE of them are
        # stopwords. So: from index 1, the run of non-stopwords ends
        # at the first stopword OR end of string.
        if len(words) >= 2:
            # Trim trailing stopwords + years + "Term" + "Expires" until
            # we reach a non-stopword word. This handles cases like
            # "Gerry Fleury Budget Committee Rep" (3 trailing
            # stopwords in a row) or "Judy Mitchell Alternate Term
            # Expires 2026".
            end = len(words)
            while end > 1:
                w = words[end - 1]
                if w in TITLE_STOPWORDS:
                    end -= 1
                    continue
                if re.match(r"^\d{4}$", w) or w in {"Term", "Expires"}:
                    end -= 1
                    continue
                # "Co" at the end of a 2-part name is suspicious — it's
                # usually the start of "Co-Chair", "Co-Secretary", etc.
                if w == "Co" and end >= 3:
                    end -= 1
                    continue
                # "Co" or "Co-" as a standalone suffix.
                if w.startswith("Co-") and end >= 3:
                    end -= 1
                    continue
                break
            candidate = " ".join(words[:end])
        records.append((start, m.group(1), candidate))

    # For each record, find the committee that follows the name. Walk
    # forward from name_end looking for the nearest committee name
    # (longest match first to avoid "Library" matching "Library Trustees").
    out: dict[str, list[dict]] = {}
    committee_names_sorted = sorted(SHOW_THESE_COMMITTEES, key=len, reverse=True)
    # Dedupe by (committee, name) — the directory sometimes renders
    # the same person twice under one committee (once for "Board
    # of Selectmen Alt" on a sub-committee, once for their primary
    # role). Keep the first occurrence so the primary title wins.
    seen_in_committee: set[tuple[str, str]] = set()
    term_ends_by_name: dict[tuple[str, str], str] = {}
    for i, (pos, initials, name) in enumerate(records):
        # Where does the title start? Right after the name.
        name_end_pos = pos + len(name)
        # Find the next committee name in the text after this record.
        after_name = body[name_end_pos:]
        committee = None
        for cn in committee_names_sorted:
            # Match "<space><cn>" with a word boundary after. The " "
            # before prevents "Library" matching inside "Library Trustees"
            # (since we iterate longest first, "Library Trustees" will
            # be tried before "Library").
            idx = after_name.find(" " + cn)
            if idx < 0:
                continue
            # The committee name should appear before the NEXT person's
            # initials (otherwise we picked up the committee for a later
            # record).
            if i + 1 < len(records) and idx >= records[i + 1][0] - name_end_pos:
                continue
            committee = cn
            break
        if not committee:
            continue
        # The title is everything between the name and the committee
        # name. It may be doubled ("Vice Chair Vice Chair") — collapse
        # by taking the first half if the second half equals it AND
        # the first half is at least 1 word.
        title_text = after_name[:idx].strip() if idx >= 0 else after_name.strip()
        # If the first word is a Roman numeral or single letter that
        # belongs with the previous name (e.g. "II Member Member" is
        # really "II, Member, Member"), drop the leading 1-3 char
        # token that starts with an uppercase letter and is followed
        # by a doubled pattern.
        # If the first word is a Roman numeral or single letter that
        # belongs with the previous name (e.g. "II Member Member" is
        # really "II, Member, Member"), drop the leading 1-3 char
        # token that starts with an uppercase letter and is followed
        # by a doubled pattern.
        words = title_text.split()
        title = ""
        if len(words) >= 2 and len(words) % 2 == 0 and words[: len(words) // 2] == words[len(words) // 2:]:
            title = " ".join(words[: len(words) // 2])
        elif len(words) >= 4 and words[2:4] == words[0:2]:
            # The first two words are a doubled non-title prefix
            # (e.g. "II Member II Member" → drop the II prefix).
            title = " ".join(words[2:4])
        elif len(words) >= 3 and words[-2:] == words[-4:-2]:
            title = " ".join(words[-2:])
        else:
            title = title_text
        # Drop "Email" if it appears in the title (directory inserts
        # "Email" before some committee names like "Range Roads
        # Subcommittee").
        title = " ".join(w for w in title.split() if w != "Email")
        # Some members have no title at all (just "Budget Committe"
        # follows their name). Default to "Member" so the page
        # doesn't render an empty role.
        if not title:
            title = "Member"
        if (committee, name) in seen_in_committee:
            continue
        seen_in_committee.add((committee, name))
        out.setdefault(committee, []).append({"name": name, "title": title})

        # For Library Trustees, the title text includes "Trustee Term
        # Expires NNNN" which is really a term_end field, not a title.
        # The committee-member page (if it exists) is the authoritative
        # source for term_end. We stash the year here so the aggregator
        # can fill in term_ends even when the dedicated page doesn't
        # cover this committee.
        tm = re.search(r"Term Expires (\d{4})", title)
        if tm:
            term_ends_by_name[(committee, name)] = tm.group(1)
    return out, term_ends_by_name


# Common name patterns. People in the directory are listed as
# "Firstname Lastname" or "Firstname Middlename Lastname". Some have a
# nickname in quotes (e.g. Vincent "Doc" Greco).
NAME_RE = re.compile(
    r"\b([A-Z][a-z]+"           # First name
    r"(?:\s+[A-Z][a-z\.']+)?"    # Optional middle
    r"(?:\s+\"[A-Z][a-z]+\")?"   # Optional nickname in quotes
    r"\s+[A-Z][a-z\-']+)"        # Last name (required)
)


def extract_names_in_block(block: str, committee: str) -> list[tuple[str, str]]:
    """Given the text after a committee header, return [(name, title), ...]
    Heuristic: walk NAME_RE matches; the title is the text from end of
    the name to the start of the next name (or the next committee header).
    """
    matches = list(NAME_RE.finditer(block))
    out: list[tuple[str, str]] = []
    for i, m in enumerate(matches):
        name = m.group(1).strip()
        # Skip the committee name itself if it appears as a false positive.
        if name == committee:
            continue
        # The title is text between end of this name and start of next.
        title_start = m.end()
        title_end = matches[i + 1].start() if i + 1 < len(matches) else len(block)
        title = block[title_start:title_end].strip()
        # The directory repeats the same person twice; we rely on
        # caller-side dedup. If the title is empty (last person in a
        # block), or the title is the committee name repeated, drop.
        if not title or title == committee:
            continue
        # Title sometimes includes trailing duplicate of the committee
        # name. Strip it.
        title = re.sub(r"\s+" + re.escape(committee) + r"\s*$", "", title).strip()
        # Drop trailing 'Email', '603-...', etc. — the directory
        # sometimes appends contact info we can't reliably parse.
        out.append((name, title))
    return out


# ── Committee pages: term-end years ──────────────────────────────────────


def parse_select_board(html: str) -> dict[str, str]:
    """Return { name: term_ends } from the Select Board members table.
    The table has rows like 'Sandy Goulet Vice Chair (2028)'.
    """
    text = strip_tags(html)
    # Slice to the board-members section
    m_start = text.find("Board Members")
    m_end = text.find("Contact Us")
    if m_start < 0:
        return {}
    body = text[m_start:m_end]
    out: dict[str, str] = {}
    for m in re.finditer(r"([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s+(Vice Chair|Member|Chair)(?:\s+\((\d{4})\))?", body):
        name = m.group(1).strip()
        year = m.group(3)
        if year:
            out[name] = year
    return out


def parse_planning_board(html: str) -> dict[str, str]:
    text = strip_tags(html)
    m_start = text.find("Board Members")
    m_end = text.find("Contact Us")
    if m_start < 0:
        return {}
    body = text[m_start:m_end]
    out: dict[str, str] = {}
    # The Planning Board page uses "(4/30/2029)" or "(4/30/28)" date
    # strings. The year can be 2 or 4 digits. Expand 2-digit years to
    # 20YY (the data is from the 2020s).
    for m in re.finditer(
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+(?:\s*,?\s*(?:Jr\.?|Sr\.?))?)\s+"
        r"(Chair|Member|Vice Chair|Board of Selectmen Representative|Board of Selectmen Alt\.|Alternate|Alternate Term Expires \d+|Vice Chair, Trustee Term Expires \d+|Treasurer, Trustee Term Expires \d+|Chair; Trustee Term Expires \d+|Trustee Term Expires \d+)"
        r"(?:\s+\((\d+)/(\d+)/(\d+)\))?",
        body,
    ):
        name = m.group(1).strip()
        year_raw = m.group(5)
        if year_raw:
            year = year_raw if len(year_raw) == 4 else "20" + year_raw
            out[name] = year
        else:
            # Title may include "Trustee Term Expires NNNN" — extract
            # the year from there.
            title = m.group(2)
            tm = re.search(r"Term Expires (\d{4})", title)
            if tm:
                out[name] = tm.group(1)
    return out


def parse_budget_committee(html: str) -> dict[str, str]:
    """The Budget Committee page has no explicit term ends in the
    snippet we scraped — just names and titles. Return empty map; the
    Select Board term data covers the overlap members."""
    return {}


# ── State reps (hand-curated from official sources) ─────────────────────


# The Pembroke districts and their current occupants, sourced from
# gc.nh.gov (Senate) and the 2025-2026 NHHA legislator list (House).
# Updated 2026-10. When the next election cycle happens, these will
# need to be refreshed — the cron pipeline can re-run this scraper.
STATE_REPS = [
    {
        "chamber": "senate",
        "district": "17",
        "name": "Howard Pearl",
        "party": "R",
        "towns": "Allenstown, Barnstead, Canterbury, Chichester, Deerfield, Epsom, Loudon, Northfield, Northwood, Nottingham, Pembroke, Pittsfield",
        "email": "Howard.Pearl@gc.nh.gov",
        "phone": "603-271-4151",
        "url": SENATE_D17_URL,
    },
    {
        "chamber": "house",
        "district": "Merrimack 12",
        "name": "Dianne Schuett",
        "party": "D",
        "towns": "Pembroke",
        "email": "Dianne.Schuett@gc.nh.gov",
        "phone": None,
        "url": "https://gc.nh.gov/house/members/webpages/member.aspx?pid=1194",
    },
    {
        "chamber": "house",
        "district": "Merrimack 12",
        "name": "Brian Seaworth",
        "party": "R",
        "towns": "Pembroke",
        "email": "brian.seaworth@gc.nh.gov",
        "phone": "603-722-0807",
        "url": "https://gc.nh.gov/house/members/webpages/member.aspx?pid=1107",
    },
]


# ── Aggregator ──────────────────────────────────────────────────────────


# Per-committee meeting schedule strings, hand-curated from the town's
# committee pages. Used for the "next meeting" callout on /officials.
COMMITTEE_MEETING_NOTES: dict[str, str] = {
    "Select Board":           "First and third Wednesday of the month, 6 pm at Town Hall",
    "Planning Board":         "Second and fourth Tuesday of the month, 6:30 pm at Town Hall",
    "Budget Committe":        "Meets in January and February leading up to Town Meeting; public hearings in February",
    "Conservation Commission":"Meets monthly at Town Hall (check the agenda center for the date)",
    "Cemetery Commission":    "Meets as needed; contact the Town Clerk's office for the next date",
    "Zoning Board of Adjustment": "Meets as needed when applications are received",
    "Library Trustees":       "Meets monthly at the library",
    "Water Works":            "Meets monthly at the Water Works office on Union Street",
}


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def main() -> int:
    here = Path(__file__).resolve().parent.parent
    out_path = here / "data" / "officials.json"

    print(f"Fetching {DIRECTORY_URL} ...")
    dir_html = fetch(DIRECTORY_URL)
    print(f"Fetching {SELECT_BOARD_URL} ...")
    sb_html = fetch(SELECT_BOARD_URL)
    print(f"Fetching {PLANNING_BOARD_URL} ...")
    pb_html = fetch(PLANNING_BOARD_URL)
    print(f"Fetching {BUDGET_COMMITTEE_URL} ...")
    bc_html = fetch(BUDGET_COMMITTEE_URL)

    directory, term_ends_by_name = parse_directory(dir_html)
    sb_terms = parse_select_board(sb_html)
    pb_terms = parse_planning_board(pb_html)
    bc_terms = parse_budget_committee(bc_html)

    # Build the committees array in the order of SHOW_THESE_COMMITTEES.
    committees_out: list[dict] = []
    for committee, slug in SHOW_THESE_COMMITTEES.items():
        members_in = directory.get(committee, [])
        if not members_in:
            print(f"  {committee}: no members found in directory, skipping")
            continue
        # Build a stable URL for each committee. Most committees only
        # have an agenda center page; a few have a dedicated /NNNN/
        # page that we discovered earlier.
        url = ""
        if committee == "Board of Selectmen":
            url = SELECT_BOARD_URL
        elif committee == "Planning Board":
            url = PLANNING_BOARD_URL
        elif committee == "Budget Committe":
            url = BUDGET_COMMITTEE_URL
        else:
            url = f"https://www.pembroke-nh.com/agendacenter?CID={urllib.parse.quote(committee)}" if False else "https://www.pembroke-nh.com/agendacenter"

        # Look up term-end years from the committee pages we have.
        term_table: dict[str, str] = {}
        if committee == "Board of Selectmen":
            term_table = sb_terms
        elif committee == "Planning Board":
            term_table = pb_terms
        elif committee == "Budget Committe":
            term_table = bc_terms

        members_out = []
        for m in members_in:
            term_ends = (
                term_table.get(m["name"])
                or term_ends_by_name.get((committee, m["name"]))
            )
            # Clean the title for display. If the title contains
            # "Trustee Term Expires NNNN", strip that suffix — it's
            # already captured in term_ends.
            display_title = re.sub(r",?\s*(Trustee\s+)?Term Expires \d{4}", "", m["title"]).strip()
            if not display_title:
                display_title = "Trustee"
            members_out.append({
                "name": m["name"],
                "title": display_title,
                "term_ends": term_ends,
                "email": None,        # not parsed; the directory has emails on some entries but extracting them reliably is fragile
                "photo_url": None,    # not in the directory
            })
        committees_out.append({
            "name": committee,
            "slug": slug,
            "url": url,
            "members": members_out,
            "meeting_when": COMMITTEE_MEETING_NOTES.get(committee),
            # next_meeting is filled at runtime by the site from the iCal feed
            "next_meeting": None,
        })

    # State reps
    state_reps_out = list(STATE_REPS)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_directory": DIRECTORY_URL,
        "source_select_board": SELECT_BOARD_URL,
        "source_planning_board": PLANNING_BOARD_URL,
        "source_budget_committee": BUDGET_COMMITTEE_URL,
        "source_state_reps": [
            "https://gc.nh.gov/Senate/members/webpages/district17.aspx",
            "https://www.nhha.org/wp-content/uploads/2025/06/CON_ENC-Legislator-List-06.26.25.pdf",
        ],
        "committees": committees_out,
        "state_reps": state_reps_out,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
    print(f"  {len(committees_out)} committees, {sum(len(c['members']) for c in committees_out)} total members")
    print(f"  {len(state_reps_out)} state reps")
    return 0


if __name__ == "__main__":
    sys.exit(main())
