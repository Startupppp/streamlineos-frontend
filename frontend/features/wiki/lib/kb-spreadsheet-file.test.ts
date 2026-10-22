import {
  KB_SPREADSHEET_ACCEPT,
  readSpreadsheetFile,
  exportSpreadsheet,
} from "./kb-spreadsheet-file";

const mockAnchorClick = jest.fn();
let mockObjectUrl = "";
let revokeCount = 0;

beforeEach(() => {
  jest.clearAllMocks();
  mockObjectUrl = "";
  revokeCount = 0;
  global.URL.createObjectURL = jest.fn(() => { mockObjectUrl = "blob:test"; return mockObjectUrl; });
  global.URL.revokeObjectURL = jest.fn(() => { revokeCount++; });
  const anchor = { href: "", download: "", rel: "", click: mockAnchorClick, remove: jest.fn() };
  jest.spyOn(document, "createElement").mockReturnValue(anchor as unknown as HTMLElement);
  jest.spyOn(document.body, "appendChild").mockReturnValue(anchor as unknown as Node);
});

const mockWorksheet = {
  name: "Sheet1",
  eachRow: jest.fn((_: unknown, cb: (row: { eachCell: jest.Mock }, rn: number) => void) => {
    cb({ eachCell: jest.fn((__: unknown, cellCb: (cell: unknown, cn: number) => void) => {
      cellCb({ type: 2, value: "Hello", style: { font: { bold: true } } }, 1);
      cellCb({ type: 2, value: 42, style: {} }, 2);
      cellCb({ type: 6, value: { formula: "A1+B1", result: 43 }, formula: "A1+B1", result: 43, style: {} }, 3);
    }) }, 1);
  }),
  columns: [{ width: 10 }, { width: 15 }],
  model: { merges: [] },
};

const mockWorkbook = {
  xlsx: {
    load: jest.fn().mockResolvedValue(undefined),
    writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  },
  eachSheet: jest.fn((cb: (ws: typeof mockWorksheet, id: number) => void) => {
    cb(mockWorksheet, 1);
  }),
  addWorksheet: jest.fn(() => ({
    getCell: jest.fn(() => ({ value: null, font: {} })),
    columns: [],
    mergeCells: jest.fn(),
    getColumn: jest.fn(() => ({ width: 8 })),
  })),
  title: "",
};

jest.mock("exceljs", () => ({
  __esModule: true,
  default: { Workbook: jest.fn().mockImplementation(() => mockWorkbook) },
}));

jest.mock("papaparse", () => ({
  __esModule: true,
  default: {
    parse: jest.fn((text: string, _opts: unknown) => {
      const rows = text.split("\n").map((r) => r.split(","));
      return { data: rows };
    }),
  },
}));

describe("KB_SPREADSHEET_ACCEPT", () => {
  it("includes .xlsx and .csv extensions", () => {
    expect(KB_SPREADSHEET_ACCEPT).toContain(".xlsx");
    expect(KB_SPREADSHEET_ACCEPT).toContain(".csv");
  });
});

describe("readSpreadsheetFile — CSV", () => {
  function makeFile(name: string, content: string): File {
    return new File([content], name, { type: "text/csv" });
  }

  it("parses a simple CSV and strips the extension from the title", async () => {
    const { title, workbook } = await readSpreadsheetFile(makeFile("report.csv", "a,b\n1,2"));
    expect(title).toBe("report");
    expect(Array.isArray(workbook.sheets)).toBe(true);
    expect(workbook.sheets[0]).toMatchObject({ name: "report" });
  });

  it("strips a UTF-8 BOM before parsing", async () => {
    const withBom = "﻿a,b\n1,2";
    const { workbook } = await readSpreadsheetFile(makeFile("bom.csv", withBom));
    expect(workbook.sheets.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a file that contains NUL bytes", async () => {
    const binary = "col1,col2\nval,\u0000val";
    await expect(readSpreadsheetFile(makeFile("bin.csv", binary))).rejects.toThrow(
      /binary content/,
    );
  });

  it("rejects an unsupported file extension", async () => {
    const file = new File(["data"], "sheet.ods", { type: "application/octet-stream" });
    await expect(readSpreadsheetFile(file)).rejects.toThrow(/Unsupported file type/);
  });
});

describe("readSpreadsheetFile — XLSX", () => {
  it("reads an xlsx file and returns sheets with typed cells", async () => {
    const file = new File([new ArrayBuffer(8)], "data.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const { title, workbook } = await readSpreadsheetFile(file);
    expect(title).toBe("data");
    expect(workbook.sheets).toHaveLength(1);
    const sheet = workbook.sheets[0];
    expect(Array.isArray(sheet.cells)).toBe(true);
    expect(sheet.cells.some((c) => c.s !== undefined && c.s !== null)).toBe(true);
    expect(sheet.cells.some((c) => c.f === "=A1+B1")).toBe(true);
  });
});

describe("exportSpreadsheet — CSV", () => {
  it("triggers a download for the first sheet as CSV", async () => {
    const sheets = [{ name: "Sheet1", celldata: [{ r: 0, c: 0, v: { v: "hello", m: "hello" } }] }];
    await exportSpreadsheet(sheets, "my-file", "csv");
    expect(mockAnchorClick).toHaveBeenCalled();
  });

  it("prefixes a value starting with = to prevent formula injection", async () => {
    const injected = "=SUM(1,2)";
    let captured = "";
    global.URL.createObjectURL = jest.fn((blob: Blob) => {
      blob.text().then((t) => { captured = t; }).catch(() => {});
      return "blob:x";
    });
    const sheets = [{ name: "Sheet1", celldata: [{ r: 0, c: 0, v: { v: injected, m: injected } }] }];
    await exportSpreadsheet(sheets, "test", "csv");
    await new Promise((r) => setTimeout(r, 10));
    expect(captured).toContain(`'${injected}`);
  });

  it("prefixes values starting with + - @ as well", async () => {
    const cases = ["+foo", "-bar", "@baz"];
    for (const val of cases) {
      let captured = "";
      global.URL.createObjectURL = jest.fn((blob: Blob) => {
        blob.text().then((t) => { captured = t; }).catch(() => {});
        return "blob:x";
      });
      const sheets = [{ name: "S", celldata: [{ r: 0, c: 0, v: { v: val, m: val } }] }];
      await exportSpreadsheet(sheets, "t", "csv");
      await new Promise((r) => setTimeout(r, 10));
      expect(captured).toContain(`'${val}`);
    }
  });

  it("wraps cells containing commas in double-quotes", async () => {
    let captured = "";
    global.URL.createObjectURL = jest.fn((blob: Blob) => {
      blob.text().then((t) => { captured = t; }).catch(() => {});
      return "blob:x";
    });
    const val = "hello, world";
    const sheets = [{ name: "S", celldata: [{ r: 0, c: 0, v: { v: val, m: val } }] }];
    await exportSpreadsheet(sheets, "t", "csv");
    await new Promise((r) => setTimeout(r, 10));
    expect(captured).toContain(`"hello, world"`);
  });
});

describe("exportSpreadsheet — XLSX", () => {
  it("triggers a download for xlsx format", async () => {
    const sheets = [{ name: "Sheet1", celldata: [{ r: 0, c: 0, v: { v: "x", m: "x" } }] }];
    await exportSpreadsheet(sheets, "export", "xlsx");
    expect(mockAnchorClick).toHaveBeenCalled();
  });
});
