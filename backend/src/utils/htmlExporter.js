function buildStandaloneHtml(data) {
  // Escape </script> so the injected JSON can't close the script tag early.
  const dataJson = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.title || 'DocDash Dashboard')}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; color: #f8fafc; }
    .subtitle { color: #94a3b8; font-size: 0.875rem; margin-bottom: 2rem; }
    .section-title { font-size: 1rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
    /* KPIs */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .kpi-card { background: #1e293b; border-radius: 0.75rem; padding: 1.25rem; border: 1px solid #334155; }
    .kpi-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .kpi-value { font-size: 1.5rem; font-weight: 700; color: #f8fafc; }
    .kpi-unit { font-size: 0.875rem; color: #94a3b8; margin-left: 0.25rem; }
    .trend-up { color: #34d399; }
    .trend-down { color: #f87171; }
    /* Summary */
    .summary-list { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; }
    .summary-list li { background: #1e293b; border-left: 3px solid #6366f1; border-radius: 0 0.5rem 0.5rem 0; padding: 0.75rem 1rem; font-size: 0.9375rem; color: #cbd5e1; }
    /* Charts */
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .chart-card { background: #1e293b; border-radius: 0.75rem; padding: 1.25rem; border: 1px solid #334155; cursor: pointer; transition: border-color 0.2s; }
    .chart-card:hover { border-color: #6366f1; }
    .chart-card.active { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.3); }
    .chart-title { font-size: 0.875rem; font-weight: 600; color: #cbd5e1; margin-bottom: 1rem; }
    .chart-canvas-wrap { position: relative; height: 220px; }
    .filter-badge { display: inline-block; background: #6366f1; color: white; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 9999px; margin-left: 0.5rem; }
    /* Table */
    .table-wrap { background: #1e293b; border-radius: 0.75rem; border: 1px solid #334155; overflow: hidden; margin-bottom: 2rem; }
    .table-controls { padding: 1rem; border-bottom: 1px solid #334155; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .search-input { background: #0f172a; border: 1px solid #334155; border-radius: 0.5rem; color: #e2e8f0; padding: 0.5rem 0.75rem; font-size: 0.875rem; flex: 1; min-width: 200px; }
    .search-input:focus { outline: none; border-color: #6366f1; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { background: #0f172a; color: #94a3b8; text-align: left; padding: 0.75rem 1rem; font-weight: 600; cursor: pointer; user-select: none; white-space: nowrap; border-bottom: 1px solid #334155; }
    th:hover { color: #e2e8f0; }
    th .sort-icon { margin-left: 0.25rem; opacity: 0.5; }
    th.sorted .sort-icon { opacity: 1; color: #6366f1; }
    td { padding: 0.625rem 1rem; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #263348; }
    .table-footer { padding: 0.75rem 1rem; color: #64748b; font-size: 0.8125rem; border-top: 1px solid #334155; }
    /* Narrative */
    .narrative { background: #1e293b; border-radius: 0.75rem; border: 1px solid #334155; padding: 1.5rem; margin-bottom: 2rem; }
    .narrative p { color: #cbd5e1; line-height: 1.75; margin-bottom: 1rem; font-size: 0.9375rem; }
    .narrative p:last-child { margin-bottom: 0; }
    /* Filter reset */
    .filter-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .reset-btn { background: #334155; border: none; color: #cbd5e1; padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.8125rem; cursor: pointer; }
    .reset-btn:hover { background: #475569; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const DATA = ${dataJson};

    // ── Filter state ──────────────────────────────────────────────────
    let activeFilter = null; // { chartId, value }

    function matchesFilter(row) {
      if (!activeFilter) return true;
      const chart = DATA.charts.find(c => c.id === activeFilter.chartId);
      if (!chart) return true;
      const colIdx = DATA.tableData.columns.indexOf(chart.dataKey);
      if (colIdx === -1) return true;
      return String(row[colIdx]) === String(activeFilter.value);
    }

    // ── Render helpers ────────────────────────────────────────────────
    function el(tag, attrs = {}, ...children) {
      const e = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') e.className = v;
        else if (k === 'onclick') e.onclick = v;
        else if (k === 'style') Object.assign(e.style, v);
        else e.setAttribute(k, v);
      });
      children.forEach(c => {
        if (c == null) return;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
      return e;
    }

    // ── KPIs ──────────────────────────────────────────────────────────
    function renderKpis() {
      const grid = el('div', { className: 'kpi-grid' });
      (DATA.kpis || []).forEach(kpi => {
        const trendClass = kpi.trend === 'up' ? 'trend-up' : kpi.trend === 'down' ? 'trend-down' : '';
        const trendIcon = kpi.trend === 'up' ? ' ↑' : kpi.trend === 'down' ? ' ↓' : '';
        grid.appendChild(el('div', { className: 'kpi-card' },
          el('div', { className: 'kpi-label' }, kpi.label),
          el('div', { className: 'kpi-value ' + trendClass },
            String(kpi.value),
            kpi.unit ? el('span', { className: 'kpi-unit' }, kpi.unit) : null,
            trendIcon ? el('span', {}, trendIcon) : null
          )
        ));
      });
      return grid;
    }

    // ── Charts ────────────────────────────────────────────────────────
    const chartInstances = {};

    function buildChartConfig(chart) {
      const labels = chart.data.map(d => d[chart.dataKey]);
      const values = chart.data.map(d => d[chart.valueKey]);
      const palette = ['#6366f1','#34d399','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c'];

      if (chart.type === 'pie') {
        return {
          type: 'pie',
          data: { labels, datasets: [{ data: values, backgroundColor: palette, borderColor: '#1e293b', borderWidth: 2 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } } }
        };
      }
      return {
        type: chart.type,
        data: { labels, datasets: [{ label: chart.valueKey, data: values, backgroundColor: 'rgba(99,102,241,0.7)', borderColor: '#6366f1', borderWidth: 2, fill: chart.type === 'line', tension: 0.4, pointRadius: 3 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#64748b' }, grid: { color: '#334155' } } },
          plugins: { legend: { display: false } }
        }
      };
    }

    function renderCharts() {
      const grid = el('div', { className: 'charts-grid' });
      (DATA.charts || []).forEach(chart => {
        const wrap = el('div', { className: 'chart-canvas-wrap' });
        const canvas = el('canvas');
        wrap.appendChild(canvas);

        const isActive = activeFilter && activeFilter.chartId === chart.id;
        const filterBadge = isActive ? el('span', { className: 'filter-badge' }, activeFilter.value) : null;

        const card = el('div', { className: 'chart-card' + (isActive ? ' active' : ''), onclick: () => handleChartClick(chart) },
          el('div', { className: 'chart-title' }, chart.title, filterBadge),
          wrap
        );
        grid.appendChild(card);

        const cfg = buildChartConfig(chart);
        cfg.options = cfg.options || {};
        cfg.options.onClick = (_e, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const value = chart.data[idx][chart.dataKey];
            handleChartClick(chart, value);
          }
        };
        chartInstances[chart.id] = new Chart(canvas, cfg);
      });
      return grid;
    }

    function handleChartClick(chart, value) {
      if (activeFilter && activeFilter.chartId === chart.id && activeFilter.value === value) {
        activeFilter = null;
      } else if (value !== undefined) {
        activeFilter = { chartId: chart.id, value };
      } else {
        activeFilter = null;
      }
      rerender();
    }

    // ── Table ─────────────────────────────────────────────────────────
    let tableSearch = '';
    let sortCol = -1;
    let sortDir = 1;

    function renderTable() {
      const cols = (DATA.tableData && DATA.tableData.columns) || [];
      const allRows = (DATA.tableData && DATA.tableData.rows) || [];

      const filtered = allRows.filter(row => {
        if (!matchesFilter(row)) return false;
        if (!tableSearch) return true;
        return row.some(cell => String(cell).toLowerCase().includes(tableSearch.toLowerCase()));
      });

      const sorted = sortCol >= 0 ? [...filtered].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        const an = Number(av), bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      }) : filtered;

      const wrap = el('div', { className: 'table-wrap' });

      // Search bar
      const searchInput = el('input', { className: 'search-input', type: 'text', placeholder: 'Search table…' });
      searchInput.value = tableSearch;
      searchInput.oninput = (e) => { tableSearch = e.target.value; rerender(); };
      wrap.appendChild(el('div', { className: 'table-controls' }, searchInput));

      // Table
      const thead = el('thead');
      const headerRow = el('tr');
      cols.forEach((col, i) => {
        const isSorted = sortCol === i;
        const th = el('th', { className: isSorted ? 'sorted' : '' }, col, el('span', { className: 'sort-icon' }, isSorted ? (sortDir === 1 ? ' ↑' : ' ↓') : ' ↕'));
        th.onclick = () => { if (sortCol === i) { sortDir *= -1; } else { sortCol = i; sortDir = 1; } rerender(); };
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      const tbody = el('tbody');
      sorted.slice(0, 100).forEach(row => {
        const tr = el('tr');
        cols.forEach((_, i) => tr.appendChild(el('td', {}, String(row[i] ?? ''))));
        tbody.appendChild(tr);
      });

      const table = el('table');
      table.appendChild(thead);
      table.appendChild(tbody);
      const scroll = el('div', { className: 'table-scroll' });
      scroll.appendChild(table);
      wrap.appendChild(scroll);
      wrap.appendChild(el('div', { className: 'table-footer' }, \`Showing \${Math.min(sorted.length, 100)} of \${sorted.length} rows\${allRows.length !== sorted.length ? ' (filtered)' : ''}\`));

      return wrap;
    }

    // ── Narrative ─────────────────────────────────────────────────────
    function renderNarrative() {
      const box = el('div', { className: 'narrative' });
      const paragraphs = (DATA.narrative || '').split(/\\n\\n+/);
      paragraphs.forEach(p => { if (p.trim()) box.appendChild(el('p', {}, p.trim())); });
      return box;
    }

    // ── Main render ───────────────────────────────────────────────────
    function rerender() {
      const app = document.getElementById('app');
      app.innerHTML = '';

      app.appendChild(el('h1', {}, DATA.title || 'Dashboard'));
      app.appendChild(el('p', { className: 'subtitle' }, 'Generated by DocDash'));

      // Filter bar
      if (activeFilter) {
        const bar = el('div', { className: 'filter-bar' });
        bar.appendChild(el('span', { style: { color: '#94a3b8', fontSize: '0.875rem' } }, 'Active filter:'));
        bar.appendChild(el('span', { className: 'filter-badge' }, activeFilter.value));
        const resetBtn = el('button', { className: 'reset-btn', onclick: () => { activeFilter = null; rerender(); } }, '✕ Clear filter');
        bar.appendChild(resetBtn);
        app.appendChild(bar);
      }

      if ((DATA.summary || []).length > 0) {
        app.appendChild(el('p', { className: 'section-title' }, 'Executive Summary'));
        const ul = el('ul', { className: 'summary-list' });
        DATA.summary.forEach(s => ul.appendChild(el('li', {}, s)));
        app.appendChild(ul);
      }

      if ((DATA.kpis || []).length > 0) {
        app.appendChild(el('p', { className: 'section-title' }, 'Key Metrics'));
        app.appendChild(renderKpis());
      }

      if ((DATA.charts || []).length > 0) {
        app.appendChild(el('p', { className: 'section-title' }, 'Charts'));
        app.appendChild(renderCharts());
      }

      if (DATA.tableData && (DATA.tableData.rows || []).length > 0) {
        app.appendChild(el('p', { className: 'section-title' }, 'Data Table'));
        app.appendChild(renderTable());
      }

      if (DATA.narrative) {
        app.appendChild(el('p', { className: 'section-title' }, 'Analysis'));
        app.appendChild(renderNarrative());
      }
    }

    rerender();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { buildStandaloneHtml };
