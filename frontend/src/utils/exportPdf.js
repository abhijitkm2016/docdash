import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

try {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
} catch (e) {
  pdfMake.vfs = pdfFonts;
}

// ── SVG Chart Generator ─────────────────────────────────────────────────────

function generateBarChartSvg(data, width = 460, height = 160) {
  if (!data || data.length === 0) return null;

  const pL = 48, pR = 16, pT = 16, pB = 40;
  const chartW = width - pL - pR;
  const chartH = height - pT - pB;

  const values = data.map(d => Number(d.value || d.y || d.count || 0));
  const labels = data.map(d => String(d.name || d.label || d.x || ''));
  const maxVal = Math.max(...values, 1);
  const barGap = chartW / data.length;
  const barW   = Math.max(8, Math.floor(barGap * 0.6));

  const tickLines = Array.from({ length: 5 }, (_, i) => {
    const val = Math.round((maxVal / 4) * (4 - i));
    const y   = pT + (i / 4) * chartH;
    const lbl = val >= 1000000 ? `${(val/1000000).toFixed(1)}M`
              : val >= 1000    ? `${(val/1000).toFixed(0)}K`
              : String(val);
    return `
      <line x1="${pL}" y1="${y}" x2="${width - pR}" y2="${y}"
            stroke="#F1F5F9" stroke-width="1"/>
      <text x="${pL - 4}" y="${y + 4}" font-size="9" fill="#94A3B8"
            text-anchor="end" font-family="Helvetica">${lbl}</text>`;
  }).join('');

  const bars = values.map((val, i) => {
    const barH = Math.max(2, (val / maxVal) * chartH);
    const x    = pL + i * barGap + (barGap - barW) / 2;
    const y    = pT + chartH - barH;
    const lbl  = labels[i].length > 10 ? labels[i].substring(0, 9) + '…' : labels[i];
    const op   = (1 - (i / values.length) * 0.4).toFixed(2);
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}"
            fill="#2563EB" opacity="${op}" rx="2"/>
      <text x="${x + barW / 2}" y="${pT + chartH + 14}" font-size="8"
            fill="#64748B" text-anchor="middle" font-family="Helvetica">${lbl}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
              viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#FAFAFA" rx="4"/>
    ${tickLines}${bars}
    <line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pT + chartH}"
          stroke="#E2E8F0" stroke-width="1"/>
    <line x1="${pL}" y1="${pT + chartH}" x2="${width - pR}" y2="${pT + chartH}"
          stroke="#E2E8F0" stroke-width="1"/>
  </svg>`;
}

function generateLineChartSvg(data, width = 460, height = 160) {
  if (!data || data.length < 2) return generateBarChartSvg(data, width, height);

  const pL = 48, pR = 16, pT = 16, pB = 40;
  const chartW = width - pL - pR;
  const chartH = height - pT - pB;

  const values = data.map(d => Number(d.value || d.y || d.count || 0));
  const labels = data.map(d => String(d.name || d.label || d.x || ''));
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range  = maxVal - minVal || 1;

  const tickLines = Array.from({ length: 5 }, (_, i) => {
    const val = maxVal - (range / 4) * i;
    const y   = pT + (i / 4) * chartH;
    const lbl = val >= 1000000 ? `${(val/1000000).toFixed(1)}M`
              : val >= 1000    ? `${(val/1000).toFixed(0)}K`
              : Math.round(val).toString();
    return `
      <line x1="${pL}" y1="${y}" x2="${width - pR}" y2="${y}"
            stroke="#F1F5F9" stroke-width="1"/>
      <text x="${pL - 4}" y="${y + 4}" font-size="9" fill="#94A3B8"
            text-anchor="end" font-family="Helvetica">${lbl}</text>`;
  }).join('');

  const pts = values.map((val, i) => ({
    x: pL + (i / (values.length - 1)) * chartW,
    y: pT + ((maxVal - val) / range) * chartH,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length-1].x} ${pT + chartH} L ${pts[0].x} ${pT + chartH} Z`;
  const dots  = pts.map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#2563EB" stroke="#fff" stroke-width="1.5"/>`
  ).join('');
  const xLbls = labels.map((lbl, i) => {
    const x = pL + (i / (labels.length - 1)) * chartW;
    const s = lbl.length > 8 ? lbl.substring(0, 7) + '…' : lbl;
    return `<text x="${x}" y="${pT + chartH + 14}" font-size="8" fill="#64748B"
                  text-anchor="middle" font-family="Helvetica">${s}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
              viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#FAFAFA" rx="4"/>
    ${tickLines}
    <path d="${areaD}" fill="#2563EB" opacity="0.08"/>
    <path d="${pathD}" fill="none" stroke="#2563EB" stroke-width="2" stroke-linejoin="round"/>
    ${dots}${xLbls}
    <line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pT + chartH}"
          stroke="#E2E8F0" stroke-width="1"/>
    <line x1="${pL}" y1="${pT + chartH}" x2="${width - pR}" y2="${pT + chartH}"
          stroke="#E2E8F0" stroke-width="1"/>
  </svg>`;
}

function getChartSvg(chart) {
  if (!chart?.data || chart.data.length === 0) return null;
  return chart.type === 'line'
    ? generateLineChartSvg(chart.data)
    : generateBarChartSvg(chart.data);
}

// ── Section header helper ───────────────────────────────────────────────────

function sectionHeader(text) {
  return [
    {
      canvas: [{ type: 'rect', x: 0, y: 0, w: 495, h: 2, r: 1, color: '#2563EB' }],
      margin: [0, 28, 0, 0],
    },
    {
      text: text.toUpperCase(),
      fontSize: 9, bold: true,
      color: '#2563EB',
      margin: [0, 8, 0, 10],
    },
  ];
}

// ── Main export function ────────────────────────────────────────────────────

export function exportToPdf(dashboardData) {
  const {
    title     = 'Dashboard Report',
    standfirst = '',
    summary    = [],
    kpis       = [],
    charts     = [],
    narrative  = '',
    watchList  = [],
    metadata   = {},
  } = dashboardData;

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // KPI grid — 2 columns
  const kpiList = (kpis || []).slice(0, 6);
  const kpiRows = [];
  for (let i = 0; i < kpiList.length; i += 2) {
    function kpiCell(kpi) {
      if (!kpi) return {
        text: '',
        border: [true, true, true, true],
        borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
      };
      return {
        stack: [
          { text: kpi.label || '', fontSize: 8, bold: true, color: '#64748B', margin: [0, 0, 0, 4] },
          { text: String(kpi.value ?? ''), fontSize: 22, bold: true, color: '#1E293B', margin: [0, 0, 0, 4] },
          kpi.delta
            ? { text: kpi.delta, fontSize: 10, color: kpi.deltaPositive ? '#16A34A' : '#DC2626' }
            : { text: '' },
        ],
        fillColor: '#F8FAFC',
        margin: [14, 14, 14, 14],
        border: [true, true, true, true],
        borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
      };
    }
    kpiRows.push([kpiCell(kpiList[i]), kpiCell(kpiList[i + 1])]);
  }

  // Summary bullets
  const summaryItems = (summary || [])
    .map(s => typeof s === 'string' ? s : s?.point || s?.text || '')
    .filter(Boolean)
    .map(s => ({
      columns: [
        { canvas: [{ type: 'rect', x: 0, y: 3, w: 4, h: 4, r: 2, color: '#2563EB' }], width: 12 },
        { text: s, fontSize: 10.5, color: '#334155', lineHeight: 1.5 },
      ],
      margin: [0, 0, 0, 8],
    }));

  // Watch list — items have { type, text } shape from Claude schema
  const watchItems = (watchList || []).slice(0, 8).map(item => {
    const text = item?.text || item?.title || item?.label ||
                 (typeof item === 'string' ? item : '');
    return {
      text: `• ${text}`,
      fontSize: 10.5,
      color: '#334155',
      lineHeight: 1.5,
      margin: [0, 0, 0, 6],
    };
  });

  // Charts — SVG blocks, 2 per row
  const chartBlocks = (charts || []).slice(0, 4).map(chart => {
    const svg = getChartSvg(chart);
    if (!svg) return null;
    return {
      stack: [
        chart.title ? { text: chart.title, fontSize: 10, bold: true, color: '#334155', margin: [0, 0, 0, 6] } : null,
        { svg, width: 220, height: 130 },
      ].filter(Boolean),
      margin: [0, 0, 0, 16],
    };
  }).filter(Boolean);

  const chartRows = [];
  for (let i = 0; i < chartBlocks.length; i += 2) {
    chartRows.push({
      columns: [
        { stack: [chartBlocks[i]], width: '50%' },
        chartBlocks[i + 1]
          ? { stack: [chartBlocks[i + 1]], width: '50%' }
          : { text: '', width: '50%' },
      ],
      columnGap: 16,
      margin: [0, 0, 0, 8],
    });
  }

  const content = [
    // Cover accent bar
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 495, h: 5, r: 2, color: '#2563EB' }], margin: [0, 0, 0, 28] },

    // Title
    { text: title, fontSize: 26, bold: true, color: '#1E293B', margin: [0, 0, 0, 10], lineHeight: 1.2 },

    // Standfirst
    standfirst
      ? { text: standfirst, fontSize: 13, color: '#475569', margin: [0, 0, 0, 6], lineHeight: 1.4 }
      : null,

    // Meta line
    {
      columns: [
        { text: `Generated ${today}`, fontSize: 10, color: '#94A3B8' },
        metadata?.source
          ? { text: `Source: ${metadata.source}`, fontSize: 10, color: '#94A3B8', alignment: 'right' }
          : { text: '' },
      ],
    },

    // Executive Summary
    summaryItems.length > 0
      ? [...sectionHeader('Executive Summary'), ...summaryItems]
      : null,

    // Key Metrics
    kpiRows.length > 0
      ? [
          ...sectionHeader('Key Metrics'),
          {
            table: { widths: ['*', '*'], body: kpiRows },
            layout: {
              hLineWidth: () => 1, vLineWidth: () => 1,
              hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0',
              paddingLeft: () => 0, paddingRight: () => 0,
              paddingTop: () => 0, paddingBottom: () => 0,
            },
          },
        ]
      : null,

    // Charts
    chartRows.length > 0
      ? [...sectionHeader('Data Visualisation'), ...chartRows]
      : null,

    // Analysis
    narrative
      ? [...sectionHeader('Analysis'), { text: narrative, fontSize: 10.5, color: '#334155', lineHeight: 1.6 }]
      : null,

    // Watch List
    watchItems.length > 0
      ? [...sectionHeader('Executive Watch List'), ...watchItems]
      : null,

    // Footer rule + disclaimer
    { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 495, y2: 10, lineWidth: 1, lineColor: '#E2E8F0' }], margin: [0, 20, 0, 0] },
    {
      text: 'This report was auto-generated by DocDash using AI-powered analysis. ' +
            'Verify all figures against source data before use in formal reporting.',
      fontSize: 8.5, color: '#94A3B8', margin: [0, 8, 0, 0], lineHeight: 1.4,
    },
  ].flat().filter(Boolean);

  const safeTitle = (title || 'dashboard')
    .replace(/[^a-z0-9]/gi, '-').toLowerCase()
    .replace(/-+/g, '-').substring(0, 60);

  pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [52, 60, 52, 56],

    header: (currentPage) => currentPage === 1 ? {} : {
      columns: [
        { text: title, fontSize: 8, color: '#94A3B8', margin: [52, 20, 0, 0] },
        { text: `Page ${currentPage}`, fontSize: 8, color: '#94A3B8', alignment: 'right', margin: [0, 20, 52, 0] },
      ],
    },

    footer: {
      columns: [
        { text: 'DocDash · AI-Powered Document Intelligence · docdash-dusky.vercel.app', fontSize: 8, color: '#CBD5E1', margin: [52, 0, 0, 0] },
        { text: today, fontSize: 8, color: '#CBD5E1', alignment: 'right', margin: [0, 0, 52, 0] },
      ],
    },

    content,
  }).download(`${safeTitle}-report.pdf`);
}
