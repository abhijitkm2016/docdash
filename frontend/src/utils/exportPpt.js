import PptxGenJS from 'pptxgenjs';

export function exportToPpt(dashboardData) {
  const {
    title      = 'Dashboard Report',
    standfirst = '',
    summary    = [],
    kpis       = [],
    charts     = [],
    narrative  = '',
    watchList  = [],
  } = dashboardData;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // ── Design tokens ────────────────────────────────────────────────────────────
  const C = {
    blue:      '2563EB',
    blueDark:  '1D4ED8',
    blueLight: 'EFF6FF',
    navy:      '0F172A',
    dark:      '1E293B',
    slate:     '475569',
    muted:     '64748B',
    subtle:    '94A3B8',
    border:    'E2E8F0',
    surface:   'F8FAFC',
    white:     'FFFFFF',
    green:     '16A34A',
    red:       'DC2626',
  };
  const FONT = 'Calibri';

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function addSlideHeader(slide, slideTitle) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.07,
      fill: { color: C.blue }, line: { color: C.blue },
    });
    slide.addText(slideTitle, {
      x: 0.45, y: 0.22, w: 12.4, h: 0.55,
      fontSize: 20, bold: true, color: C.dark, fontFace: FONT,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.45, y: 0.82, w: 12.43, h: 0,
      line: { color: C.border, width: 0.75 },
    });
  }

  function addFooter(slide) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.45, y: 7.05, w: 12.43, h: 0,
      line: { color: C.border, width: 0.5 },
    });
    slide.addText('DocDash · AI-Powered Document Intelligence', {
      x: 0.45, y: 7.12, w: 7, h: 0.28,
      fontSize: 7.5, color: C.subtle, fontFace: FONT,
    });
    slide.addText(today, {
      x: 7.5, y: 7.12, w: 5.38, h: 0.28,
      fontSize: 7.5, color: C.subtle, fontFace: FONT, align: 'right',
    });
  }

  // ── SLIDE 1: Title ───────────────────────────────────────────────────────────
  const s1 = pptx.addSlide();
  s1.background = { color: C.navy };

  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: 7.5,
    fill: { color: C.blue }, line: { color: C.blue },
  });

  s1.addText('DOCDASH', {
    x: 10.5, y: 0.28, w: 2.6, h: 0.3,
    fontSize: 9, color: C.blue, fontFace: FONT,
    bold: true, align: 'right', charSpacing: 3,
  });

  s1.addText(title, {
    x: 0.55, y: 2.0, w: 11.8, h: 2.0,
    fontSize: 34, bold: true, color: C.white,
    fontFace: FONT, lineSpacingMultiple: 1.1,
  });

  if (standfirst) {
    s1.addText(standfirst, {
      x: 0.55, y: 4.1, w: 10, h: 0.9,
      fontSize: 15, color: 'CBD5E1',
      fontFace: FONT, lineSpacingMultiple: 1.3,
    });
  }

  s1.addShape(pptx.ShapeType.line, {
    x: 0.55, y: 6.3, w: 5, h: 0,
    line: { color: C.blue, width: 1.5 },
  });
  s1.addText(`Generated ${today}`, {
    x: 0.55, y: 6.55, w: 8, h: 0.35,
    fontSize: 10, color: C.subtle, fontFace: FONT,
  });

  // ── SLIDE 2: Executive Summary ───────────────────────────────────────────────
  const s2 = pptx.addSlide();
  s2.background = { color: C.white };
  addSlideHeader(s2, 'Executive Summary');

  const summaryPoints = (summary || [])
    .map(s => typeof s === 'string' ? s : s?.point || s?.text || '')
    .filter(Boolean)
    .slice(0, 6);

  if (summaryPoints.length > 0) {
    const summaryRows = summaryPoints.map((point, i) => [
      {
        text: String(i + 1).padStart(2, '0'),
        options: {
          fontSize: 11, bold: true, color: C.blue,
          fontFace: FONT, align: 'center', valign: 'middle',
          fill: i % 2 === 0 ? C.surface : C.white,
          border: [
            { color: C.border, pt: 0.5 }, { color: C.border, pt: 0.5 },
            { color: C.border, pt: 0.5 }, { color: C.border, pt: 0.5 },
          ],
        },
      },
      {
        text: point,
        options: {
          fontSize: 12, color: C.dark,
          fontFace: FONT, valign: 'middle',
          fill: i % 2 === 0 ? C.surface : C.white,
          border: [
            { color: C.border, pt: 0.5 }, { color: C.border, pt: 0.5 },
            { color: C.border, pt: 0.5 }, { color: C.border, pt: 0.5 },
          ],
        },
      },
    ]);

    s2.addTable(summaryRows, {
      x: 0.45, y: 1.0, w: 12.43,
      rowH: 0.82, colW: [0.6, 11.83], fontFace: FONT,
    });
  } else {
    s2.addText('No summary available for this document.', {
      x: 0.45, y: 3.5, w: 12.43, h: 0.5,
      fontSize: 13, color: C.muted, fontFace: FONT, align: 'center',
    });
  }

  addFooter(s2);

  // ── SLIDE 3: Key Metrics ─────────────────────────────────────────────────────
  const s3 = pptx.addSlide();
  s3.background = { color: C.white };
  addSlideHeader(s3, 'Key Metrics');

  const displayKpis = (kpis || []).slice(0, 5);
  const count = displayKpis.length;

  if (count > 0) {
    const totalW = 12.43;
    const cardW  = (totalW - (count - 1) * 0.2) / count;

    displayKpis.forEach((kpi, i) => {
      const x = 0.45 + i * (cardW + 0.2);
      const y = 1.1;

      s3.addShape(pptx.ShapeType.rect, {
        x, y, w: cardW, h: 4.8,
        fill: { color: C.surface },
        line: { color: C.border, width: 0.75 },
      });
      // Blue top accent on each card
      s3.addShape(pptx.ShapeType.rect, {
        x, y, w: cardW, h: 0.06,
        fill: { color: C.blue }, line: { color: C.blue },
      });

      s3.addText((kpi.label || '').toUpperCase(), {
        x: x + 0.1, y: y + 0.18,
        w: cardW - 0.2, h: 0.7,
        fontSize: count > 3 ? 8 : 9,
        bold: true, color: C.muted,
        fontFace: FONT, align: 'center',
        charSpacing: 0.5, wrap: true,
      });

      s3.addText(String(kpi.value ?? '—'), {
        x: x + 0.1, y: y + 1.0,
        w: cardW - 0.2, h: 1.4,
        fontSize: count > 3 ? 22 : 28,
        bold: true, color: C.dark,
        fontFace: FONT, align: 'center',
        shrinkText: true,
      });

      if (kpi.delta) {
        s3.addText(kpi.delta, {
          x: x + 0.1, y: y + 2.5,
          w: cardW - 0.2, h: 0.45,
          fontSize: 11, align: 'center',
          fontFace: FONT, bold: true,
          color: kpi.deltaPositive ? C.green : C.red,
        });
      }
    });
  } else {
    s3.addText('No KPI data available for this document.', {
      x: 0.45, y: 3.5, w: 12.43, h: 0.5,
      fontSize: 13, color: C.muted, fontFace: FONT, align: 'center',
    });
  }

  addFooter(s3);

  // ── SLIDE 4: Charts ──────────────────────────────────────────────────────────
  const s4 = pptx.addSlide();
  s4.background = { color: C.white };
  addSlideHeader(s4, 'Data Overview');

  const displayCharts = (charts || []).slice(0, 2);

  if (displayCharts.length > 0) {
    displayCharts.forEach((chart, i) => {
      if (!chart?.data || chart.data.length === 0) return;

      const isTwo = displayCharts.length === 2;
      const x = i === 0 ? 0.45 : 6.88;
      const w = isTwo ? 6.0 : 12.43;
      const y = 1.0;
      const h = 5.85;

      const dk = chart.dataKey || 'name';
      const vk = chart.valueKey || 'value';
      const labels = chart.data.map(d => String(d[dk] || d.name || d.label || ''));
      const values = chart.data.map(d => Number(d[vk] || d.value || d.y || 0));

      const chartData = [{ name: chart.title || 'Value', labels, values }];
      const isLine = chart.type === 'line';
      const isHBar = chart.type === 'bar-horizontal';

      try {
        s4.addChart(
          isLine ? pptx.ChartType.line : pptx.ChartType.bar,
          chartData,
          {
            x, y, w, h,
            chartColors: ['2563EB', '3B82F6', '60A5FA', '93C5FD', 'BFDBFE'],
            showLegend: false,
            showTitle: true,
            title: chart.title || '',
            titleFontSize: 11,
            titleColor: C.dark,
            titleFontBold: true,
            valAxisLabelFontSize: 8,
            catAxisLabelFontSize: 8,
            dataLabelFontSize: 8,
            barDir: isHBar ? 'bar' : 'col',
            barGrouping: 'clustered',
            valGridLine: { style: 'dot', color: C.border },
            plotAreaBorderColor: C.border,
            plotAreaBorderWidth: 0.5,
          }
        );
      } catch (_err) {
        // Fallback: data table when chart render fails
        s4.addText(chart.title || 'Chart', {
          x, y: y + 0.1, w, h: 0.4,
          fontSize: 11, bold: true, color: C.dark, fontFace: FONT,
        });
        const tableRows = [
          [
            { text: 'Label', options: { bold: true, fontSize: 9, color: C.white, fill: C.blue, fontFace: FONT } },
            { text: 'Value', options: { bold: true, fontSize: 9, color: C.white, fill: C.blue, fontFace: FONT } },
          ],
          ...chart.data.slice(0, 10).map((d, ri) => [
            { text: String(d.name || d.label || ''), options: { fontSize: 9, color: C.dark, fill: ri % 2 === 0 ? C.surface : C.white, fontFace: FONT } },
            { text: String(d.value || d.y || 0), options: { fontSize: 9, color: C.dark, fill: ri % 2 === 0 ? C.surface : C.white, fontFace: FONT } },
          ]),
        ];
        s4.addTable(tableRows, {
          x, y: y + 0.6, w,
          rowH: 0.32, fontFace: FONT,
          border: { color: C.border, pt: 0.5 },
        });
      }
    });
  } else {
    s4.addText('No chart data available for this document.', {
      x: 0.45, y: 3.5, w: 12.43, h: 0.5,
      fontSize: 13, color: C.muted, fontFace: FONT, align: 'center',
    });
  }

  addFooter(s4);

  // ── SLIDE 5: Analysis + Watch List ───────────────────────────────────────────
  const s5 = pptx.addSlide();
  s5.background = { color: C.white };
  addSlideHeader(s5, 'Analysis & Watch List');

  // Vertical divider
  s5.addShape(pptx.ShapeType.line, {
    x: 8.1, y: 1.0, w: 0, h: 6.0,
    line: { color: C.border, width: 0.75 },
  });

  // Left: Narrative
  s5.addText('ANALYSIS', {
    x: 0.45, y: 1.0, w: 7.4, h: 0.35,
    fontSize: 8.5, bold: true, color: C.blue,
    fontFace: FONT, charSpacing: 2,
  });

  const narrativeShort = (narrative || '').substring(0, 900) +
    (narrative?.length > 900 ? '…' : '');

  if (narrativeShort) {
    s5.addText(narrativeShort, {
      x: 0.45, y: 1.45, w: 7.4, h: 5.5,
      fontSize: 10.5, color: C.slate,
      fontFace: FONT, lineSpacingMultiple: 1.35, valign: 'top',
    });
  }

  // Right: Watch List
  s5.addText('WATCH LIST', {
    x: 8.3, y: 1.0, w: 4.6, h: 0.35,
    fontSize: 8.5, bold: true, color: C.blue,
    fontFace: FONT, charSpacing: 2,
  });

  // watchList items are { type, text } from Claude schema
  const watchItems = (watchList || []).slice(0, 6);
  watchItems.forEach((item, i) => {
    const text = item?.text || item?.title || item?.label ||
                 (typeof item === 'string' ? item : '');
    const yPos = 1.45 + i * 0.92;

    s5.addShape(pptx.ShapeType.rect, {
      x: 8.3, y: yPos, w: 4.6, h: 0.82,
      fill: { color: C.surface },
      line: { color: C.border, width: 0.5 },
    });
    s5.addShape(pptx.ShapeType.ellipse, {
      x: 8.42, y: yPos + 0.33, w: 0.1, h: 0.1,
      fill: { color: C.blue }, line: { color: C.blue },
    });
    s5.addText(text, {
      x: 8.58, y: yPos + 0.18,
      w: 4.1, h: 0.55,
      fontSize: 9.5, color: C.dark,
      fontFace: FONT, valign: 'middle',
      wrap: true,
    });
  });

  addFooter(s5);

  // ── Download ─────────────────────────────────────────────────────────────────
  const safeTitle = (title || 'dashboard')
    .replace(/[^a-z0-9]/gi, '-').toLowerCase()
    .replace(/-+/g, '-').substring(0, 60);

  pptx.writeFile({ fileName: `${safeTitle}-deck.pptx` });
}
