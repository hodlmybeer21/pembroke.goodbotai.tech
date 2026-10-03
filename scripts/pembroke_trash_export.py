#!/usr/bin/env python3
"""
pembroke_trash_export.py — Scrape Pembroke, NH's "Rubbish Routes by Pickup
Day" and "Rubbish Routes by Street Name" PDFs from the Wayback Machine and
emit data/trash-routes.json for the public site.

The town hosts these PDFs at /DocumentCenter/View/582/... and /View/584/...
but the DocumentCenter URLs redirect-loop on direct fetch (Cloudflare bot
challenge). The Wayback Machine has the raw PDFs archived from 2015 with
a clean 200 response. We fetch those.

Output: data/trash-routes.json
  {
    "generated_at": "2026-10-03T...",
    "source": "https://www.pembroke-nh.com/DocumentCenter/View/582/...",
    "wayback_url": "https://web.archive.org/web/.../RubbishRoutesPD.pdf",
    "by_day": { "Monday": ["Bow Lane", "Buck Street from 151 - 302", ...], ... },
    "by_street": { "Bow Lane": "Monday", "Buck Street from 151 - 302": "Monday", ... },
    "no_pickup_streets": ["Commerce Way", ...]   # streets with no rubbish service
  }

The by-street map is keyed by the EXACT street string as the town writes
it (including parenthetical range qualifiers like "from 151 - 302"). A
street like "Buck Street" appears in BOTH Monday and Thursday lists
because the town splits it by address range. The lookup index handles
this by storing the full string; the search UI does a case-insensitive
substring match against keys.

Run from the repo root:
  python3 scripts/pembroke_trash_export.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# pypdf is installed in the user site-packages for the system Python 3
# (see ~/.hermes/scripts). We import lazily so the script is at least
# loadable if pypdf is missing.
try:
    import pypdf  # type: ignore
except ImportError:
    print("ERROR: pypdf is not installed. Run: pip3 install --user pypdf", file=sys.stderr)
    raise

# These are the canonical Pembroke-nh.com DocumentCenter URLs. They loop
# in a direct fetch, so we always go through the Wayback Machine.
SOURCE_BY_DAY = "https://www.pembroke-nh.com/DocumentCenter/View/582/Rubbish-Routes-by-Pickup-Day"
SOURCE_BY_STREET = "https://www.pembroke-nh.com/DocumentCenter/View/584/Rubbish-Routes-by-Street-Name"

# Wayback snapshot URLs (raw PDF, not the HTML wrapper). The 2015
# snapshots are the most recent confirmed-stable copies.
WAYBACK_BY_DAY = "https://web.archive.org/web/20150910124833if_/http://www.pembroke-nh.com/documents/RubbishRoutesPD.pdf"
WAYBACK_BY_STREET = "https://web.archive.org/web/20150910124541if_/http://www.pembroke-nh.com/documents/RubbishRoutesSN.pdf"

USER_AGENT = "pembroke.goodbotai.tech/0.4 (+pembroke.goodbotai.tech, trash-routes exporter)"


def fetch_pdf(url: str) -> bytes:
    """Fetch a PDF via Wayback Machine, with a regular HTTPS UA."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def extract_lines(pdf_bytes: bytes) -> list[str]:
    """Pull every text line from the PDF, in order, with whitespace
    squashed. Skip empty lines and the recurring header
    "Town of Pembroke / Solid Waste Rubbish Routes / Rubbish Routes Page N of M".
    """
    import io
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    out: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        for raw in text.splitlines():
            line = raw.strip()
            if not line:
                continue
            # Drop recurring page header. The header appears once per
            # page, so this loop is the only place to filter it.
            if line.startswith("Town of Pembroke"):
                continue
            if line.startswith("Solid Waste Rubbish Routes"):
                continue
            if re.match(r"^Rubbish Routes( Page)?\s*\d+\s*of\s*\d+\s*$", line):
                continue
            out.append(line)
    return out


# The pickup-day PDF groups streets by day. Each entry is a single line:
# "Street Name" or "Street Name (sub-range)" followed by the day on the
# same line (the by-day PDF), or on its own line in the by-street PDF
# (where the day comes before the street).
#
# by-day line format: "<street>  <Day>"  (two spaces, one trailing token)
# by-street line format: "<street>  <Day>"  (also two-column, but ordered
#   alphabetically with the day as a suffix per street)
#
# Both files use a small fixed vocabulary of pickup days. "No Pickup"
# appears in the by-street PDF for Commerce Way.
VALID_DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
NO_PICKUP = "No Pickup"


def parse_by_day(lines: list[str]) -> tuple[dict[str, list[str]], list[str]]:
    """Parse the by-Pickup-Day PDF: streets grouped by day.

    Returns: (by_day, no_pickup_streets)
      by_day: { "Monday": [...streets], "Tuesday": [...], ... }
      no_pickup_streets: streets in the source marked "No Pickup"
    """
    by_day: dict[str, list[str]] = {d: [] for d in VALID_DAYS}
    no_pickup: list[str] = []
    # Each non-day line is "Street  Day". Split on the rightmost day token
    # by trying each valid day. We use a regex with alternation.
    day_re = re.compile(r"\s+(" + "|".join(VALID_DAYS) + r"|" + re.escape(NO_PICKUP) + r")\s*$")
    for line in lines:
        m = day_re.search(line)
        if not m:
            # Some street names contain words like "Pine Street" which
            # already includes a direction. Lines without a trailing
            # day token are either junk or continuation lines. Skip.
            continue
        street = line[: m.start()].strip()
        day = m.group(1)
        if not street:
            continue
        if day == NO_PICKUP:
            no_pickup.append(street)
        else:
            by_day[day].append(street)
    return by_day, no_pickup


