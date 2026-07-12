# Maintenance Dashboard

Static implementation of `project/Maintenance Dashboard.dc.html`, the Claude
Design prototype in this repo. No build step — open `index.html` directly
or serve the folder with any static file server.

```
app/
  index.html               markup
  styles.css                styles
  app.js                     state, rendering, sort/filter interactions
  data/dashboard-data.json  generated dataset (repair-center stats + top 60
                             reactive-downtime assets)
  scripts/build_data.py     regenerates dashboard-data.json from source xlsx
```

## Regenerating the data

`dashboard-data.json` is computed from the raw labour report, not
hand-copied from the prototype. To rebuild it after the source data changes:

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
