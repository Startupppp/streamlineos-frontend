import {
  errorReportFilename,
  previewIssuesCsv,
  reportFailuresCsv,
} from "./import-error-report";
import type {
  TicketImportPreview,
  TicketImportReport,
} from "./import-export-contract";

const preview: TicketImportPreview = {
  format: "csv",
  projectId: 42,
  fileError: null,
  summary: {
    totalRows: 3,
    importable: 1,
    invalid: 1,
    duplicateInFile: 0,
    duplicateExisting: 1,
  },
  rows: [{ rowNumber: 2, values: { title: "Ship it", status: "TODO" } }],
  issues: [
    { rowNumber: 3, field: "title", kind: "INVALID", message: "Title is required" },
    {
      rowNumber: 4,
      field: "title",
      kind: "DUPLICATE_EXISTING",
      message: 'A ticket "already, exists"',
    },
  ],
  confirmationToken: "token",
};

const report: TicketImportReport = {
  projectId: 42,
  format: "csv",
  mode: "atomic",
  idempotencyKey: "key-1",
  replayed: false,
  confirmationToken: "token",
  summary: { attempted: 2, imported: 0, skipped: 0, failed: 0, rolledBack: 2 },
  rows: [
    { rowNumber: 2, outcome: "ROLLED_BACK", ticketId: null, message: "batch failed" },
    { rowNumber: 3, outcome: "ROLLED_BACK", ticketId: null, message: "batch failed" },
  ],
  issues: [],
};

describe("previewIssuesCsv — a user cannot fix rows they can only read on screen", () => {
  it("writes a header naming the row, field, kind and message", () => {
    expect(previewIssuesCsv(preview).split("\n")[0]).toBe("rowNumber,field,kind,message");
  });

  it("writes one line per issue, in file order", () => {
    const lines = previewIssuesCsv(preview).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("3,title,INVALID,Title is required");
  });

  it("quotes a message containing a comma so the downloaded file reopens correctly", () => {
    expect(previewIssuesCsv(preview)).toContain(
      '4,title,DUPLICATE_EXISTING,"A ticket ""already, exists"""',
    );
  });

  it("renders a null field as empty rather than the word null", () => {
    const fieldless: TicketImportPreview = {
      ...preview,
      issues: [{ rowNumber: 5, field: null, kind: "INVALID", message: "Expected an object" }],
    };
    expect(previewIssuesCsv(fieldless).split("\n")[1]).toBe("5,,INVALID,Expected an object");
  });

  it("writes the header alone when a file had no issues, never an empty download", () => {
    const clean: TicketImportPreview = { ...preview, issues: [] };
    expect(previewIssuesCsv(clean)).toBe("rowNumber,field,kind,message");
  });
});

describe("reportFailuresCsv — a rolled-back commit must be downloadable too", () => {
  it("writes every row the commit did not write, with its outcome", () => {
    const lines = reportFailuresCsv(report).split("\n");
    expect(lines[0]).toBe("rowNumber,outcome,message");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("2,ROLLED_BACK,batch failed");
  });

  it("omits the rows that were imported, because those need no attention", () => {
    const partial: TicketImportReport = {
      ...report,
      rows: [
        { rowNumber: 2, outcome: "IMPORTED", ticketId: 9, message: null },
        { rowNumber: 3, outcome: "FAILED", ticketId: null, message: "duplicate key" },
      ],
    };
    const lines = reportFailuresCsv(partial).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("3,FAILED,duplicate key");
  });
});

describe("errorReportFilename", () => {
  it("names the project and the stage, so two downloads do not collide", () => {
    expect(errorReportFilename(42, "preview")).toBe("build-project-42-import-preview-errors.csv");
    expect(errorReportFilename(42, "commit")).toBe("build-project-42-import-commit-errors.csv");
  });
});
