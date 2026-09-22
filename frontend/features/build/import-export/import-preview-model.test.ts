import type {
  TicketImportPreview,
  TicketImportReport,
} from "./import-export-contract";
import {
  canCommit,
  failedRows,
  fieldsWithIssues,
  previewHeadline,
  reportHeadline,
  rowsNeedingAttention,
  toPreviewRowViews,
} from "./import-preview-model";

function makePreview(overrides: Partial<TicketImportPreview> = {}): TicketImportPreview {
  return {
    format: "csv",
    projectId: 42,
    fileError: null,
    summary: {
      totalRows: 0,
      importable: 0,
      invalid: 0,
      duplicateInFile: 0,
      duplicateExisting: 0,
    },
    rows: [],
    issues: [],
    confirmationToken: null,
    ...overrides,
  };
}

function makeReport(overrides: Partial<TicketImportReport> = {}): TicketImportReport {
  return {
    projectId: 42,
    format: "csv",
    mode: "atomic",
    idempotencyKey: null,
    replayed: false,
    confirmationToken: "token",
    summary: { attempted: 0, imported: 0, skipped: 0, failed: 0, rolledBack: 0 },
    rows: [],
    issues: [],
    ...overrides,
  };
}

const mixedPreview = makePreview({
  summary: {
    totalRows: 4,
    importable: 1,
    invalid: 2,
    duplicateInFile: 1,
    duplicateExisting: 0,
  },
  rows: [{ rowNumber: 2, values: { title: "Ship it", status: "TODO" } }],
  issues: [
    { rowNumber: 5, field: "title", kind: "DUPLICATE_IN_FILE", message: "Repeats row 2" },
    { rowNumber: 3, field: "title", kind: "INVALID", message: "Title is required" },
    { rowNumber: 4, field: "points", kind: "INVALID", message: '"soon" is not a number' },
  ],
  confirmationToken: "token",
});

describe("toPreviewRowViews", () => {
  it("interleaves importable and rejected rows in file order", () => {
    expect(toPreviewRowViews(mixedPreview).map((view) => view.rowNumber)).toEqual([
      2, 3, 4, 5,
    ]);
  });

  it("marks the rows that will be written", () => {
    const view = toPreviewRowViews(mixedPreview).find((row) => row.rowNumber === 2);
    expect(view).toEqual({ rowNumber: 2, title: "Ship it", state: "IMPORTABLE", issues: [] });
  });

  it("carries every issue raised against one row", () => {
    const preview = makePreview({
      issues: [
        { rowNumber: 3, field: "title", kind: "INVALID", message: "Title is required" },
        { rowNumber: 3, field: "points", kind: "INVALID", message: "not a number" },
      ],
    });
    expect(toPreviewRowViews(preview)[0]?.issues).toHaveLength(2);
  });
});

describe("rowsNeedingAttention", () => {
  it("puts invalid rows ahead of duplicates", () => {
    expect(rowsNeedingAttention(mixedPreview).map((view) => view.state)).toEqual([
      "INVALID",
      "INVALID",
      "DUPLICATE_IN_FILE",
    ]);
  });

  it("is empty for a clean file", () => {
    const clean = makePreview({
      rows: [{ rowNumber: 2, values: { title: "A", status: "TODO" } }],
      confirmationToken: "token",
    });
    expect(rowsNeedingAttention(clean)).toEqual([]);
  });
});

describe("fieldsWithIssues", () => {
  it("counts issues per field, busiest first", () => {
    expect(fieldsWithIssues(mixedPreview)).toEqual([
      { field: "title", count: 2 },
      { field: "points", count: 1 },
    ]);
  });

  it("ignores issues that name no field", () => {
    const preview = makePreview({
      issues: [{ rowNumber: 2, field: null, kind: "INVALID", message: "Expected 2 columns" }],
    });
    expect(fieldsWithIssues(preview)).toEqual([]);
  });
});

describe("canCommit", () => {
  it("is false when the file could not be read at all", () => {
    expect(canCommit(makePreview({ fileError: "The file is empty" }))).toBe(false);
  });

  it("is false when no row survived validation", () => {
    expect(canCommit(makePreview({ confirmationToken: null }))).toBe(false);
  });

  it("is true when the service issued a confirmation token", () => {
    expect(canCommit(mixedPreview)).toBe(true);
  });
});

describe("previewHeadline", () => {
  it("leads with the file error when there is one", () => {
    expect(previewHeadline(makePreview({ fileError: "The file is empty" }))).toBe(
      "The file is empty",
    );
  });

  it("counts what will be written and what will not", () => {
    expect(previewHeadline(mixedPreview)).toBe("1 row ready to import, 3 skipped");
  });

  it("says so plainly when nothing can be imported", () => {
    const preview = makePreview({
      summary: {
        totalRows: 1,
        importable: 0,
        invalid: 1,
        duplicateInFile: 0,
        duplicateExisting: 0,
      },
    });
    expect(previewHeadline(preview)).toBe("Nothing to import — 1 row need attention");
  });

  it("drops the skipped clause for a clean file", () => {
    const preview = makePreview({
      summary: {
        totalRows: 2,
        importable: 2,
        invalid: 0,
        duplicateInFile: 0,
        duplicateExisting: 0,
      },
    });
    expect(previewHeadline(preview)).toBe("2 rows ready to import");
  });
});

describe("reportHeadline", () => {
  it("names a replay so a retry is not read as a second import", () => {
    const report = makeReport({
      replayed: true,
      summary: { attempted: 3, imported: 3, skipped: 0, failed: 0, rolledBack: 0 },
    });
    expect(reportHeadline(report)).toBe("Already imported — 3 rows");
  });

  it("says nothing was written when the import rolled back", () => {
    const report = makeReport({
      summary: { attempted: 2, imported: 0, skipped: 0, failed: 0, rolledBack: 2 },
    });
    expect(reportHeadline(report)).toBe("Import rolled back — no row was written");
  });

  it("reports partial outcomes together", () => {
    const report = makeReport({
      summary: { attempted: 5, imported: 3, skipped: 1, failed: 1, rolledBack: 0 },
    });
    expect(reportHeadline(report)).toBe("3 rows imported, 1 failed, 1 skipped");
  });
});

describe("failedRows", () => {
  it("collects the rows a retry would have to cover", () => {
    const report = makeReport({
      rows: [
        { rowNumber: 2, outcome: "IMPORTED", ticketId: 1, message: null },
        { rowNumber: 3, outcome: "FAILED", ticketId: null, message: "unique violation" },
        { rowNumber: 4, outcome: "SKIPPED", ticketId: null, message: "duplicate" },
        { rowNumber: 5, outcome: "ROLLED_BACK", ticketId: null, message: "connection lost" },
      ],
    });
    expect(failedRows(report).map((row) => row.rowNumber)).toEqual([3, 5]);
  });
});
