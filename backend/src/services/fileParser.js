const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const path = require('path');

async function parseFile(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePdf(buffer);
    case '.xlsx':
    case '.xls':
      return parseExcel(buffer);
    case '.csv':
      return parseCsv(buffer);
    case '.docx':
    case '.doc':
      return parseWord(buffer);
    case '.pptx':
    case '.ppt':
      return parsePowerPoint(buffer);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  return {
    type: 'pdf',
    text: data.text,
    pageCount: data.numpages,
    tables: [],
  };
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = {};
  let combinedText = '';

  workbook.SheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    sheets[name] = json;
    combinedText += `\n### Sheet: ${name}\n`;
    combinedText += json.map((row) => row.join('\t')).join('\n');
  });

  return {
    type: 'excel',
    text: combinedText,
    sheets,
    sheetNames: workbook.SheetNames,
  };
}

function parseCsv(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const text = json.map((row) => row.join('\t')).join('\n');

  return {
    type: 'csv',
    text,
    rows: json,
  };
}

async function parseWord(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return {
    type: 'word',
    text: result.value,
  };
}

async function parsePowerPoint(buffer) {
  return new Promise((resolve, reject) => {
    officeParser.parseOfficeAsync(buffer, { outputErrorToConsole: false })
      .then((text) => resolve({ type: 'powerpoint', text }))
      .catch(reject);
  });
}

module.exports = { parseFile };
