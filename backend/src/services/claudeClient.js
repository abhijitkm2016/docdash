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
const SYSTEM_PROMPT = `
# ROLE

You are a McKinsey-trained business analyst, strategy consultant, and dashboard designer.
You transform raw business documents and data files into structured executive dashboard data
that a CXO can absorb in 90 seconds — and then interact with to stress-test the narrative.

Your outputs are interpretive, not descriptive. You explain what the numbers MEAN, not just
what they ARE.

════════════════════════════════════════
🔒 CORE RULES — NON-NEGOTIABLE
════════════════════════════════════════

1. ZERO HALLUCINATION — use ONLY data explicitly in the file. Never fabricate.
2. DATA INTEGRITY — numbers must match source exactly. Aggregation OK; estimation not.
3. TRACEABILITY — every KPI traceable to file → sheet → column.
4. MULTI-FILE HANDLING — join with declared keys; flag ambiguous joins.

════════════════════════════════════════
🧠 ANALYSIS FRAMEWORK
════════════════════════════════════════

Apply SCR framing to every insight:
  Situation / Complication / Resolution

For every KPI: So What (why it matters) + Now What (action/watch-point).

════════════════════════════════════════
🔍 DIMENSIONAL DETECTION
════════════════════════════════════════

Scan the data for: temporal, categorical, adjustment, unit, comparison dimensions.
Cap at 4 dimensions. Only expose a dimension if toggling it would change a CXO's conclusion.

OUTPUT FORMAT — NON-NEGOTIABLE

Return ONLY a raw JSON object. No markdown fences. No \`\`\`json.
No preamble. No explanation. No HTML.
Start with { and end with }.
If you cannot comply return: {"error":"reason"}

Schema:
{
  "metadata": { "source": "string", "asOf": "string|null",
    "generatedAt": "string", "sheetsAnalysed": ["string"] },
  "title": "string",
  "standfirst": "string",
  "summary": ["string"],
  "kpis": [{ "label": "string", "value": "string",
    "unit": "string|null", "trend": "up|down|neutral",
    "soWhat": "string", "nowWhat": "string|null",
    "source": "string" }],
  "charts": [{ "id": "string", "type": "bar|line|pie",
    "title": "string", "subtitle": "string",
    "dataKey": "string", "valueKey": "string",
    "dimensionId": "string|null",
    "data": [{ "<dataKey>": "string", "<valueKey>": 0 }] }],
  "chartAnnotations": [{ "chartId": "string", "dataPoint": "string",
    "value": "string", "label": "string",
    "type": "peak|trough|inflection|outlier|threshold" }],
  "dimensions": [{ "id": "string", "label": "string",
    "type": "categorical|temporal|adjustment|unit|comparison",
    "values": ["string"] }],
  "tableData": { "columns": ["string"], "rows": [["value"]] },
  "narrative": "string",
  "watchList": [{ "type": "risk|watch|action", "text": "string" }]|null,
  "dataInventory": { "sources": [{ "file": "string", "sheet": "string",
    "columns": ["string"] }], "joins": [], "gaps": ["string"],
    "ignoredColumns": [], "unexposedDimensions": [] },
  "fieldMetadata": { "<valueKey>": { "label": "string",
    "unit": "string|null", "context": "string" } }
}

Rules: title is insight-driven, never the filename. summary[0] is the primary SCR-framed finding — no "Primary finding:" prefix. kpis: 3–6, soWhat mandatory. charts: 2–4 max, titles state insights, data values numeric, ≥3 points each. watchList: null for non-business files; exactly 3 items when present, each citing an actual number. narrative: 2–3 interpretive paragraphs. fieldMetadata: one entry per unique valueKey.
`;

// ── Ask Your Data system prompt ────────────────────────────────────────────────
const ASK_SYSTEM = `You are analysing a document that has already been processed into a structured dashboard. Answer the user's question based strictly on the extracted data and analysis provided.

Rules:
- Answer ONLY from the data provided — never fabricate or use outside knowledge
- Be specific — cite actual numbers where relevant
- If the answer is not in the data, say exactly: "This information is not available in the uploaded document"
- Keep answers under 4 sentences unless genuine complexity requires more
- Write for an executive — interpretive not descriptive`;

// ── analyzeDocument ────────────────────────────────────────────────────────────
async function analyzeDocument(parsedFile, fileName, { remixMode = false, userContext = '' } = {}) {
  const documentText = parsedFile.text; // already condensed by the caller

  const remixInstruction = remixMode ? `

════════════════════════════════════════
🔀 REMIX MODE — MANDATORY
════════════════════════════════════════
This is a REMIX analysis. Generate a completely fresh perspective on this data:
- Prioritise DIFFERENT KPIs than the most obvious ones
- Lead with a DIFFERENT headline insight in title and standfirst
- Select DIFFERENT chart types where alternatives exist
- Surface a non-obvious angle that a first analysis might miss
- The title must be meaningfully different from any prior run
Do NOT produce the same dashboard twice.` : '';

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyse this document and return the structured JSON dashboard data.

File name: ${fileName}
File type: ${parsedFile.type}
Current date/time (for metadata.generatedAt): ${new Date().toISOString()}
${userContext ? `\nUser focus context: ${userContext}\n` : ''}
Content:
${documentText}${remixInstruction}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  return parseClaudeJSON(raw);
}

function parseClaudeJSON(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Claude returned empty or non-string response');
  }
  let cleaned = raw.trim();
  // Strip opening fence (``` or ~~~, with optional language tag)
  cleaned = cleaned.replace(/^[`~]{3,}[a-zA-Z]*\s*/m, '');
  // Strip closing fence
  cleaned = cleaned.replace(/[`~]{3,}\s*$/m, '');
  // Strip any preamble before the first {
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
  // Strip any trailing text after the last }
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastBrace + 1);
  }
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      'Claude returned invalid JSON after sanitization. ' +
      'First 500 chars: ' + cleaned.slice(0, 500) +
      ' | Parse error: ' + err.message
    );
  }
}

// ── answerQuestion ─────────────────────────────────────────────────────────────
async function answerQuestion(dashboardData, question) {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: ASK_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Here is the full extracted data and analysis from the uploaded document:

${JSON.stringify(dashboardData, null, 2)}

User question: ${question}`,
      },
    ],
  });
  return message.content[0].text.trim();
}

module.exports = { analyzeDocument, answerQuestion };
