import { useState, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceDot,
} from 'recharts';
import { useFilter } from '../context/FilterContext';
import { useFilteredChartData } from '../hooks/useFilteredData';

const PALETTE = ['#4F8EF7', '#34A853', '#FBBC04', '#EA4335', '#A142F4', '#24C1E0', '#FF7043'];

// ── Tooltip helpers ───────────────────────────────────────────────────────────

/** Infer unit from raw field name when fieldMetadata is missing */
function inferUnit(fieldName) {
  const f = (fieldName || '').toLowerCase();
  if (/_pct$|_percent$|_rate$|pct_|percent_/.test(f)) return '%';
  if (/_usd$|_revenue$|_sales$|_cost$|_price$|_spend$/.test(f)) return '$M';
  if (/_margin$/.test(f)) return '%';
  if (/_days$|_age$/.test(f)) return 'days';
  if (/_x$|_ratio$|_multiple$/.test(f)) return 'x';
  return null;
}

/** Title-case a snake_case / camelCase field name as a fallback label */
function cleanFieldName(raw) {
  if (!raw) return '';
  return raw
    .replace(/_pct$/i, ' %')
    .replace(/_usd$/i, ' ($)')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/** Format a numeric value with its unit into an exec-friendly string */
function formatWithUnit(value, unit) {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return String(value);

  if (unit === '%') return `${num.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  if (unit === '$M') {
    if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(1)}B`;
    if (Math.abs(num) >= 1)    return `$${num.toFixed(1)}M`;
    return `$${(num * 1000).toFixed(0)}K`;
  }
  if (unit === '$K') return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}K`;
  if (unit === '$')  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (unit === '₹Cr') return `₹${num.toFixed(1)} Cr`;
  if (unit === '₹L')  return `₹${num.toFixed(1)} L`;
  if (unit === 'x')   return `${num.toFixed(1)}x`;
  if (unit === 'days') return `${num.toLocaleString(undefined, { maximumFractionDigits: 0 })} days`;
  if (unit)           return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ── Executive tooltip component ───────────────────────────────────────────────
function ExecutiveTooltip({ active, payload, label, fieldMeta }) {
  if (!active || !payload?.length) return null;

  const item      = payload[0];
  const category  = label || item?.name || '';
  const fieldName = item?.dataKey || '';
  const meta      = fieldMeta?.[fieldName] || {};
  const humanLabel = meta.label   || cleanFieldName(fieldName);
  const unit       = meta.unit    || inferUnit(fieldName);
  const context    = meta.context || '';
  const rawValue   = item?.value;

  return (
    <div style={tooltipStyles.wrap}>
      {category && (
        <p style={tooltipStyles.category}>{String(category)}</p>
      )}
      <p style={tooltipStyles.metric}>
        {humanLabel}: <span style={tooltipStyles.value}>{formatWithUnit(rawValue, unit)}</span>
      </p>
      {context && (
        <p style={tooltipStyles.context}>{context}</p>
      )}
    </div>
  );
}

const tooltipStyles = {
  wrap: {
    background:   '#0F1117',
    border:       '1px solid #2D3142',
    borderRadius: '0.5rem',
    padding:      '0.625rem 0.875rem',
    maxWidth:     250,
    boxShadow:    '0 4px 16px rgba(0,0,0,0.55)',
    pointerEvents: 'none',
  },
  category: {
    fontSize:     '0.6875rem',
    color:        '#5F6368',
    marginBottom: '0.2rem',
    letterSpacing: '0.02em',
  },
  metric: {
    fontSize:   '0.875rem',
    fontWeight: 600,
    color:      '#9AA0A6',
    margin:     0,
    lineHeight: 1.4,
  },
  value: {
    color:      '#E8EAED',
    fontWeight: 700,
  },
  context: {
    fontSize:   '0.75rem',
    color:      '#9AA0A6',
    lineHeight: 1.5,
    marginTop:  '0.375rem',
    marginBottom: 0,
  },
};

const PIN_COLOR = {
  peak:       '#34A853',
  trough:     '#EA4335',
  inflection: '#FBBC04',
  outlier:    '#A142F4',
  threshold:  '#4F8EF7',
};

const PIN_ICON = {
  peak: '▲', trough: '▼', inflection: '◆', outlier: '●', threshold: '─',
};

// Lookup actual numeric y-value from chart data
function findY(chart, dataPoint) {
  const row = chart.data.find(d => String(d[chart.dataKey]) === String(dataPoint));
  if (!row) return null;
  const raw = row[chart.valueKey];
  return typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || null;
}

// Custom ReferenceDot shape — renders pin + shows tooltip on hover
// showLabel=true → render a small always-visible label above/below the pin
function AnnotationPin({ cx, cy, annotation, onEnter, onLeave, showLabel = false }) {
  const color    = PIN_COLOR[annotation.type] || '#4F8EF7';
  const icon     = PIN_ICON[annotation.type]  || '●';
  const isBottom = annotation.type === 'trough';

  // Icon sits just outside the pin circle
  const iconY  = isBottom ? cy + 22 : cy - 14;
  // Permanent label sits further out, beyond the icon
  const textY  = isBottom ? cy + 36 : cy - 26;

  // Truncate long labels to keep the chart readable
  const shortLabel = annotation.label?.length > 24
    ? annotation.label.slice(0, 24) + '…'
    : (annotation.label || '');

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={e => onEnter(e, annotation, cx, cy)}
      onMouseLeave={onLeave}
    >
      {/* Pin circle */}
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />
      {/* Type icon */}
      <text
        x={cx} y={iconY}
        textAnchor="middle"
        fontSize={9}
        fontWeight="bold"
        fill={color}
      >
        {icon}
      </text>
      {/* Always-visible label — only on the primary (first) annotation */}
      {showLabel && shortLabel && (
        <text
          x={cx} y={textY}
          textAnchor="middle"
          fontSize={11}
          fill={color}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {shortLabel}
        </text>
      )}
    </g>
  );
}

export default function ChartPanel({ chart, annotations = [], fieldMeta = {} }) {
  const { activeFilters, setFilter } = useFilter();
  const data = useFilteredChartData(chart);
  const containerRef = useRef(null);
  const [annTooltip, setAnnTooltip] = useState(null);

  const isActive   = chart.dimensionId && activeFilters[chart.dimensionId] !== undefined;
  const activeValue = chart.dimensionId ? activeFilters[chart.dimensionId] : undefined;

  function handleBarLineClick(payload) {
    if (!payload?.activePayload || !chart.dimensionId) return;
    const value = payload.activeLabel ?? payload.activePayload[0]?.payload?.[chart.dataKey];
    if (value !== undefined) setFilter(chart.dimensionId, String(value));
  }

  function handlePieClick(entry) {
    if (!chart.dimensionId) return;
    setFilter(chart.dimensionId, String(entry[chart.dataKey]));
  }

  function onPinEnter(e, annotation, cx, cy) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setAnnTooltip({
      text:  annotation.label,
      value: annotation.value,
      type:  annotation.type,
      x: cx,
      y: cy - 12,
    });
  }

  const axisTickStyle = { fill: 'var(--text-muted)', fontSize: 11 };
  const gridProps     = { stroke: 'var(--card-border)', strokeDasharray: '3 3' };

  // Build ReferenceDot elements for this chart's annotations
  const annotationDots = annotations
    .filter(a => chart.type !== 'pie')
    .map((a, i) => {
      const yVal = findY(chart, a.dataPoint);
      if (yVal === null) return null;
      return (
        <ReferenceDot
          key={`pin-${i}`}
          x={a.dataPoint}
          y={yVal}
          r={0}  // r=0 so Recharts doesn't draw its own dot; we use custom shape
          shape={props => (
            <AnnotationPin
              {...props}
              annotation={a}
              onEnter={onPinEnter}
              onLeave={() => setAnnTooltip(null)}
              showLabel={i === 0}
            />
          )}
        />
      );
    })
    .filter(Boolean);

  return (
    <div
      className="chart-card"
      ref={containerRef}
      style={{
        background: 'var(--card-bg)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--card-border)'}`,
        boxShadow: isActive ? 'var(--shadow-active)' : 'var(--shadow)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: chart.dimensionId ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.title}>{chart.title}</p>
          {chart.subtitle && <p style={styles.subtitle}>{chart.subtitle}</p>}
        </div>
        {isActive && activeValue && (
          <span style={styles.badge}>{activeValue}</span>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        {chart.type === 'bar' ? (
          <BarChart data={data} onClick={handleBarLineClick}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={chart.dataKey} tick={axisTickStyle} />
            <YAxis tick={axisTickStyle} />
            <Tooltip content={props => <ExecutiveTooltip {...props} fieldMeta={fieldMeta} />} />
            <Bar dataKey={chart.valueKey} fill="var(--accent)" radius={[4, 4, 0, 0]} />
            {annotationDots}
          </BarChart>
        ) : chart.type === 'line' ? (
          <LineChart data={data} onClick={handleBarLineClick}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={chart.dataKey} tick={axisTickStyle} />
            <YAxis tick={axisTickStyle} />
            <Tooltip content={props => <ExecutiveTooltip {...props} fieldMeta={fieldMeta} />} />
            <Line
              type="monotone"
              dataKey={chart.valueKey}
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--accent)' }}
            />
            {annotationDots}
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              dataKey={chart.valueKey}
              nameKey={chart.dataKey}
              cx="50%" cy="50%"
              outerRadius={85}
              onClick={handlePieClick}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={props => <ExecutiveTooltip {...props} fieldMeta={fieldMeta} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          </PieChart>
        )}
      </ResponsiveContainer>

      {/* Annotation hover tooltip */}
      {annTooltip && (
        <div
          style={{
            ...styles.annTooltip,
            left: annTooltip.x,
            top:  annTooltip.y - 8,
            borderColor: PIN_COLOR[annTooltip.type] || 'var(--accent)',
          }}
        >
          <strong style={{ color: PIN_COLOR[annTooltip.type], fontSize: '0.7rem', textTransform: 'uppercase' }}>
            {annTooltip.type}
          </strong>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {annTooltip.text}
          </p>
          {annTooltip.value && (
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Value: {annTooltip.value}
            </p>
          )}
        </div>
      )}

      {chart.dimensionId && (
        <p style={styles.hint}>Click to filter</p>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  title:    { fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 },
  subtitle: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 },
  badge: {
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '0.7rem',
    padding: '0.15rem 0.5rem',
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  hint: { marginTop: '0.5rem', fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center' },
  annTooltip: {
    position: 'absolute',
    transform: 'translate(-50%, -100%)',
    background: 'var(--card-bg)',
    border: '1px solid',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    pointerEvents: 'none',
    zIndex: 20,
    maxWidth: 220,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
};
