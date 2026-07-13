# Maintenance Dashboard

Static implementation of `project/Maintenance Dashboard.dc.html`, the Claude
Design prototype in this repo. No build step — open `index.html` directly
or serve the folder with any static file server.

Two pages, switched client-side via the sidebar nav (Dashboard / Worst
Asset — the other nav items are static, matching the prototype):

- **Dashboard** — June 2026 KPIs, daily labor chart, proactive/reactive
  split, work-order-type pie, and a reactive-downtime-by-asset table.
- **Worst Asset** — Q2 2026 (Apr–Jun) reactive breakdown spend: KPIs, top
  12 assets by cost, failure-type split, cost by repair center, and a
  sortable worst-assets table. Both filter by repair center.

```
app/
  index.html               markup
  styles.css                styles
  app.js                     state, rendering, sort/filter interactions
  data/dashboard-data.json  generated dataset — Dashboard-page stats
                             (repair-center stats + top 60 reactive-downtime
                             assets) plus the Worst Asset page's byRC/rcRank data
  scripts/build_data.py     regenerates the Dashboard-page data from source xlsx
  scripts/merge_worst_data.py  merges project/data/worst_asset.json (Worst
                             Asset page data) into dashboard-data.json
```

## Regenerating the data

`dashboard-data.json`'s Dashboard-page fields are computed from the raw
labour report, not hand-copied from the prototype. To rebuild them after
the source data changes:

```
pip install openpyxl
python3 app/scripts/build_data.py
```

It reads `project/data/labour.xlsx` (per-labor-entry June 2026 report) and
`project/data/wo_types.xlsx` (work-order-type → Proactive/Reactive mapping)
and writes `app/data/dashboard-data.json`. The "reactive" work order types
used to filter the asset downtime table (TECH, OSRE, MO, U/B, ITRE) come
from the "Proactive or Reactive when it comes to KPIs" column in
`wo_types.xlsx`, per the design session.

The Worst Asset page's `worst` field is different: it's computed by the
design tool from a per-work-order CMMS export for Q2 2026 (with
RF-Strapper TECH work orders excluded, per the design session) that's too
large to fetch into this environment in one piece, so it isn't re-derived
from raw data here. `project/data/worst_asset.json` is that computed
output, copied verbatim from the design project; running
`python3 app/scripts/merge_worst_data.py` merges it into
`dashboard-data.json`. Re-run it (after re-copying an updated
`worst_asset.json`) if the design's Worst Asset numbers change.

After regenerating either, copy `app/` over `docs/` (GitHub Pages mirror
of this folder) to publish the changes.
