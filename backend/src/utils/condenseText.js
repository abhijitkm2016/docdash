/**
 * Condenses parsed document text to fit within a token budget while
 * representing the WHOLE document — not just the first N characters.
 *
 * Strategy by file type:
 *   Excel / CSV — headers + row count + per-column numeric stats + sample rows
 *   PDF / Word / PPT / multi — evenly-spaced chunks from start, middle, end
 */

const MAX_CHARS = 8000;

// ── Public entry point ────────────────────────────────────────────────────────
function condenseText(parsedFile) {
  const { type, text } = parsedFile;

  if (!text || text.length <= MAX_CHARS) return text;

  if (type === 'excel' || type === 'csv') {
    return _condenseTabular(parsedFile);
  }

  return _condenseLinear(text);
}

// ── Tabular condenser (Excel / CSV) ──────────────────────────────────────────
function _condenseTabular(parsedFile) {
  const { sheets, sheetNames, rows, type } = parsedFile;
  let out = '';

  if (type === 'csv' && rows) {
    out += _sheetSummary('Data', rows);
  } else if (sheets && sheetNames) {
    for (const name of sheetNames) {
      out += _sheetSummary(name, sheets[name] || []);
      if (out.length >= MAX_CHARS) break;
    }
  }

  return out.slice(0, MAX_CHARS);
}

function _sheetSummary(name, rows) {
  if (!rows || rows.length === 0) return '';

  const headers  = rows[0] || [];
  const dataRows = rows.slice(1).filter(r => r.some(c => c !== '' && c != null));
  const total    = dataRows.length;

  // Numeric stats per column
  const stats = {};
  headers.forEach((h, i) => {
    if (!h) return;
    const nums = dataRows
      .map(r => parseFloat(r[i]))
      .filter(v => !isNaN(v) && isFinite(v));
    if (nums.length >= total * 0.4) {
      const sum = nums.reduce((a, b) => a + b, 0);
      stats[h] = {
        count: nums.length,
        sum:   +sum.toFixed(4),
        min:   Math.min(...nums),
        max:   Math.max(...nums),
        avg:   +(sum / nums.length).toFixed(4),
      };
    }
  });

  let out = `### Sheet: ${name}\n`;
  out    += `Total rows: ${total}\n`;
  out    += `Columns (${headers.length}): ${headers.join(', ')}\n\n`;

  if (Object.keys(stats).length) {
    out += 'Numeric column statistics:\n';
    for (const [col, s] of Object.entries(stats)) {
      out += `  ${col}: count=${s.count}  sum=${s.sum}  min=${s.min}  max=${s.max}  avg=${s.avg}\n`;
    }
    out += '\n';
  }

  // Sample: first 5 rows + last 5 rows (deduped when total ≤ 10)
  const head = dataRows.slice(0, 5);
  const tail = total > 10 ? dataRows.slice(-5) : [];
  out += `Sample rows:\n${headers.join('\t')}\n`;
  for (const r of head) out += r.join('\t') + '\n';
  if (tail.length) {
    out += `… (${total - 10} rows omitted) …\n`;
    for (const r of tail) out += r.join('\t') + '\n';
  }

  return out + '\n';
}

// ── Linear condenser (PDF / Word / PPT / multi) ───────────────────────────────
function _condenseLinear(text) {
  // Reserve ~120 chars for the two omission markers, then divide remainder
  const MARKER_BUDGET = 120;
  const budget    = MAX_CHARS - MARKER_BUDGET;
  const startLen  = Math.floor(budget * 0.4);
  const midLen    = Math.floor(budget * 0.3);
  const endLen    = budget - startLen - midLen;
  const midOffset = Math.floor(text.length / 2) - Math.floor(midLen / 2);

  const start = text.slice(0, startLen);
  const mid   = text.slice(midOffset, midOffset + midLen);
  const end   = text.slice(-endLen);

  const omittedStart = midOffset - startLen;
  const omittedEnd   = text.length - endLen - (midOffset + midLen);

  return [
    start,
    `\n\n[… ${omittedStart.toLocaleString()} characters omitted …]\n\n`,
    mid,
    `\n\n[… ${omittedEnd.toLocaleString()} characters omitted …]\n\n`,
    end,
  ].join('');
}

module.exports = { condenseText };
