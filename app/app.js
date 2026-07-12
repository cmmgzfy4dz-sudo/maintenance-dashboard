(function () {
  "use strict";

  const CATEGORY_COLOR = {
    "Preventive": "#3ba7ff",
    "Preventive (Compliance)": "#8b5cf6",
    "Unplanned Breakdown": "#f87171",
    "Operational": "#f59e0b",
    "Corrective": "#34d399",
    "Other": "#6b7280",
  };

  const CATEGORY_ORDER = [
    "Preventive", "Preventive (Compliance)", "Unplanned Breakdown",
    "Operational", "Corrective", "Other",
  ];

  const state = { rc: "ALL", sortBy: "hours" };
  let DATA = null;

  const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  const gbp = (n) => `£${Math.round(n).toLocaleString()}`;

  function computeView() {
    const rcStats = DATA.rcStats;
    const categoryMap = DATA.categoryMap;
    const assetDowntime = DATA.assetDowntime;

    const rc = state.rc;
    const s = rcStats[rc] || rcStats.ALL;
    const rcLabel = rc === "ALL" ? "All Repair Centers" : rc;

    const kpi = {
      wo: s.wo.toLocaleString(),
      closed: `${s.closedPct}% closed`,
      hours: Math.round(s.hours).toLocaleString(),
      techs: `across ${s.techs} techs`,
      planned: `${s.plannedPct}%`,
      avg: s.avgHrs,
      open: s.open,
      cost: gbp(s.cost),
    };

    const series = s.series;
    const nS = series.length;
    const maxS = Math.max(...series, 1);
    const linePoints = series.map((v, i) => {
      const x = nS > 1 ? round((i / (nS - 1)) * 400) : 0;
      const y = round(120 - (v / maxS) * 110);
      return `${x},${y}`;
    }).join(" ");
    const areaPoints = `${linePoints} 400,120 0,120`;

    const proH = s.proHours, reH = s.reHours;
    const maxH = Math.max(proH, reH, 1);
    const proBarPx = `${Math.round((proH / maxH) * 88)}px`;
    const reBarPx = `${Math.round((reH / maxH) * 88)}px`;

    const catCounts = {};
    let total = 0;
    for (const [type, count] of Object.entries(s.typeCounts)) {
      const cat = categoryMap[type] || "Other";
      catCounts[cat] = (catCounts[cat] || 0) + count;
      total += count;
    }
    const legend = CATEGORY_ORDER
      .filter((cat) => catCounts[cat] > 0)
      .map((cat) => ({
        label: cat,
        color: CATEGORY_COLOR[cat],
        pct: total ? round((catCounts[cat] / total) * 100, 1) : 0,
      }));
    let acc = 0;
    const stops = legend.map((item) => {
      const start = acc;
      acc += item.pct;
      return `${item.color} ${start}% ${acc}%`;
    });
    const pieGradient = `conic-gradient(${stops.join(", ")})`;

    const sortBy = state.sortBy;
    const sortIdx = { hours: 2, wo: 3, cost: 4 }[sortBy];
    const filteredAssets = (rc === "ALL" ? assetDowntime : assetDowntime.filter((r) => r[1] === rc))
      .slice()
      .sort((a, b) => b[sortIdx] - a[sortIdx]);
    const assetRows = filteredAssets.map((r, i) => ({
      rank: i + 1,
      asset: r[0],
      rc: r[1],
      hoursLabel: `${r[2]}h`,
      wo: r[3],
      costLabel: r[4] ? gbp(r[4]) : "£0",
    }));

    const rcOptions = [
      { value: "ALL", label: "All Repair Centers" },
      ...Object.keys(rcStats).filter((k) => k !== "ALL").sort().map((k) => ({ value: k, label: k })),
    ];

    return {
      kpi, rcOptions, selectedRC: rc,
      subtitle: `${rcLabel} · ${s.techs} technicians · Reactive + proactive labor report import`,
      chartTitle: "Daily Labor Hours — June 2026",
      linePoints, areaPoints, proBarPx, reBarPx,
      proHoursLabel: `${Math.round(proH).toLocaleString()}h`,
      reHoursLabel: `${Math.round(reH).toLocaleString()}h`,
      pieGradient, legend,
      totalLabel: `${total.toLocaleString()} work orders · ${rcLabel}`,
      assetRows, sortBy,
    };
  }

  function el(tag, className, text) {
    const e = document.createElement("div");
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function render() {
    const v = computeView();

    document.getElementById("subtitle").textContent = v.subtitle;

    const select = document.getElementById("rc-select");
    select.innerHTML = "";
    for (const opt of v.rcOptions) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === v.selectedRC) o.selected = true;
      select.appendChild(o);
    }

    const kpiGrid = document.getElementById("kpi-grid");
    kpiGrid.innerHTML = "";
    const kpiCards = [
      { label: "WORK ORDERS", value: v.kpi.wo, sub: v.kpi.closed, subGreen: true },
      { label: "LABOR HOURS", value: v.kpi.hours, sub: v.kpi.techs },
      { label: "PLANNED WORK", value: v.kpi.planned, sub: "of hours proactive", valueGreen: true },
      { label: "AVG HRS / WO", value: v.kpi.avg, unit: "hrs", sub: "labor hrs per WO" },
      { label: "OPEN BACKLOG", value: v.kpi.open, sub: "issued or on hold" },
      { label: "PARTS COST", value: v.kpi.cost, sub: "June actuals" },
    ];
    for (const c of kpiCards) {
      const card = el("div", "kpi-card");
      card.appendChild(el("div", "kpi-label", c.label));
      const valueEl = el("div", "kpi-value" + (c.valueGreen ? " kpi-value--green" : ""));
      valueEl.textContent = c.value;
      if (c.unit) {
        const unit = document.createElement("span");
        unit.className = "kpi-unit";
        unit.textContent = ` ${c.unit}`;
        valueEl.appendChild(unit);
      }
      card.appendChild(valueEl);
      card.appendChild(el("div", "kpi-sub" + (c.subGreen ? " kpi-sub--green" : ""), c.sub));
      kpiGrid.appendChild(card);
    }

    document.getElementById("chart-title").textContent = v.chartTitle;
    document.getElementById("line-poly").setAttribute("points", v.linePoints);
    document.getElementById("area-poly").setAttribute("points", v.areaPoints);

    document.getElementById("bar-pro").style.height = v.proBarPx;
    document.getElementById("bar-re").style.height = v.reBarPx;
    document.getElementById("bar-pro-label").textContent = v.proHoursLabel;
    document.getElementById("bar-re-label").textContent = v.reHoursLabel;

    document.getElementById("pie-rc-label").textContent = v.selectedRC;
    document.getElementById("pie").style.background = v.pieGradient;
    const legend = document.getElementById("legend");
    legend.innerHTML = "";
    for (const item of v.legend) {
      const row = el("div", "legend-item");
      const swatch = el("div", "legend-swatch");
      swatch.style.background = item.color;
      row.appendChild(swatch);
      row.appendChild(el("div", "legend-label", item.label));
      row.appendChild(el("div", "legend-pct", `${item.pct}%`));
      legend.appendChild(row);
    }
    document.getElementById("total-label").textContent = v.totalLabel;

    document.getElementById("table-title").textContent = `Most Reactive Downtime by Asset — Top ${v.assetRows.length}`;
    document.getElementById("table-rc-label").textContent = v.selectedRC;

    for (const key of ["hours", "wo", "cost"]) {
      const head = document.getElementById(`head-${key}`);
      const active = v.sortBy === key;
      head.classList.toggle("sortable--active", active);
      const labelMap = { hours: "HOURS", wo: "WORK ORDERS", cost: "PARTS COST" };
      head.textContent = labelMap[key] + (active ? " ↓" : "");
    }

    const body = document.getElementById("table-body");
    body.innerHTML = "";
    for (const row of v.assetRows) {
      const r = el("div", "table-row");
      r.appendChild(el("div", "cell-rank", String(row.rank)));
      r.appendChild(el("div", "", row.asset));
      r.appendChild(el("div", "cell-rc", row.rc));
      r.appendChild(el("div", "cell-hours", row.hoursLabel));
      r.appendChild(el("div", "cell-wo", String(row.wo)));
      r.appendChild(el("div", "cell-cost", row.costLabel));
      body.appendChild(r);
    }
  }

  function init() {
    document.getElementById("rc-select").addEventListener("change", (e) => {
      state.rc = e.target.value;
      render();
    });
    for (const key of ["hours", "wo", "cost"]) {
      document.getElementById(`head-${key}`).addEventListener("click", () => {
        state.sortBy = key;
        render();
      });
    }
  }

  fetch("data/dashboard-data.json")
    .then((r) => r.json())
    .then((data) => {
      DATA = data;
      init();
      render();
    });
})();
