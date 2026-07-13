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

  const TYPE_LABEL = {
    "U/B": "Unplanned Breakdown", OSRE: "OSR Engineering", TECH: "Technical",
    ITRE: "IT Reactive", MO: "Manual Override",
  };
  const TYPE_COLOR = {
    "U/B": "#f87171", OSRE: "#3ba7ff", TECH: "#8b5cf6", ITRE: "#34d399", MO: "#f59e0b",
  };

  const state = {
    page: "dashboard",
    rc: "ALL", sortBy: "hours",
    worstRC: "ALL", worstSort: "cost",
  };
  let DATA = null;

  const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  const gbp = (n) => `£${Math.round(n).toLocaleString()}`;
  const gbp2 = (n) => `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function computeDashboardView() {
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

  function computeWorstView() {
    const worst = DATA.worst;
    const wrc = state.worstRC;
    const W = worst.byRC[wrc] || worst.byRC.ALL;
    const ws = state.worstSort;
    const sortIdx = { cost: 2, wo: 3 }[ws];
    const worstRows = W.top.slice().sort((a, b) => b[sortIdx] - a[sortIdx]).map((r, i) => ({
      rank: i + 1,
      asset: r[0],
      rc: r[1],
      costLabel: gbp2(r[2]),
      wo: r[3],
      type: r[4],
    }));

    const byCost = W.top.slice().sort((a, b) => b[2] - a[2]).slice(0, 12);
    const maxCost = Math.max(...byCost.map((r) => r[2]), 1);
    const worstBars = byCost.map((r) => ({
      asset: r[0],
      costLabel: gbp(r[2]),
      barPct: `${round((r[2] / maxCost) * 100, 1)}%`,
    }));

    const maxRC = Math.max(...worst.rcRank.map((r) => r[1]), 1);
    const rcBars = worst.rcRank.map((r) => ({
      rc: r[0],
      costLabel: gbp(r[1]),
      barPct: `${round((r[1] / maxRC) * 100, 1)}%`,
      barColor: (wrc !== "ALL" && r[0] === wrc) ? "#f59e0b" : "#3ba7ff",
    }));

    const totalT = Object.values(W.typeDist).reduce((a, b) => a + b, 0);
    const typeOrder = Object.entries(W.typeDist).sort((a, b) => b[1] - a[1]);
    let accT = 0;
    const typeStops = typeOrder.map(([t, c]) => {
      const start = accT;
      accT += totalT ? (c / totalT) * 100 : 0;
      return `${TYPE_COLOR[t] || "#6b7280"} ${start}% ${accT}%`;
    });
    const typeGradient = `conic-gradient(${typeStops.join(", ")})`;
    const typeLegend = typeOrder.map(([t, c]) => ({
      label: TYPE_LABEL[t] || t,
      color: TYPE_COLOR[t] || "#6b7280",
      pct: totalT ? round((c / totalT) * 100, 1) : 0,
    }));

    const wrcOptions = [
      { value: "ALL", label: "All Repair Centers" },
      ...Object.keys(worst.byRC).filter((k) => k !== "ALL").sort().map((k) => ({ value: k, label: k })),
    ];
    const wrcLabel = wrc === "ALL" ? "All Repair Centers" : wrc;

    return {
      selectedWorstRC: wrc,
      wrcOptions,
      worstSubtitle: `${wrcLabel} · Reactive breakdown spend · 01 Apr 2026 – 30 Jun 2026 · RF-Strapper TECH work orders excluded`,
      worstRows, worstBars, rcBars, typeGradient, typeLegend,
      wTotalCost: gbp(W.totals.cost),
      wTotalWO: W.totals.wo.toLocaleString(),
      wTotalAssets: W.totals.assets.toLocaleString(),
      wTotalLabor: gbp(W.totals.labor),
      worstSort: ws,
      worstCount: worstRows.length,
    };
  }

  function el(tag, className, text) {
    const e = document.createElement("div");
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderDashboard() {
    const v = computeDashboardView();

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

  function renderWorst() {
    const v = computeWorstView();

    document.getElementById("worst-subtitle").textContent = v.worstSubtitle;

    const select = document.getElementById("worst-rc-select");
    select.innerHTML = "";
    for (const opt of v.wrcOptions) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === v.selectedWorstRC) o.selected = true;
      select.appendChild(o);
    }

    const kpiGrid = document.getElementById("worst-kpi-grid");
    kpiGrid.innerHTML = "";
    const kpiCards = [
      { label: "TOTAL REACTIVE COST", value: v.wTotalCost, sub: "across all assets" },
      { label: "WORK ORDERS", value: v.wTotalWO, sub: "reactive WOs in quarter" },
      { label: "ASSETS AFFECTED", value: v.wTotalAssets, sub: "distinct assets" },
      { label: "LABOR COST", value: v.wTotalLabor, sub: "of total actuals" },
    ];
    for (const c of kpiCards) {
      const card = el("div", "kpi-card");
      card.appendChild(el("div", "kpi-label", c.label));
      card.appendChild(el("div", "kpi-value", c.value));
      card.appendChild(el("div", "kpi-sub", c.sub));
      kpiGrid.appendChild(card);
    }

    const bars = document.getElementById("worst-bars");
    bars.innerHTML = "";
    for (const bar of v.worstBars) {
      const row = el("div", "hbar-row");
      row.appendChild(el("div", "hbar-name", bar.asset));
      const track = el("div", "hbar-track");
      const fill = el("div", "hbar-fill");
      fill.style.width = bar.barPct;
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el("div", "hbar-cost", bar.costLabel));
      bars.appendChild(row);
    }

    document.getElementById("type-pie").style.background = v.typeGradient;
    const typeLegend = document.getElementById("type-legend");
    typeLegend.innerHTML = "";
    for (const item of v.typeLegend) {
      const row = el("div", "legend-item");
      const swatch = el("div", "legend-swatch");
      swatch.style.background = item.color;
      row.appendChild(swatch);
      row.appendChild(el("div", "legend-label", item.label));
      row.appendChild(el("div", "legend-pct", `${item.pct}%`));
      typeLegend.appendChild(row);
    }

    const rcBars = document.getElementById("rc-bars");
    rcBars.innerHTML = "";
    for (const bar of v.rcBars) {
      const row = el("div", "rc-bar-row");
      row.appendChild(el("div", "rc-bar-code", bar.rc));
      const track = el("div", "rc-bar-track");
      const fill = el("div", "rc-bar-fill");
      fill.style.width = bar.barPct;
      fill.style.background = bar.barColor;
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el("div", "rc-bar-cost", bar.costLabel));
      rcBars.appendChild(row);
    }

    document.getElementById("worst-table-title").textContent = `Worst Assets — Top ${v.worstCount} by Cost`;

    for (const key of ["wo", "cost"]) {
      const head = document.getElementById(`whead-${key}`);
      const active = v.worstSort === key;
      head.classList.toggle("sortable--active", active);
      const labelMap = { wo: "WORK ORDERS", cost: "TOTAL COST" };
      head.textContent = labelMap[key] + (active ? " ↓" : "");
    }

    const body = document.getElementById("worst-table-body");
    body.innerHTML = "";
    for (const row of v.worstRows) {
      const r = el("div", "table-row table-row--worst");
      r.appendChild(el("div", "cell-rank", String(row.rank)));
      r.appendChild(el("div", "", row.asset));
      r.appendChild(el("div", "cell-rc", row.rc));
      r.appendChild(el("div", "cell-type", row.type));
      r.appendChild(el("div", "cell-wo", String(row.wo)));
      r.appendChild(el("div", "cell-cost", row.costLabel));
      body.appendChild(r);
    }
  }

  function renderNav() {
    for (const item of document.querySelectorAll(".nav-item[data-page]")) {
      const active = item.dataset.page === state.page;
      item.classList.toggle("nav-item--active", active);
      item.querySelector(".nav-dot").classList.toggle("nav-dot--active", active);
    }
    document.getElementById("page-dashboard").hidden = state.page !== "dashboard";
    document.getElementById("page-worst").hidden = state.page !== "worst";
  }

  function render() {
    renderNav();
    if (state.page === "worst") {
      renderWorst();
    } else {
      renderDashboard();
    }
  }

  function init() {
    for (const item of document.querySelectorAll(".nav-item[data-page]")) {
      item.addEventListener("click", () => {
        state.page = item.dataset.page;
        render();
      });
    }

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

    document.getElementById("worst-rc-select").addEventListener("change", (e) => {
      state.worstRC = e.target.value;
      render();
    });
    for (const key of ["wo", "cost"]) {
      document.getElementById(`whead-${key}`).addEventListener("click", () => {
        state.worstSort = key;
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
