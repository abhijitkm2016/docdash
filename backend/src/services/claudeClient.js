const Anthropic = require('@anthropic-ai/sdk');
const nodeFetch  = require('node-fetch');

// Lazy client — instantiated on first call so dotenv is guaranteed to have loaded
let _client = null;
function getClient() {
  if (!_client) {
    const key = (process.env.ANTHROPIC_API_KEY || '').trim();
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set. Check backend/.env');
    // Use node-fetch to avoid Node.js native fetch strict header validation
    _client = new Anthropic({ apiKey: key, fetch: nodeFetch });
  }
  return _client;
}

// ── Main analysis system prompt ────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are DocDash, an expert McKinsey-trained business analyst and dashboard designer.
You transform uploaded documents into complete, self-contained, interactive HTML executive dashboards.

════════════════════════════════════════
CORE RULES — NON-NEGOTIABLE
════════════════════════════════════════

1. ZERO HALLUCINATION — use ONLY data explicitly in the document. Never fabricate.
2. DATA INTEGRITY — numbers must match the source exactly.
3. INSIGHT-DRIVEN — explain what numbers MEAN, not just what they ARE.
4. Apply SCR framing (Situation / Complication / Resolution) to every insight.

════════════════════════════════════════
OUTPUT — SELF-CONTAINED HTML
════════════════════════════════════════

Return a COMPLETE <!DOCTYPE html> document. Requirements:
- No external files except: https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
- All CSS inline in a <style> tag
- All JS inline in <script> tags
- Fully interactive: sortable table, cross-filtering charts, search box
- Responsive — works on desktop and mobile

════════════════════════════════════════
DARK THEME COLOURS (use these exactly)
════════════════════════════════════════

body bg:       #0f172a
card bg:       #1e293b
card border:   #334155
text primary:  #f8fafc
text muted:    #94a3b8
accent:        #6366f1
green:         #34d399
amber:         #f59e0b
red:           #f87171

════════════════════════════════════════
REQUIRED SECTIONS (in this order)
════════════════════════════════════════

1. TOPBAR — "⚡ DocDash" brand left, "Powered by Claude" right. Dark bar.

2. HEADER — Insight-driven <h1> title (state the KEY FINDING, NOT the filename).
   One-sentence <p> standfirst below it. Complements the title, never repeats it.

3. EXECUTIVE SUMMARY — 3-5 bullets. First bullet is the primary SCR-framed finding.
   NEVER prefix with "Primary finding:" or any label. Start directly with the insight.

4. KPI CARDS — 3-6 metrics in a CSS grid. Each card: label, value, unit, trend arrow (↑ ↓ →),
   one-line "so what" in smaller text below.

5. CHARTS — 2-4 Chart.js charts (bar, line, or pie). Chart titles state insights, not metric names.
   Cross-filtering: clicking a bar/segment filters the data table rows.
   Show "Active filter: [value] ✕" badge when filter is active.

6. DATA TABLE — Up to 50 rows. Sortable columns (click header). Search input above table.
   Highlight rows that match the active chart filter.

7. NARRATIVE — 2-3 paragraphs. Interpretive, not descriptive. Tell the executive what it means.

8. WATCH LIST — ONLY if the data has meaningful business signals:
   Exactly 3 items: 🔴 RISK, 🟡 WATCH, 🟢 ACTION. Each must cite an actual number.
   OMIT entirely for personal docs (resumes, CVs, letters) or files with no business signals.

════════════════════════════════════════
QUALITY CHECK — SILENT, BEFORE OUTPUT
════════════════════════════════════════

□ Title is insight-driven, not the filename
□ No fabricated data
□ Chart titles state insights
□ Narrative is interpretive
□ Watch list only present when warranted
□ All scripts work without errors
□ Output starts with <!DOCTYPE html> and ends with </html>

OUTPUT FORMAT — NON-NEGOTIABLE
Return ONLY the HTML. No markdown fences. No \`\`\`html. No preamble. No explanation.
Start with <!DOCTYPE html> and end with </html>.`;

// ── Ask Your Data system prompt ────────────────────────────────────────────────
const ASK_SYSTEM = `You are analysing a document that has already been processed. Answer the user's question based strictly on the document content provided.

Rules:
- Answer ONLY from the data provided — never fabricate or use outside knowledge
- Be specific — cite actual numbers where relevant
- If the answer is not in the data, say exactly: "This information is not available in the uploaded document"
- Keep answers under 4 sentences unless genuine complexity requires more
- Write for an executive — interpretive not descriptive`;

// ── analyzeDocument ────────────────────────────────────────────────────────────
async function analyzeDocument(parsedFile, fileName, { remixMode = false, userContext = '' } = {}) {
  const documentText = parsedFile.text; // already condensed by the caller

  const remixInstruction = remixMode
    ? '\n\nREMIX MODE: Generate a completely fresh perspective. Different KPIs, different headline insight, different chart types. The title must be meaningfully different from any prior run.'
    : '';

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyse this document and generate the HTML dashboard.

File name: ${fileName}
File type: ${parsedFile.type}
Current date/time: ${new Date().toISOString()}
${userContext ? `\nUser focus context: ${userContext}\n` : ''}
Content:
${documentText}${remixInstruction}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  return extractHTML(raw);
}

function extractHTML(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Claude returned empty response');
  }

  let html = raw.trim();

  // Strip markdown fences if Claude wrapped in ```html or ```
  html = html.replace(/^```(?:html)?\s*/i, '');
  html = html.replace(/\s*```\s*$/i, '');

  // Strip any preamble before <!DOCTYPE or <html
  const htmlStart = html.search(/<(!DOCTYPE|html)/i);
  if (htmlStart > 0) {
    html = html.slice(htmlStart);
  }

  return html.trim();
}

// ── answerQuestion ─────────────────────────────────────────────────────────────
async function answerQuestion(parsedText, question) {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: ASK_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Document content:\n\n${parsedText}\n\nQuestion: ${question}`,
      },
    ],
  });
  return message.content[0].text.trim();
}

module.exports = { analyzeDocument, answerQuestion };
