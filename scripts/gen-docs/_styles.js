// Shared docx-js style helpers used by every documentation generator.
// Single source of truth for fonts, colors, table widths, footer layout.

const {
  AlignmentType,
  BorderStyle,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TabStopPosition,
  TextRun,
  WidthType,
  PageOrientation,
} = require("docx");

// ── Page sizing (US Letter, 1 inch margins) ─────────────────────────────────
const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360 DXA

const NAVY = "0F2B7F";
const GOLD = "BD882C";
const GRAY = "666666";
const LIGHT_GRAY = "F2F2F2";
const CODE_BG = "F5F5F5";
const BORDER_GRAY = "D0D0D0";

// ── Document-wide styles (override Word defaults for Heading1..4, Code) ─────
const styles = {
  default: {
    document: { run: { font: "Calibri", size: 22 } }, // 11pt body
  },
  paragraphStyles: [
    {
      id: "Title",
      name: "Title",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 56, bold: true, font: "Calibri", color: NAVY },
      paragraph: { spacing: { before: 0, after: 120 }, alignment: AlignmentType.LEFT },
    },
    {
      id: "Subtitle",
      name: "Subtitle",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 28, font: "Calibri", color: GRAY },
      paragraph: { spacing: { before: 0, after: 240 } },
    },
    {
      id: "Heading1",
      name: "Heading 1",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 36, bold: true, font: "Calibri", color: NAVY },
      paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
    },
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 28, bold: true, font: "Calibri", color: NAVY },
      paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
    },
    {
      id: "Heading3",
      name: "Heading 3",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 24, bold: true, font: "Calibri", color: "333333" },
      paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
    },
    {
      id: "Heading4",
      name: "Heading 4",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 22, bold: true, italics: true, font: "Calibri", color: "333333" },
      paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 3 },
    },
    {
      id: "CodeBlock",
      name: "Code Block",
      basedOn: "Normal",
      next: "Normal",
      run: { font: "Consolas", size: 20 },
      paragraph: {
        spacing: { before: 60, after: 60, line: 280 },
        shading: { fill: CODE_BG, type: ShadingType.CLEAR },
        indent: { left: 240, right: 240 },
      },
    },
    {
      id: "Quote",
      name: "Quote",
      basedOn: "Normal",
      next: "Normal",
      run: { italics: true, color: "555555" },
      paragraph: {
        spacing: { before: 120, after: 120 },
        indent: { left: 480, right: 480 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: NAVY, space: 12 } },
      },
    },
    {
      id: "Caption",
      name: "Caption",
      basedOn: "Normal",
      next: "Normal",
      run: { italics: true, size: 18, color: GRAY },
      paragraph: { spacing: { before: 40, after: 200 }, alignment: AlignmentType.LEFT },
    },
  ],
};

const numbering = {
  config: [
    {
      reference: "bullets",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
        {
          level: 1,
          format: LevelFormat.BULLET,
          text: "◦",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
        },
      ],
    },
    {
      reference: "numbers",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
  ],
};

// ── Builders ─────────────────────────────────────────────────────────────────

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
    ...opts.paragraph,
  });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text })],
    spacing: { after: 140, line: 320 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bodyMixed(runs) {
  return new Paragraph({
    children: runs,
    spacing: { after: 140, line: 320 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function h4(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun(text)] });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun(text)],
    spacing: { after: 80 },
  });
}

function bulletMixed(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: runs,
    spacing: { after: 80 },
  });
}

function num(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    children: [new TextRun(text)],
    spacing: { after: 80 },
  });
}

function code(text) {
  // Multi-line code: emit one CodeBlock paragraph per line.
  return text.split("\n").map(
    (line) =>
      new Paragraph({
        style: "CodeBlock",
        children: [new TextRun({ text: line || " ", font: "Consolas", size: 20 })],
      })
  );
}

function inlineCode(text) {
  return new TextRun({ text, font: "Consolas", size: 20, shading: { fill: CODE_BG, type: ShadingType.CLEAR } });
}