def build_by_street(
    by_day: dict[str, list[str]],
    by_street_pdf: dict[str, str],
) -> dict[str, str]:
    """Build a flat street -> day map.

    Primary source is the by-day PDF (it's the official "where do I find
    my pickup day" lookup the town publishes). We use the by-street PDF
    to fill in any streets that appear there but not in the by-day list
    — this catches updates the town has made to one PDF but not the
    other (e.g. Winchester Court was added to the by-street index after
    2015).

    When a street appears in BOTH sources with conflicting days, the
    by-day version wins (it is the authoritative grouping). The
    by-street PDF sometimes annotates day-splits with "(Lower Half)" /
    "(Upper Half)" qualifiers that the by-day PDF omits — those are
    the same logical street, just with different canonical strings.
    """
    out: dict[str, str] = {}
    for day in VALID_DAYS:
        for street in by_day.get(day, []):
            out.setdefault(street, day)
    # Now add any streets from the by-street PDF that didn't make it
    # into the by-day list. These are typically recent additions.
    added_from_street_pdf = []
    for street, day in by_street_pdf.items():
        if day == NO_PICKUP:
            continue  # "no pickup" is handled separately
        if street in out:
            continue
        # Try stripping a "(Lower Half)" / "(Upper Half)" suffix — the
        # by-day PDF may have the un-suffixed version.
        cleaned = re.sub(r"\s*\((Lower|Upper)\s+Half\)\s*$", "", street)
        if cleaned != street and cleaned in out:
            continue  # already present under the bare name
        out[street] = day
        added_from_street_pdf.append(street)
    if added_from_street_pdf:
        print(
            f"  Added {len(added_from_street_pdf)} streets from by-street PDF "
            f"that were missing in by-day PDF: {added_from_street_pdf}"
        )
    return out


def main() -> int:
    here = Path(__file__).resolve().parent.parent  # repo root
    out_path = here / "data" / "trash-routes.json"

    print(f"Fetching by-day PDF from {WAYBACK_BY_DAY} ...")
    by_day_pdf = fetch_pdf(WAYBACK_BY_DAY)
    print(f"  got {len(by_day_pdf)} bytes")

    print(f"Fetching by-street PDF from {WAYBACK_BY_STREET} ...")
    by_street_pdf = fetch_pdf(WAYBACK_BY_STREET)
    print(f"  got {len(by_street_pdf)} bytes")

    day_lines = extract_lines(by_day_pdf)
    street_lines = extract_lines(by_street_pdf)
    print(f"by-day PDF: {len(day_lines)} non-header lines")
    print(f"by-street PDF: {len(street_lines)} non-header lines")

    by_day, no_pickup = parse_by_day(day_lines)
    print("by-day counts:", {d: len(v) for d, v in by_day.items() if v})
    print("no-pickup streets:", no_pickup)

    # Parse the by-street PDF into a separate index for the merge step.
    by_street_pdf_index: dict[str, str] = {}
    day_re_street = re.compile(r"\s+(" + "|".join(VALID_DAYS) + r"|" + re.escape(NO_PICKUP) + r")\s*$")
    for line in street_lines:
        m = day_re_street.search(line)
        if not m:
            continue
        street = line[: m.start()].strip()
        if not street:
            continue
        by_street_pdf_index.setdefault(street, m.group(1))

    by_street = build_by_street(by_day, by_street_pdf_index)
    print(f"by-street index: {len(by_street)} unique street strings")

    # No-pickup streets come from the by-street PDF (the by-day PDF
    # doesn't list streets with no service). If the by-day version is
    # updated to include "No Pickup" rows in the future, those will
    # also be picked up.
    if not no_pickup:
        for street, day in by_street_pdf_index.items():
            if day == NO_PICKUP:
                no_pickup.append(street)
        if no_pickup:
            print(f"  No-pickup streets (from by-street PDF): {no_pickup}")

    # Dedupe no_pickup and sort.
    no_pickup_sorted = sorted(set(no_pickup))

    # Final payload — keep the exact "by_day" key shape and a flat
    # "by_street" lookup. The TypeScript consumer in lib/town-info.ts
    # uses both.
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_by_day": SOURCE_BY_DAY,
        "source_by_street": SOURCE_BY_STREET,
        "wayback_by_day": WAYBACK_BY_DAY,
        "wayback_by_street": WAYBACK_BY_STREET,
        "by_day": {d: by_day[d] for d in VALID_DAYS if by_day.get(d)},
        "by_street": dict(sorted(by_street.items())),
        "no_pickup_streets": no_pickup_sorted,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
