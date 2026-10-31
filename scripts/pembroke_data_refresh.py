#!/usr/bin/env python3
"""
Refresh the site's derived data and land it on a branch, never on main.

WHY A BRANCH AND NOT MAIN
-------------------------
The site's refreshers push straight to main today. That works, but it
has two costs:

1. It collides with the Chief of Staff's own pull request review. A
   pull request cannot be reviewed cleanly while something else is
   landing on main underneath it.
2. Every open pull request on the site accumulates a wall of unrelated
   data changes as soon as the nightly refresh lands. A reviewer has to
   work out whether the branch is reverting the newest data before they
   can read the code change at all. That is not hypothetical - it is
   what happened to the minutes-search branch.

This script runs the pipeline, commits only the data files that
actually changed, pushes to a dedicated branch and opens a pull
request. The Chief of Staff reviews and merges it like anything else.

WHAT IT REFRESHES
-----------------
    data/governance.json          the raw motion and vote extract
    data/governance-summary.json  the aggregates /decisions reads
    data/official-records.json    the per-official voting records

These three were the ones the Chief of Staff deliberately deferred from
the nightly crons, because a cron pushing to main would collide with
their review workflow. This is that wiring, done in a way that does
not collide.

The archive export is NOT in here. It pushes to main already and it
pushes raw documents rather than derived judgements about them. If the
Chief of Staff wants the same treatment for it, the change is to point
it at this script's branch-and-PR step.

HOW IT STAYS SAFE
-----------------
The git work happens in a throwaway worktree, not in the checkout the
cron scripts use. The pipeline scripts have the site path hardcoded, so
they run in the normal checkout, but their output is copied into the
worktree and the normal checkout is restored afterwards. A cron that
dies halfway leaves the site checkout on `main` with clean data.

Usage:
    python3 scripts/pembroke_data_refresh.py [--dry-run]
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HERMES_SCRIPTS = Path.home() / ".hermes" / "scripts"
BRANCH = "chore/data-refresh"

DATA_FILES = [
    "data/governance.json",
    "data/governance-summary.json",
    "data/official-records.json",
]

PIPELINE = [
    ("governance extract", "pembroke_governance_extract.py"),
    ("governance export", "pembroke_governance_export.py"),
    ("official records", "pembroke_official_records.py"),
]


def run(cmd, cwd=None, check=True, quiet=False):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(
            f"{' '.join(cmd)} failed ({r.returncode})\n{(r.stderr or r.stdout)[-800:]}"
        )
    if not quiet and r.stdout.strip():
        print("   " + r.stdout.strip().replace("\n", "\n   ")[-1200:])
    return r


def gh_token() -> str:
    """Pull the GitHub token out of the macOS keychain."""
    try:
        r = subprocess.run(
            ["security", "find-generic-password", "-a", "github", "-s", "hermes-bot-github", "-w"],
            capture_output=True,
            text=True,
        )
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    except Exception:
        pass
    return os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="run the pipeline, change nothing")
    args = ap.parse_args()

    print("→ data refresh")

    # The checkout the cron scripts share has to be on main and clean,
    # or the pipeline would read from a branch.
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=REPO, quiet=True).stdout.strip()
    if branch != "main":
        print(f"   ✗ the site checkout is on '{branch}', not main — skipping")
        return 1
    dirty = run(["git", "status", "--porcelain"], cwd=REPO, quiet=True).stdout.strip()
    if dirty:
        print("   ✗ the site checkout has uncommitted changes — skipping")
        print("     " + dirty.replace("\n", "\n     ")[:400])
        return 1

    # ---- 1. run the pipeline ------------------------------------------
    missing = [f for _, f in PIPELINE if not (HERMES_SCRIPTS / f).exists()]
    if missing:
        print(f"   ✗ missing pipeline scripts: {', '.join(missing)}")
        return 1

    for label, script in PIPELINE:
        print(f"   · {label}")
        run([sys.executable, str(HERMES_SCRIPTS / script)], cwd=REPO)

    changed = []
    for f in DATA_FILES:
        p = REPO / f
        if not p.exists():
            print(f"   ✗ {f} was not produced")
            return 1
        r = run(["git", "status", "--porcelain", "--", f], cwd=REPO, quiet=True).stdout.strip()
        if r:
            changed.append(f)

    if not changed:
        print("   ✓ no data changed — nothing to do")
        run(["git", "checkout", "--"] + DATA_FILES, cwd=REPO, quiet=True)
        return 0

    print(f"   · changed: {', '.join(changed)}")
    if args.dry_run:
        print("   (dry run — nothing committed)")
        run(["git", "checkout", "--"] + DATA_FILES, cwd=REPO, quiet=True)
        return 0

    # ---- 2. copy into a throwaway worktree ---------------------------
    worktree = Path(tempfile.mkdtemp(prefix="pembroke-refresh-"))
    wt_path = worktree / "wt"
    try:
        run(["git", "fetch", "origin", "main"], cwd=REPO, quiet=True)
        run(
            ["git", "worktree", "add", "--detach", str(wt_path), "origin/main"],
            cwd=REPO,
            quiet=True,
        )
        run(["git", "checkout", "-B", BRANCH], cwd=wt_path, quiet=True)

        for f in changed:
            dest = wt_path / f
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO / f, dest)

        run(["git", "add"] + changed, cwd=wt_path, quiet=True)
        r = run(["git", "commit", "-m", f"chore(data): refresh governance and official records"], cwd=wt_path, quiet=True)
        if "nothing to commit" in (r.stdout + r.stderr):
            print("   ✓ nothing to commit after all")
            return 0

        # The branch is rebuilt from origin/main every run, so it may not
        # fast-forward against what is already on the remote. A
        # force-with-lease pinned to the sha we actually saw is safe: if
        # somebody else moved the branch in the meantime, the push fails
        # instead of clobbering them.
        remote = run(
            ["git", "ls-remote", "origin", f"refs/heads/{BRANCH}"], cwd=REPO, quiet=True
        ).stdout.strip()
        expected = remote.split()[0] if remote else ""
        if expected:
            run(
                ["git", "push", f"--force-with-lease={BRANCH}:{expected}", "origin", f"HEAD:{BRANCH}"],
                cwd=wt_path,
                quiet=True,
            )
        else:
            run(["git", "push", "origin", f"HEAD:{BRANCH}"], cwd=wt_path, quiet=True)

        # ---- 3. open or update the pull request -----------------------
        token = gh_token()
        env = dict(os.environ)
        if token:
            env["GH_TOKEN"] = token
        pr_list = run(
            ["gh", "pr", "list", "--head", BRANCH, "--state", "open", "--json", "number,url"],
            cwd=wt_path,
            env=env,
            quiet=True,
        ).stdout.strip()
        existing = None
        try:
            import json

            parsed = json.loads(pr_list or "[]")
            if parsed:
                existing = parsed[0]
        except Exception:
            existing = None

        body = (
            "Automated refresh of the site's derived data:\n\n"
            + "\n".join(f"- `{f}`" for f in changed)
            + "\n\nRegenerated by `scripts/pembroke_data_refresh.py`, which runs the "
            "governance extraction and the official-records export and lands the "
            "result here instead of pushing straight to main, so it can be "
            "reviewed like anything else.\n"
        )

        if existing:
            run(["gh", "pr", "edit", str(existing["number"]), "--body", body], cwd=wt_path, env=env, quiet=True)
            print(f"   ✓ updated PR #{existing['number']} — {existing['url']}")
        else:
            r = run(
                [
                    "gh", "pr", "create",
                    "--base", "main",
                    "--head", BRANCH,
                    "--title", "chore(data): refresh governance and official records",
                    "--body", body,
                ],
                cwd=wt_path,
                env=env,
                quiet=True,
            )
            print("   ✓ opened " + r.stdout.strip())

    finally:
        # The shared checkout must never be left dirty or on another
        # branch, or the next cron would push the wrong thing.
        try:
            run(["git", "worktree", "remove", "--force", str(wt_path)], cwd=REPO, quiet=True)
        except Exception:
            pass
        shutil.rmtree(worktree, ignore_errors=True)
        try:
            run(["git", "checkout", "--"] + DATA_FILES, cwd=REPO, quiet=True)
            run(["git", "worktree", "prune"], cwd=REPO, quiet=True)
        except Exception:
            pass

    return 0


if __name__ == "__main__":
    sys.exit(main())
