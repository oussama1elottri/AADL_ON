#!/usr/bin/env python3

import csv
import subprocess
import shlex
import argparse
import sys
import json
from pathlib import Path

# --- default config (override with CLI args) ---
DEFAULT_REPO = "oussama1elottri/AADL_ON"
DEFAULT_CSV = "phase0.csv"
DEFAULT_LABEL = "phase-0"
ASSIGNEE_PLACEHOLDERS = {"unassigned", "none", "-", ""}

# -----------------------

def run_cmd(cmd):
    """Run a shell command and return (rc, stdout, stderr)."""
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return proc.returncode, proc.stdout.strip(), proc.stderr.strip()

def gh_available():
    rc, out, err = run_cmd(["gh", "--version"])
    return rc == 0

def get_existing_issue_titles(repo):
    """Return a set of existing issue titles in the repo (state: all)."""
    cmd = ["gh", "issue", "list", "--repo", repo, "--limit", "200", "--state", "all", "--json", "title"]
    rc, out, err = run_cmd(cmd)
    if rc != 0:
        print("Warning: failed to list existing issues:", err)
        return set()
    try:
        arr = json.loads(out)
        return { item["title"].strip() for item in arr if "title" in item }
    except Exception:
        # fallback: parse plain lines
        return set()

def create_issue(repo, title, body, labels=None, assignee=None, dry_run=False):
    labels = labels or []
    cmd = ["gh", "issue", "create", "--repo", repo, "--title", title, "--body", body]
    for lab in labels:
        cmd += ["--label", lab]
    if assignee:
        cmd += ["--assignee", assignee]
    if dry_run:
        print("[DRY RUN] CMD:", " ".join(shlex.quote(x) for x in cmd))
        return None, None
    rc, out, err = run_cmd(cmd)
    if rc != 0:
        return None, err
    # Output contains the created issue URL as last line
    created_url = out.splitlines()[-1].strip()
    return created_url, None

def parse_labels(labels_raw):
    if not labels_raw:
        return [DEFAULT_LABEL]
    parts = [p.strip() for p in labels_raw.split(",") if p.strip()]
    if DEFAULT_LABEL not in parts:
        parts.insert(0, DEFAULT_LABEL)
    return parts

def normalize_assignee(value):
    if value is None:
        return None
    v = value.strip()
    if v.lower() in ASSIGNEE_PLACEHOLDERS:
        return None
    return v  # return username as-is

def safe_join_lines(*parts):
    return "\n\n".join([p.strip() for p in parts if p and p.strip()])

def main():
    parser = argparse.ArgumentParser(description="Create GitHub issues from CSV (safe mode)")
    parser.add_argument("--csv", default=DEFAULT_CSV, help="CSV file path")
    parser.add_argument("--repo", default=DEFAULT_REPO, help="GitHub repo owner/name")
    parser.add_argument("--dry-run", action="store_true", help="Print GH commands without creating issues")
    args = parser.parse_args()

    if not gh_available():
        print("ERROR: gh CLI not available. Install it and run `gh auth login` first.")
        sys.exit(1)

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"ERROR: CSV file not found at {csv_path.resolve()}")
        sys.exit(1)

    repo = args.repo
    print("Repo:", repo)
    print("CSV:", csv_path)

    existing_titles = get_existing_issue_titles(repo)
    print(f"Found {len(existing_titles)} existing issues (titles). Will skip duplicates by title.")

    created = []
    with csv_path.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            title = (row.get("Title") or row.get("Task Name") or f"Phase0 Task {idx}").strip()
            if title in existing_titles:
                print(f"[skip] Issue already exists with title: {title!r}")
                continue

            desc = (row.get("Description") or "").strip()
            priority = (row.get("Priority") or "").strip()
            assignee_raw = (row.get("Assignee") or "").strip()
            assignee = normalize_assignee(assignee_raw)
            status = (row.get("Status") or "").strip()
            due = (row.get("Due Date") or "").strip()
            labels_raw = (row.get("Labels") or "").strip()
            dependencies = (row.get("Dependencies") or "").strip()

            # Build body
            parts = []
            parts.append(desc if desc else "No description provided.")
            meta_lines = []
            if priority:
                meta_lines.append(f"- **Priority:** {priority}")
            if status:
                meta_lines.append(f"- **Initial status:** {status}")
            if due:
                meta_lines.append(f"- **Due date:** {due}")
            if dependencies:
                meta_lines.append(f"- **Dependencies:** {dependencies}")
            if assignee:
                meta_lines.append(f"- **Suggested assignee:** @{assignee}")
            if meta_lines:
                parts.append("Metadata:\n" + "\n".join(meta_lines))
            body = safe_join_lines(*parts)

            labels = parse_labels(labels_raw)
            print(f"[create] {title} (assignee={assignee}, labels={labels})")
            url, err = create_issue(repo, title, body, labels=labels, assignee=assignee, dry_run=args.dry_run)
            if err:
                print(f"ERROR creating '{title}': {err}")
                # don't exit; continue with next
                continue
            if url:
                print(" -> created:", url)
                created.append((title, url))
                existing_titles.add(title)  # avoid duplicates in same run

    print("\nDone. Created", len(created), "new issues.")
    if created:
        for t, u in created:
            print("-", t, "=>", u)

if __name__ == "__main__":
    main()
