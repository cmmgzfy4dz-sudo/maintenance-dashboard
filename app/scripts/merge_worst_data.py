#!/usr/bin/env python3
"""
Merges the Worst Asset page data into app/data/dashboard-data.json.

Unlike the Dashboard page (built from project/data/labour.xlsx by
build_data.py), the Worst Asset numbers are computed by the design tool
from a large per-work-order CMMS export (Q2 2026 reactive work orders,
with RF-Strapper TECH entries excluded per the design session) that
exceeds this environment's single-file fetch size, so it isn't
re-derived here. project/data/worst_asset.json is that computed output,
copied verbatim from the design project; this script just merges it in.

Usage:
    python3 merge_worst_data.py
"""
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WORST_JSON = REPO_ROOT / "project" / "data" / "worst_asset.json"
OUT_JSON = REPO_ROOT / "app" / "data" / "dashboard-data.json"


def main():
    worst = json.load(open(WORST_JSON))
    data = json.load(open(OUT_JSON))
    data["worst"] = worst
    with open(OUT_JSON, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)
    print(f"Wrote {OUT_JSON}")
    print(f"  repair centers: {sorted(k for k in worst['byRC'] if k != 'ALL')}")


if __name__ == "__main__":
    main()
