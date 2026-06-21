const Anthropic = require('@anthropic-ai/sdk');
const nodeFetch  = require('node-fetch');

let _client = null;
function getClient() {
  if (!_client) {
    const key = (process.env.ANTHROPIC_API_KEY || '').trim();
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set. Check backend/.env');
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

════════════════════════════════════════
📐 OUTPUT FORMAT — STRUCTURED JSON ONLY
════════════════════════════════════════

Return ONLY a valid JSON object. No markdown, no prose outside JSON.

Schema:

{
  "metadata": {
    "source": "filename.ext",
    "asOf": "date if detectable, else null",
    "generatedAt": "ISO 8601 timestamp",
    "sheetsAnalysed": ["Sheet1"]
  },

  "title": "Concise, neutral, descriptive title in the format: [Subject/Entity Name] — [Document Type] ([Year or Date Range if available]). Example: 'Abhijit Kumar Mishra — Career Intelligence Report (2016–2026)'. Do NOT use superlatives, adjectives, or promotional language. The title should read like an analyst wrote it, not a recruiter.",

  "standfirst": "One sentence 60-second summary — complements title, never repeats it",

  "summary": [
    "The primary SCR-framed insight — written as a full sentence, no label prefix",
    "Supporting finding 2",
    "Supporting finding 3"
  ],

  "kpis": [
    {
      "label": "Metric Name",
      "value": "exact value from source",
      "unit": "string or null",
      "trend": "up | down | neutral",
      "soWhat": "Why this matters to a CXO — one sentence",
      "nowWhat": "Action or watch-point — one sentence, or null",
      "source": "filename → sheet → column",
      "confidenceBadge": null
    }
  ],

  "dimensions": [
    {
      "id": "snake_case_id",
      "label": "Display Label",
      "type": "categorical | temporal | adjustment | unit | comparison",
      "values": ["Value A", "Value B"]
    }
  ],

  "charts": [
    {
      "id": "unique_snake_case_id",
      "type": "bar | line | pie",
      "title": "Insight-driven chart title — state the finding",
      "subtitle": "One-line supporting insight",
      "dataKey": "field name for x-axis or category",
      "valueKey": "field name for y-axis or value",
      "dimensionId": "dimension id for cross-filtering or null",
      "data": [{ "<dataKey>": "string", "<valueKey>": 0 }]
    }
  ],

  "chartAnnotations": [
    {
      "chartId": "must match an id in the charts array",
      "dataPoint": "exact dataKey value of the annotated point",
      "value": "the numeric value as a string",
      "label": "WHY this point is significant — not just what the value is",
      "type": "peak | trough | inflection | outlier | threshold"
    }
  ],

  "tableData": {
    "columns": ["Column 1"],
    "rows": [["value"]]
  },

  "narrative": "2–3 paragraph interpretive narrative. Separate paragraphs with \\n\\n.",

  "watchList": [
    { "type": "risk",   "text": "🔴 RISK: [specific risk with data evidence — one sentence]"   },
    { "type": "watch",  "text": "🟡 WATCH: [trend to monitor with data evidence — one sentence]" },
    { "type": "action", "text": "🟢 ACTION: [concrete recommended action — one sentence]"       }
  ],

  "dataInventory": {
    "sources": [{ "file": "string", "sheet": "string", "columns": ["string"] }],
    "joins": [{ "keys": ["string"], "type": "inner | left | right", "description": "string" }],
    "gaps": ["string"],
    "ignoredColumns": [{ "column": "string", "reason": "string" }],
    "unexposedDimensions": [{ "dimension": "string", "reason": "string" }]
  },

  "fieldMetadata": {
    "<valueKey>": {
      "label": "Human-readable metric name",
      "unit": "% | $M | $K | $ | x | days | units | null",
      "context": "One business-relevant sentence for an executive"
    }
  }
}

════════════════════════════════════════
📋 FIELD RULES
════════════════════════════════════════

title: neutral analytical format — [Subject] — [Document Type] ([Date Range]). No superlatives, no promotional language.
standfirst: one sentence, complements title without repeating it.
summary bullet 1: THE primary finding — SCR-framed, written as a complete insight sentence.
  NEVER prefix with "Primary finding:", "Key finding:", "Main insight:" or any label.
kpis: 3–6 only; soWhat mandatory; nowWhat only if clear action implied.
dimensions: only what data actually contains; max 4.
charts: 2–4 max; titles state insights not metric names; data values numeric; ≥3 points each.

chartAnnotations:
  - Only annotate genuinely significant moments (peak, trough, inflection, threshold, outlier)
  - label must explain WHY significant — not just restate the value
  - chartId must exactly match a chart id in the charts array
  - If no genuinely significant moment: return empty array []
  - Maximum 2 annotations per chart

watchList:
  - ONLY include if the data contains meaningful business signals
  - If warranted: return exactly 3 items with types "risk", "watch", "action"
  - Each item must cite an actual number from the document
  - For personal documents (resumes, CVs), single data point files, or files with no
    business context: return watchList as null (not an empty array — null)

tableData: up to 50 rows; empty rows array if no tabular data.
narrative: 2–3 paragraphs, interpretive not descriptive.
dataInventory: complete — sources, joins, gaps, ignoredColumns, unexposedDimensions.

════════════════════════════════════════
✅ QUALITY CHECK — SILENT, BEFORE OUTPUT
════════════════════════════════════════

□ Zero fabricated data points
□ title is insight-driven, not generic
□ standfirst complements without repeating title
□ summary[0] starts directly with the insight — no label prefix
□ Every KPI has soWhat; nowWhat only where warranted
□ watchList: null for non-business files; exactly 3 items when present
□ chart titles state insights
□ narrative is interpretive
□ Return ONLY the JSON object — no markdown fences, no prose
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
  const documentText = parsedFile.text;

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
