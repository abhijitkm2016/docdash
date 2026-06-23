import PptxGenJS from 'pptxgenjs';

export function exportToPpt(dashboardData) {
  const {
    title = 'Dashboard Report',
    standfirst = '',
    summary = [],
    kpis = [],
    charts = [],
    narrative = '',
    watchList = [],
  } = dashboardData;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9

  const BLUE      = '2563EB';
  const DARK      = '1E293B';
  const SLATE     = '475569';
  const LIGHT_BG  = 'F8FAFC';
  const BORDER    = 'E2E8F0';

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  function addFooter(slide) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.4, y: 6.85, w: 12.5, h: 0,
      line: { color: BORDER, width: 0.5 },
    });
    slide.addText('DocDash · AI-Powered Document Analysis', {
      x: 0.4, y: 6.9, w: 8, h: 0.3,
      fontSize: 8, color: '94A3B8',
    });
    slide.addText(today, {
      x: 8.6, y: 6.9, w: 4, h: 0.3,
      fontSize: 8, color: '94A3B8', align: 'right',
    });
  }

  // ── SLIDE 1: Title ──────────────────────────────────────────────
  const slide1 = pptx.addSlide();
  slide1.background = { color: LIGHT_BG };

  slide1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: 7.5,
    fill: { color: BLUE },
    line: { color: BLUE },
  });

  slide1.addText(title, {
    x: 0.5, y: 2.2, w: 12, h: 1.2,
    fontSize: 36, bold: true, color: DARK, fontFace: 'Calibri',
  });

  if (standfirst) {
    slide1.addText(standfirst, {
      x: 0.5, y: 3.6, w: 11, h: 0.8,
      fontSize: 16, color: SLATE, fontFace: 'Calibri',
    });
  }

  slide1.addText(`Generated ${today} · DocDash`, {
    x: 0.5, y: 6.4, w: 8, h: 0.4,
    fontSize: 11, color: '94A3B8',
  });

  // ── SLIDE 2: Executive Summary ─────────────────────────────────
  const slide2 = pptx.addSlide();
  slide2.background = { color: 'FFFFFF' };

  slide2.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.08,
    fill: { color: BLUE }, line: { color: BLUE },
  });

  slide2.addText('Executive Summary', {
    x: 0.4, y: 0.3, w: 12, h: 0.6,
    fontSize: 22, bold: true, color: DARK,
  });

  const summaryText = (summary || [])
    .map(s => typeof s === 'string' ? s : s?.point || s?.text || '')
    .filter(Boolean)
    .map(s => ({ text: `${s}\n`, options: { fontSize: 13, color: SLATE, bullet: { code: '2022' } } }));

  if (summaryText.length > 0) {
    slide2.addText(summaryText, {
      x: 0.4, y: 1.1, w: 12.2, h: 5.4,
      fontFace: 'Calibri', paraSpaceAfter: 6,
    });
  }

  addFooter(slide2);

  // ── SLIDE 3: Key Metrics ───────────────────────────────────────
  const slide3 = pptx.addSlide();
  slide3.background = { color: 'FFFFFF' };

  slide3.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.08,
    fill: { color: BLUE }, line: { color: BLUE },
  });

  slide3.addText('Key Metrics', {
    x: 0.4, y: 0.3, w: 12, h: 0.6,
    fontSize: 22, bold: true, color: DARK,
  });

  const displayKpis = (kpis || []).slice(0, 5);
  const cardW   = displayKpis.length > 0 ? Math.min(2.4, 12.5 / displayKpis.length) : 2.4;
  const cardGap = 0.2;
  const startX  = (13.33 - (displayKpis.length * (cardW + cardGap) - cardGap)) / 2;

  displayKpis.forEach((kpi, i) => {
    const x = startX + i * (cardW + cardGap);
    const y = 1.4;

    slide3.addShape(pptx.ShapeType.rect, {
      x, y, w: cardW, h: 2.4,
      fill: { color: 'F8FAFC' },
      line: { color: BORDER, width: 0.5 },
    });

    slide3.addText(String(kpi.value ?? ''), {
      x: x + 0.15, y: y + 0.4, w: cardW - 0.3, h: 0.9,
      fontSize: 28, bold: true, color: DARK, align: 'center',
    });

    slide3.addText(kpi.label || '', {
      x: x + 0.1, y: y + 1.35, w: cardW - 0.2, h: 0.5,
      fontSize: 11, color: SLATE, align: 'center',
    });

    if (kpi.delta) {
      slide3.addText(kpi.delta, {
        x: x + 0.1, y: y + 1.85, w: cardW - 0.2, h: 0.35,
        fontSize: 10, align: 'center',
        color: kpi.deltaPositive ? '16A34A' : 'DC2626',
      });
    }
  });

  addFooter(slide3);

  // ── SLIDE 4: Charts ────────────────────────────────────────────
  const slide4 = pptx.addSlide();
  slide4.background = { color: 'FFFFFF' };

  slide4.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.08,
    fill: { color: BLUE }, line: { color: BLUE },
  });

  slide4.addText('Data Overview', {
    x: 0.4, y: 0.3, w: 12, h: 0.6,
    fontSize: 22, bold: true, color: DARK,
  });

  const displayCharts = (charts || []).slice(0, 2);

  displayCharts.forEach((chart, i) => {
    const x = i === 0 ? 0.4 : 6.9;
    const w = displayCharts.length === 1 ? 12.2 : 5.9;

    if (!chart?.data || chart.data.length === 0) return;

    // DocDash charts use dataKey/valueKey — get actual field names from the chart definition
    const dk = chart.dataKey || 'name';
    const vk = chart.valueKey || 'value';

    const labels = chart.data.map(d => String(d[dk] || d.name || d.label || d.x || ''));
    const values = chart.data.map(d => Number(d[vk] || d.value || d.y || d.count || 0));

    const chartData = [{ name: chart.title || 'Value', labels, values }];

    const chartType = chart.type === 'line'
      ? pptx.ChartType.line
      : pptx.ChartType.bar;

    slide4.addChart(chartType, chartData, {
      x, y: 1.1, w, h: 5.4,
      chartColors: ['2563EB', '3B82F6', '60A5FA', '93C5FD', 'BFDBFE'],
      showLegend: false,
      showTitle: true,
      title: chart.title || '',
      titleFontSize: 12,
      titleColor: DARK,
      valAxisLabelFontSize: 9,
      catAxisLabelFontSize: 9,
      dataLabelFontSize: 9,
      barDir: chart.type === 'bar-horizontal' ? 'bar' : 'col',
    });
  });

  if (displayCharts.length === 0) {
    slide4.addText('Chart data not available for this document.', {
      x: 0.4, y: 3.2, w: 12.2, h: 0.6,
      fontSize: 13, color: SLATE, align: 'center',
    });
  }

  addFooter(slide4);

  // ── SLIDE 5: Analysis + Watch List ─────────────────────────────
  const slide5 = pptx.addSlide();
  slide5.background = { color: 'FFFFFF' };

  slide5.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.08,
    fill: { color: BLUE }, line: { color: BLUE },
  });

  slide5.addText('Analysis & Watch List', {
    x: 0.4, y: 0.3, w: 12, h: 0.6,
    fontSize: 22, bold: true, color: DARK,
  });

  const narrativeShort = (narrative || '').substring(0, 600) +
    (narrative?.length > 600 ? '…' : '');

  slide5.addText('Analysis', {
    x: 0.4, y: 1.1, w: 7.2, h: 0.4,
    fontSize: 13, bold: true, color: BLUE,
  });

  if (narrativeShort) {
    slide5.addText(narrativeShort, {
      x: 0.4, y: 1.6, w: 7.2, h: 4.8,
      fontSize: 10.5, color: SLATE, fontFace: 'Calibri',
      paraSpaceAfter: 4, valign: 'top',
    });
  }

  slide5.addShape(pptx.ShapeType.line, {
    x: 7.85, y: 1.1, w: 0, h: 5.3,
    line: { color: BORDER, width: 0.5 },
  });

  slide5.addText('Watch List', {
    x: 8.0, y: 1.1, w: 4.9, h: 0.4,
    fontSize: 13, bold: true, color: BLUE,
  });

  // watchList items are { type, text } in DocDash Claude schema
  const watchItems = (watchList || []).slice(0, 6);
  if (watchItems.length > 0) {
    const watchText = watchItems.map(item => ({
      text: `${item?.text || item?.title || item?.label || String(item)}\n`,
      options: {
        fontSize: 10.5,
        color: DARK,
        bold: false,
        bullet: { code: '25CF', color: BLUE },
        paraSpaceAfter: 4,
      },
    }));

    slide5.addText(watchText, {
      x: 8.0, y: 1.6, w: 4.9, h: 4.8,
      fontFace: 'Calibri', valign: 'top',
    });
  }

  addFooter(slide5);

  const safeTitle = (title || 'dashboard').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  pptx.writeFile({ fileName: `${safeTitle}-deck.pptx` });
}
