import {
  importPreviewSchema,
  importReportSchema,
  ticketExportSchema,
} from "./import-export-contract";

const preview = {
  format: "csv",
  projectId: 42,
  fileError: null,
  summary: {
    totalRows: 3,
    importable: 1,
    invalid: 1,
    duplicateInFile: 1,
    duplicateExisting: 0,
  },
  rows: [{ rowNumber: 2, values: { title: "Ship it", status: "TODO" } }],
  issues: [
    { rowNumber: 3, field: "title", kind: "INVALID", message: "Title is required" },
    {
      rowNumber: 4,
      field: "title",
      kind: "DUPLICATE_IN_FILE",
      message: "Repeats the title on row 2",
    },
  ],
  confirmationToken: "abc123",
};

const report = {
  projectId: 42,
  format: "csv",
  mode: "atomic",
  idempotencyKey: "key-1",
  replayed: false,
  confirmationToken: "abc123",
  summary: { attempted: 2, imported: 1, skipped: 1, failed: 0, rolledBack: 0 },
  rows: [
    { rowNumber: 2, outcome: "IMPORTED", ticketId: 1005, message: null },
    { rowNumber: 3, outcome: "SKIPPED", ticketId: null, message: "Title is required" },
  ],
  issues: [],
};

describe("importPreviewSchema", () => {
  it("accepts the preview the service returns", () => {
    expect(importPreviewSchema.parse(preview).summary.importable).toBe(1);
  });

  it("accepts a preview that carries a file level failure and no token", () => {
    const parsed = importPreviewSchema.parse({
      ...preview,
      fileError: "The file is empty",
      rows: [],
      confirmationToken: null,
    });
    expect(parsed.confirmationToken).toBeNull();
  });

  it("rejects an issue kind the client has no branch for", () => {
    expect(() =>
      importPreviewSchema.parse({
        ...preview,
        issues: [{ rowNumber: 3, field: null, kind: "SOMETHING_NEW", message: "x" }],
      }),
    ).toThrow();
  });

  it("rejects a ticket priority outside the database enum", () => {
    expect(() =>
      importPreviewSchema.parse({
        ...preview,
        rows: [{ rowNumber: 2, values: { title: "A", status: "TODO", priority: "SOON" } }],
      }),
    ).toThrow();
  });

  it("keeps a nullable field distinct from a missing one", () => {
    const parsed = importPreviewSchema.parse({
      ...preview,
      rows: [{ rowNumber: 2, values: { title: "A", status: "TODO", dueDate: null } }],
    });
    expect(parsed.rows[0]?.values.dueDate).toBeNull();
  });
});

describe("importReportSchema", () => {
  it("accepts the report the service returns", () => {
    expect(importReportSchema.parse(report).summary.imported).toBe(1);
  });

  it("rejects an outcome the client has no branch for", () => {
    expect(() =>
      importReportSchema.parse({
        ...report,
        rows: [{ rowNumber: 2, outcome: "PARTIALLY", ticketId: null, message: null }],
      }),
    ).toThrow();
  });

  it("requires the replay flag, so a replay cannot be read as a fresh import", () => {
    const { replayed: _replayed, ...withoutFlag } = report;
    expect(() => importReportSchema.parse(withoutFlag)).toThrow();
  });
});

describe("ticketExportSchema", () => {
  it("accepts an export payload", () => {
    const parsed = ticketExportSchema.parse({
      format: "csv",
      filename: "build-project-42-tickets.csv",
      contentType: "text/csv",
      rowCount: 0,
      content: "title",
    });
    expect(parsed.rowCount).toBe(0);
  });

  it("rejects a format the client cannot render", () => {
    expect(() =>
      ticketExportSchema.parse({
        format: "xlsx",
        filename: "x",
        contentType: "text/csv",
        rowCount: 0,
        content: "",
      }),
    ).toThrow();
  });
});
