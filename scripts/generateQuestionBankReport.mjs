import { readFile, writeFile } from 'node:fs/promises';

const fields = {
  id: 'ID',
  year: '年度',
  subject: '科目',
  type: '題型',
  learningTheme: '類別',
  knowledgeNode: '知識節點',
  stem: '題幹',
  optionA: 'A',
  optionB: 'B',
  optionC: 'C',
  optionD: 'D',
  correctAnswer: '標準答案',
};

const choiceKeys = new Set(['A', 'B', 'C', 'D']);
const requiredHeaders = [
  fields.id,
  fields.year,
  fields.subject,
  '題號',
  fields.type,
  fields.learningTheme,
  fields.knowledgeNode,
  fields.stem,
];

const csvText = await readFile('public/questions.csv', 'utf8');
const { headers, rows } = parseCsvWithHeaders(csvText);
const validation = validate(headers, rows);
const summary = summarize(rows);

const report = [
  '# Question Bank Report',
  '',
  '## Summary',
  '',
  `- Total questions: ${summary.totalQuestions}`,
  `- Years: ${Object.keys(summary.byYear).length}`,
  `- Subjects: ${Object.keys(summary.bySubject).length}`,
  `- LearningThemes: ${Object.keys(summary.byLearningTheme).length}`,
  `- KnowledgeNodes: ${Object.keys(summary.byKnowledgeNode).length}`,
  `- Errors: ${validation.errors.length}`,
  `- Warnings: ${validation.warnings.length}`,
  '',
  section('By Year', summary.byYear),
  section('By Subject', summary.bySubject),
  section('By LearningTheme', summary.byLearningTheme),
  section('By KnowledgeNode', summary.byKnowledgeNode),
  issueSection('Errors', validation.errors),
  issueSection('Warnings', validation.warnings),
].join('\n');

await writeFile('QUESTION_BANK_REPORT.md', report, 'utf8');

function parseCsvWithHeaders(text) {
  const records = splitRecords(text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  const [headerLine, ...dataLines] = records;
  const parsedHeaders = headerLine ? parseLine(headerLine).map((header) => header.trim()) : [];

  return {
    headers: parsedHeaders,
    rows: dataLines.map((line) => {
      const values = parseLine(line);
      return parsedHeaders.reduce((row, header, index) => {
        row[header] = values[index] ?? '';
        return row;
      }, {});
    }),
  };
}

function splitRecords(text) {
  const records = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += char + nextChar;
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      current += char;
      continue;
    }

    if (char === '\n' && !insideQuotes) {
      if (current.trim()) records.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) records.push(current);
  return records;
}

function parseLine(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function validate(headers, rows) {
  const errors = [];
  const warnings = [];
  const headerSet = new Set(headers);
  const ids = new Set();

  requiredHeaders.forEach((header) => {
    if (!headerSet.has(header)) errors.push(`Missing required header: ${header}`);
  });

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const id = value(row, fields.id);

    if (!id) errors.push(`Row ${rowNumber}: ID is required`);
    if (id && ids.has(id)) errors.push(`Row ${rowNumber}: duplicate ID ${id}`);
    ids.add(id);

    [fields.year, fields.subject, '題號', fields.learningTheme, fields.knowledgeNode, fields.stem].forEach((field) => {
      if (!value(row, field)) errors.push(`Row ${rowNumber}: ${field} is required`);
    });

    if (value(row, fields.type) === '選擇題') {
      [fields.optionA, fields.optionB, fields.optionC, fields.optionD].forEach((field) => {
        if (!value(row, field)) errors.push(`Row ${rowNumber}: ${field} is required for choice questions`);
      });

      if (!choiceKeys.has(value(row, fields.correctAnswer).toUpperCase())) {
        errors.push(`Row ${rowNumber}: choice answer must be A/B/C/D`);
      }
    }

    if (value(row, fields.type) === '非選題') {
      const hasOptions = [fields.optionA, fields.optionB, fields.optionC, fields.optionD].some((field) => value(row, field));
      if (hasOptions) warnings.push(`Row ${rowNumber}: essay question should not include A/B/C/D`);
    }
  });

  return { errors, warnings };
}

function summarize(rows) {
  return {
    totalQuestions: rows.length,
    byYear: countBy(rows, fields.year),
    bySubject: countBy(rows, fields.subject),
    byLearningTheme: countBy(rows, fields.learningTheme),
    byKnowledgeNode: countBy(rows, fields.knowledgeNode),
  };
}

function countBy(rows, field) {
  return rows.reduce((counts, row) => {
    const key = value(row, field) || '未分類';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function section(title, data) {
  const lines = Object.entries(data).map(([key, count]) => `- ${key}: ${count}`);
  return [`## ${title}`, '', ...(lines.length > 0 ? lines : ['- None']), ''].join('\n');
}

function issueSection(title, issues) {
  return [`## ${title}`, '', ...(issues.length > 0 ? issues.map((issue) => `- ${issue}`) : ['- None']), ''].join('\n');
}

function value(row, field) {
  return (row[field] ?? '').trim();
}

