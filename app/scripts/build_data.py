#!/usr/bin/env python3
"""
Regenerates app/data/dashboard-data.json from the source labour report and
work-order-type reference sheet.

Usage:
    python3 build_data.py

Inputs (relative to repo root):
    project/data/labour.xlsx    per-labor-entry report for June 2026
    project/data/wo_types.xlsx  work order type -> Proactive/Reactive mapping

Output:
    app/data/dashboard-data.json
"""
import datetime
import json
import math
from pathlib import Path

import openpyxl

REPO_ROOT = Path(__file__).resolve().parents[2]
LABOUR_XLSX = REPO_ROOT / "project" / "data" / "labour.xlsx"
WO_TYPES_XLSX = REPO_ROOT / "project" / "data" / "wo_types.xlsx"
OUT_JSON = REPO_ROOT / "app" / "data" / "dashboard-data.json"

TOP_ASSET_COUNT = 60
EXCEL_EPOCH = datetime.datetime(1899, 12, 30)

# Work-order-type -> display category, for the "Work Order Type Split" pie.
# This is a business/labeling decision made during design, not derivable
# from the source data, so it stays hand-maintained here.
CATEGORY_MAP = {
    "PM": "Preventive", "PMCO": "Preventive (Compliance)", "U/B": "Unplanned Breakdown",
    "OSRE": "Preventive", "OP": "Operational", "CM": "Corrective", "TECH": "Other",
    "FU": "Other", "MO": "Other", "FM": "Other", "INS": "Other", "CC": "Other",
    "ITRE": "Other", "PC": "Other", "SR": "Other", "ITPR": "Other", "SA": "Other",
}


def round_(x, d=1):
    # Match JS Math.round semantics (half rounds away from zero), rather
    # than Python's round-half-to-even, so output matches the values
    # verified in the design tool.
    sign = -1 if x < 0 else 1
    return sign * math.floor(abs(x) * 10**d + 0.5) / 10**d


def excel_time_to_dt(v):
    """labour.xlsx has a mix of real datetimes and raw Excel serial floats
    in the Time In column (spreadsheet formatting inconsistency)."""
    if v is None:
        return None
    if isinstance(v, datetime.datetime):
        return v
    if isinstance(v, (int, float)):
        return EXCEL_EPOCH + datetime.timedelta(days=float(v))
    return None


def load_reactive_types():
    wb = openpyxl.load_workbook(WO_TYPES_XLSX, read_only=True, data_only=True)
    ws = wb["WO TYPES"]
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    reactive = set()
    for row in rows:
        wo_type, kpi_flag = row[1], row[5]
        if wo_type and kpi_flag and str(kpi_flag).strip().lower() == "reactive":
            reactive.add(str(wo_type).strip())
    return reactive


def load_labour_rows():
    wb = openpyxl.load_workbook(LABOUR_XLSX, read_only=True, data_only=True)
    ws = wb["Sheet1"]
    header = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    idx = {name: i for i, name in enumerate(header) if name}

    rows = []
    for raw in ws.iter_rows(min_row=2, values_only=True):
        rc = raw[idx["Repair Center ID"]]
        if not rc:
            continue
        rows.append({
            "labor_name": raw[idx["Labor Name"]],
            "wo": raw[idx["Work Order #"]],
            "type": raw[idx["Type"]],
            "asset": raw[idx["Asset ID"]],
            "hours": raw[idx["Total Hours"]] or 0,
            "status": raw[idx["Status"]],
            "rc": rc,
            "cost": raw[idx["Cost Part Actual"]] or 0,
            "time_in": excel_time_to_dt(raw[idx["Time In"]]),
        })
    return rows


def build_rc_stats(rows, reactive_types):
    def stats_for(rc_rows):
        wo_ids = {r["wo"] for r in rc_rows}
        hours = sum(r["hours"] for r in rc_rows)
        pro_hours = sum(r["hours"] for r in rc_rows if r["type"] not in reactive_types)
        re_hours = sum(r["hours"] for r in rc_rows if r["type"] in reactive_types)
        cost = sum(r["cost"] for r in rc_rows)
        n = len(rc_rows)
        closed = sum(1 for r in rc_rows if r["status"] == "CLOSED")
        open_n = sum(1 for r in rc_rows if r["status"] in ("ISSUED", "ONHOLD"))
        techs = {r["labor_name"] for r in rc_rows}

        type_counts = {}
        for r in rc_rows:
            type_counts[r["type"]] = type_counts.get(r["type"], 0) + 1

        by_date = {}
        for r in rc_rows:
            if r["time_in"] is None:
                continue
            d = r["time_in"].date()
            by_date[d] = by_date.get(d, 0) + r["hours"]
        series = [round_(by_date[d]) for d in sorted(by_date)]

        return {
            "wo": len(wo_ids),
            "hours": round_(hours),
            "proHours": round_(pro_hours),
            "reHours": round_(re_hours),
            "plannedPct": round_(pro_hours / hours * 100) if hours else 0,
            "avgHrs": round_(hours / len(wo_ids)) if wo_ids else 0,
            "cost": round_(cost, 0),
            "open": open_n,
            "series": series,
            "typeCounts": type_counts,
            "closedPct": round_(closed / n * 100) if n else 0,
            "techs": len(techs),
        }

    rc_stats = {"ALL": stats_for(rows)}
    rc_names = sorted({r["rc"] for r in rows})
    for rc in rc_names:
        rc_stats[rc] = stats_for([r for r in rows if r["rc"] == rc])
    return rc_stats


def build_asset_downtime(rows, reactive_types):
    reactive_rows = [r for r in rows if r["type"] in reactive_types]

    order = []
    seen = set()
    agg = {}
    for r in reactive_rows:
        asset = r["asset"]
        if asset not in seen:
            seen.add(asset)
            order.append(asset)
            agg[asset] = {"hours": 0.0, "wo": set(), "cost": 0.0, "rc_counts": {}}
        a = agg[asset]
        a["hours"] += r["hours"]
        a["wo"].add(r["wo"])
        a["cost"] += r["cost"]
        a["rc_counts"][r["rc"]] = a["rc_counts"].get(r["rc"], 0) + 1

    table = []
    for asset in order:
        a = agg[asset]
        rc = max(a["rc_counts"], key=a["rc_counts"].get)
        table.append([asset, rc, round_(a["hours"]), len(a["wo"]), round_(a["cost"], 0)])

    table.sort(key=lambda row: row[2], reverse=True)
    return table[:TOP_ASSET_COUNT]


def main():
    reactive_types = load_reactive_types()
    rows = load_labour_rows()
    rc_stats = build_rc_stats(rows, reactive_types)
    asset_downtime = build_asset_downtime(rows, reactive_types)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w") as f:
        json.dump({
            "rcStats": rc_stats,
            "assetDowntime": asset_downtime,
            "categoryMap": CATEGORY_MAP,
        }, f, indent=2, sort_keys=True)

    print(f"Wrote {OUT_JSON}")
    print(f"  repair centers: {sorted(k for k in rc_stats if k != 'ALL')}")
    print(f"  reactive work order types: {sorted(reactive_types)}")
    print(f"  asset rows: {len(asset_downtime)}")


if __name__ == "__main__":
    main()
