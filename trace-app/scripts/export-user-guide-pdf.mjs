/**
 * Export ../USER_GUIDE.md to USER_GUIDE.pdf (repo root).
 * Uses jspdf from trace-app dependencies (no extra packages).
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const MD_PATH = join(REPO_ROOT, 'USER_GUIDE.md');
const PDF_PATH = join(REPO_ROOT, 'USER_GUIDE.pdf');

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 10;

const MERMAID_REPLACEMENT = [
  'Status flow:',
  '  Incomplete Checklist',
  '    -> Checklist 100% complete',
  '    -> Mark Under Process',
  '    -> Mark Verified',
];

/** Map Unicode punctuation to WinAnsi-safe ASCII for jsPDF standard fonts. */
function normalizeForPdf(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/\u2192/g, '->') // →
    .replace(/\u2014/g, ' - ') // —
    .replace(/\u2013/g, '-') // –
    .replace(/\u00b7/g, ' | ') // ·
    .replace(/\u2022/g, '- ') // •
    .replace(/\u25e6/g, '- ') // ◦
    .replace(/\u2026/g, '...') // …
    .replace(/\u00d7/g, 'x') // ×
    .replace(/\u2264/g, '<=') // ≤
    .replace(/[\u2018\u2019]/g, "'") // ‘ ’
    .replace(/[\u201c\u201d]/g, '"') // “ ”
    .replace(/\u00a0/g, ' ') // nbsp
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '') // drop remaining non-ASCII
    .replace(/\s+/g, ' ')
    .trim();
}

function stripInlineMd(text) {
  let s = String(text ?? '');
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  while (/\*\*[^*]+\*\*/.test(s)) {
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  }
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\*\*/g, '');
  s = s.replace(/^>\s?/, ''); // blockquote
  return normalizeForPdf(s);
}

function parseMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '---') {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const body = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      if (lang === 'mermaid') {
        blocks.push({ type: 'code', lines: MERMAID_REPLACEMENT });
      } else {
        blocks.push({ type: 'code', lines: body.map((l) => normalizeForPdf(l)) });
      }
      continue;
    }

    if (line.startsWith('|') && line.includes('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const rows = tableLines
        .filter((row) => !/^\|[\s\-:|]+\|$/.test(row.trim()))
        .map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((cell) => stripInlineMd(cell.trim()))
        );
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }

    if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push({ type: 'heading', level, text: stripInlineMd(line.replace(/^#+\s*/, '')) });
      i += 1;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(stripInlineMd(lines[i].replace(/^\d+\.\s*/, '')));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        const raw = lines[i].replace(/^[-*]\s*/, '');
        const indent = raw.match(/^(\s+)/)?.[1]?.length ?? 0;
        items.push({ text: stripInlineMd(raw.trim()), indent: indent >= 2 ? 1 : 0 });
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3} /.test(lines[i]) &&
      !lines[i].startsWith('|') &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      lines[i].trim() !== '---' &&
      !lines[i].startsWith('```')
    ) {
      para.push(lines[i]);
      i += 1;
    }
    if (para.length) {
      blocks.push({ type: 'p', text: stripInlineMd(para.join(' ')) });
    }
  }

  return blocks;
}

function createRenderer() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;
  let pageNum = 1;

  function addFooter() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`B-TRACE User Guide - Page ${pageNum}`, PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  function newPage() {
    addFooter();
    doc.addPage();
    pageNum += 1;
    y = MARGIN;
  }

  function ensureSpace(needed) {
    if (y + needed > FOOTER_Y - 4) newPage();
  }

  function writeLines(textLines, fontSize, fontStyle, indent = 0, gap = 1.5) {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    const x = MARGIN + indent;
    const w = CONTENT_W - indent;
    for (const chunk of textLines) {
      const safe = normalizeForPdf(chunk);
      if (!safe) continue;
      const wrapped = doc.splitTextToSize(safe, w);
      for (const wl of wrapped) {
        ensureSpace(fontSize * 0.45 + gap);
        doc.text(wl, x, y);
        y += fontSize * 0.45 + gap;
      }
    }
  }

  return {
    doc,
    finish() {
      addFooter();
      return doc;
    },
    hr() {
      ensureSpace(6);
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 5;
    },
    heading(level, text) {
      const sizes = { 1: 18, 2: 14, 3: 12 };
      const size = sizes[level] || 12;
      ensureSpace(size * 0.6 + 4);
      y += level === 1 ? 2 : 4;
      writeLines([text], size, 'bold');
      y += 2;
    },
    p(text) {
      writeLines([text], 10, 'normal');
      y += 1;
    },
    ul(items) {
      for (const item of items) {
        const bullet = item.indent ? '  - ' : '- ';
        writeLines([bullet + item.text], 10, 'normal', item.indent ? 4 : 0);
      }
      y += 1;
    },
    ol(items) {
      items.forEach((text, idx) => {
        writeLines([`${idx + 1}. ${text}`], 10, 'normal');
      });
      y += 1;
    },
    code(lines) {
      ensureSpace(4);
      doc.setFillColor(245, 247, 250);
      const blockH = Math.max(lines.length, 1) * 5 + 4;
      ensureSpace(blockH);
      doc.rect(MARGIN, y - 3, CONTENT_W, blockH, 'F');
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      for (const ln of lines) {
        const safe = normalizeForPdf(ln);
        if (!safe) continue;
        ensureSpace(5);
        doc.text(safe, MARGIN + 3, y);
        y += 5;
      }
      doc.setFont('helvetica', 'normal');
      y += 2;
    },
    table(rows) {
      if (!rows.length) return;
      const colCount = Math.max(...rows.map((r) => r.length));
      const colWidths = Array(colCount).fill(CONTENT_W / colCount);
      const rowH = 6;
      for (const row of rows) {
        ensureSpace(rowH + 2);
        let x = MARGIN;
        const isHeader = row === rows[0];
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(9);
        for (let c = 0; c < colCount; c += 1) {
          const cell = normalizeForPdf(row[c] || '');
          const wrapped = doc.splitTextToSize(cell, colWidths[c] - 2);
          doc.text(wrapped[0] || '', x + 1, y);
          x += colWidths[c];
        }
        if (row === rows[0]) {
          y += 1;
          doc.setDrawColor(180, 180, 180);
          doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        }
        y += rowH;
      }
      y += 2;
      doc.setFont('helvetica', 'normal');
    },
  };
}

function render(blocks, r) {
  for (const block of blocks) {
    switch (block.type) {
      case 'hr':
        r.hr();
        break;
      case 'heading':
        r.heading(block.level, block.text);
        break;
      case 'p':
        r.p(block.text);
        break;
      case 'ul':
        r.ul(block.items);
        break;
      case 'ol':
        r.ol(block.items);
        break;
      case 'code':
        r.code(block.lines);
        break;
      case 'table':
        r.table(block.rows);
        break;
      default:
        break;
    }
  }
}

const md = readFileSync(MD_PATH, 'utf8');
const blocks = parseMarkdown(md);
const renderer = createRenderer();
render(blocks, renderer);
const pdf = renderer.finish();
const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
writeFileSync(PDF_PATH, pdfBuffer);

console.log(`Wrote ${PDF_PATH} (${pdfBuffer.length} bytes, ${renderer.doc.getNumberOfPages()} pages)`);