function bold(text) {
  return new TextRun({ text, bold: true });
}

function plain(text) {
  return new TextRun({ text });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function caption(text) {
  return new Paragraph({ style: "Caption", children: [new TextRun(text)] });
}

function quote(text) {
  return new Paragraph({ style: "Quote", children: [new TextRun(text)] });
}

// ── Tables ───────────────────────────────────────────────────────────────────

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function buildTable(columnWidths, headerRow, dataRows) {
  const total = columnWidths.reduce((a, b) => a + b, 0);
  const buildCell = (text, isHeader = false, widthDxa) =>
    new TableCell({
      borders: cellBorders,
      width: { size: widthDxa, type: WidthType.DXA },
      shading: isHeader ? { fill: NAVY, type: ShadingType.CLEAR } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: typeof text === "string" ? text : "",
              bold: isHeader,
              color: isHeader ? "FFFFFF" : undefined,
              size: isHeader ? 22 : 22,
              font: "Calibri",
            }),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerRow.map((text, i) => buildCell(text, true, columnWidths[i])),
      }),
      ...dataRows.map(
        (row) =>
          new TableRow({
            children: row.map((text, i) => buildCell(text, false, columnWidths[i])),
          })
      ),
    ],
  });
}

// ── Headers / footers ────────────────────────────────────────────────────────

function buildHeader(docTitle) {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "Vaivamm Capital CRM", color: NAVY, bold: true, size: 18 }),
          new TextRun({ text: "  |  ", color: GRAY, size: 18 }),
          new TextRun({ text: docTitle, color: GRAY, size: 18 }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY, space: 4 },
        },
        spacing: { after: 60 },
      }),
    ],
  });
}

function buildFooter(docNumber) {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `Document ${docNumber} of 10`, color: GRAY, size: 18 }),
          new TextRun({ text: "\t" }),
          new TextRun({ text: "Page ", color: GRAY, size: 18 }),
          new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 18 }),
          new TextRun({ text: " of ", color: GRAY, size: 18 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 18 }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY, space: 4 },
        },
      }),
    ],
  });
}

// ── Cover-page helper ────────────────────────────────────────────────────────

function coverPage({ docNumber, title, subtitle, audience, version, repoSha, date }) {
  return [
    new Paragraph({
      children: [new TextRun({ text: " ", size: 80 })], // top spacer
      spacing: { before: 1200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "VAIVAMM CAPITAL CRM", bold: true, size: 32, color: NAVY })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Engineering Documentation", size: 22, color: GRAY })],
      spacing: { after: 1200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Document ${docNumber}`, size: 24, color: GOLD, bold: true })],
      spacing: { after: 60 },
    }),
    new Paragraph({ style: "Title", children: [new TextRun(title)] }),
    new Paragraph({ style: "Subtitle", children: [new TextRun(subtitle)] }),
    new Paragraph({
      children: [new TextRun({ text: " ", size: 40 })],
      spacing: { before: 800 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Audience: ", bold: true, size: 22 }),
        new TextRun({ text: audience, size: 22 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Version: ", bold: true, size: 22 }),
        new TextRun({ text: version, size: 22 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Source revision: ", bold: true, size: 22 }),
        new TextRun({ text: repoSha, size: 22, font: "Consolas" }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Date: ", bold: true, size: 22 }),
        new TextRun({ text: date, size: 22 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Status: ", bold: true, size: 22 }),
        new TextRun({ text: "Internal — Engineering team only", size: 22, color: "AA0000" }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ── Section meta ─────────────────────────────────────────────────────────────

function sectionProps() {
  return {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    },
  };
}

module.exports = {
  // constants
  PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
  NAVY, GOLD, GRAY, LIGHT_GRAY, CODE_BG, BORDER_GRAY,
  // doc setup
  styles, numbering, sectionProps,
  buildHeader, buildFooter, coverPage,
  // builders
  p, body, bodyMixed, h1, h2, h3, h4, bullet, bulletMixed, num,
  code, inlineCode, bold, plain, pageBreak, caption, quote,
  buildTable,
};
