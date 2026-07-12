# Asset ID naming convention

_Started 2026-07-12 16:40 UTC_

---

## User

Asset name should be the Asset ID no changes

## Assistant

_[tool: grep]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Asset names now show the raw Asset ID unchanged.

## User

please use this file to understand the work order types. then please only show the reactive work orders for most downtime by asset

## Assistant

_[tool: run_script]_

_[tool: list_files]_

_[tool: copy_files]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: read_file]_

_[tool: read_file]_

The asset table has no work-order-type breakdown in it. Let me check the labour report — that's the underlying source and may have per-asset WO types.

_[tool: copy_files]_

_[tool: run_script]_

_[tool: run_script]_

The labour report has WO-level rows with Type + Asset ID + Hours. Now I'll compute reactive-only downtime per asset.

_[tool: run_script]_

Reactive data computed cleanly. Now I'll write it into the dashboard, replacing the asset table's data and relabeling it.

_[tool: run_script]_

_[tool: ready_for_verification]_

Done. Per the WO TYPES file, the reactive KPI types are TECH, OSRE, MO, U/B and ITRE. I aggregated the June labour report to those types only and rebuilt the asset table — now "Most Reactive Downtime by Asset" (top 60), with hours, work-order counts and parts cost recomputed from reactive WOs only. The site filter still works across repair centers.

## User

could i have the ability to filter high to low for hours, work orders and parts cost. the past cost is in £

## Assistant

_[tool: read_file]_

I'll add sortable column headers (click to sort high→low) and switch cost to £.

_[tool: str_replace_edit]_

Now update the table header row to be clickable:

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Added click-to-sort on the HOURS, WORK ORDERS and PARTS COST headers — each sorts high→low, with the active column highlighted in blue and a ↓ arrow. Parts cost now shows in £.

## User

can you had a universal filter at the top so i can pick repair center and it will change all stats to that one.

## Assistant

This needs real per-repair-center stats. Let me compute them all from the labour report.

_[tool: run_script]_

_[tool: run_script]_

_[tool: read_file]_

_[tool: run_script]_

Now I'll rewire the logic to a single top-level repair-center filter driving every stat.

_[tool: run_script]_

Now the template — header filter, KPI cards, chart, and bars need to bind to these values.

_[tool: str_replace_edit]_

Now the KPI cards:

_[tool: str_replace_edit]_

Now the daily chart (title + points) and the pro/reactive bars:

_[tool: str_replace_edit]_

Now remove the two redundant per-widget selectors (pie + table), since the universal filter drives them:

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

_[tool: multi_screenshot]_

The universal filter works — switching to BH updates every stat (KPIs, chart, planned %, techs, subtitle, and the asset table down to Top 22).

Added a single repair-center dropdown in the top header. Selecting a center now updates all stats at once — KPI cards, the daily labor chart, proactive/reactive bars, the work-order type pie, and the reactive downtime table. The per-widget selectors are gone (they now show the active center as a label instead).

## User

PMCO is compliance not callout

## Assistant

_[tool: str_replace_edit]_

PMCO now labeled "Preventive (Compliance)."

