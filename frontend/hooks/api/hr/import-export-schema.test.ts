import { hrImportJobDetailContract } from "@/hooks/api/hr/import-export-schema";

/**
 * The body of `GET /hr/import/jobs/:jobId` as it crosses the wire (`hrImportJobDetailSchema`): dates are ISO strings,
 * `errorRows` are `hr_import_rows` rows with status 'error', and a row that never committed has no record ref.
 */
const LIVE_JOB = {
  id: "0b6c1f0e-6f0a-4d0e-8f4e-2f6f8f6f0a01",
  orgId: "org-1",
  entity: "employees",
  fileName: "people.csv",
  status: "committed",
  totalRows: 30,
  validRows: 12,
  errorRows: 3,
  createdRows: 10,
  updatedRows: 1,
  unchangedRows: 1,
  errors: [{ row: 4, field: "email", message: "Invalid email" }, { row: 9, message: "Missing hire date" }],
  createdBy: "user-1",
  committedAt: "2026-09-25T10:00:00.000Z",
  rolledBackAt: null,
  createdAt: "2026-09-25T09:55:00.000Z",
};

const LIVE_ROW = {
  id: "5d2d6e35-2c2f-4a52-9d55-0c6c2f7a0b11",
  orgId: "org-1",
  jobId: LIVE_JOB.id,
  rowNumber: 4,
  payload: { email: "not-an-email", firstName: "Ada" },
  status: "error",
  error: "Invalid email",
  createdRecordRef: null,
};

const LIVE_DETAIL = { job: LIVE_JOB, errorRows: [LIVE_ROW, { ...LIVE_ROW, id: "row-2", rowNumber: 21, error: "No employee has the work email a@b.com." }] };

/** `source` minus one key: the body a backend that dropped or renamed that field would send. */
function without(source: object, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));
}

describe("hrImportJobDetailContract", () => {
  it("parses the shape HrImportService.getJob returns, keeping the fields the import screens read", () => {
    const parsed = hrImportJobDetailContract.parse(LIVE_DETAIL);

    expect(parsed.job.status).toBe("committed");
    expect(parsed.job.errorRows).toBe(3);
    expect(parsed.job.totalRows).toBe(30);
    expect(parsed.job.validRows).toBe(12);
    expect(parsed.job.errors?.[1]).toEqual({ row: 9, message: "Missing hire date" });
    expect(parsed.errorRows).toHaveLength(2);
    expect(parsed.errorRows[0]).toMatchObject({ rowNumber: 4, status: "error", error: "Invalid email", createdRecordRef: null });
    expect(parsed.errorRows[1]?.error).toBe("No employee has the work email a@b.com.");
  });

  it("accepts a job with no error rows and a previewed job that has not been committed", () => {
    const previewed = { job: { ...LIVE_JOB, status: "previewed", committedAt: null, validRows: 27, errorRows: 3, createdRows: 0, updatedRows: 0, unchangedRows: 0 }, errorRows: [] };

    expect(hrImportJobDetailContract.safeParse(previewed).success).toBe(true);
    expect(hrImportJobDetailContract.parse(previewed).errorRows).toEqual([]);
  });

  it("accepts a row that carries a record ref, with or without the outcome older rows never had", () => {
    const committed = { ...LIVE_ROW, status: "committed", error: null };
    const withOutcome = { ...committed, createdRecordRef: { table: "assets", id: 12, outcome: "created" } };
    const withoutOutcome = { ...committed, createdRecordRef: { table: "assets", id: "12" } };

    expect(hrImportJobDetailContract.parse({ job: LIVE_JOB, errorRows: [withOutcome] }).errorRows[0]?.createdRecordRef).toEqual({ table: "assets", id: 12, outcome: "created" });
    expect(hrImportJobDetailContract.parse({ job: LIVE_JOB, errorRows: [withoutOutcome] }).errorRows[0]?.createdRecordRef).toEqual({ table: "assets", id: "12" });
  });

  it("tolerates a field the backend adds later, like the other contracts that are not strict", () => {
    const withExtra = { job: { ...LIVE_JOB, addedLater: true }, errorRows: [{ ...LIVE_ROW, addedLater: 1 }], addedLater: [] };

    expect(hrImportJobDetailContract.safeParse(withExtra).success).toBe(true);
  });

  it("rejects a body with no errorRows or no job, so a renamed field fails loudly instead of rendering empty", () => {
    expect(hrImportJobDetailContract.safeParse(LIVE_DETAIL).success).toBe(true);

    expect(hrImportJobDetailContract.safeParse(without(LIVE_DETAIL, "errorRows")).success).toBe(false);
    expect(hrImportJobDetailContract.safeParse(without(LIVE_DETAIL, "job")).success).toBe(false);
    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: null }).success).toBe(false);
  });

  it("rejects a job missing a counter the screens read", () => {
    expect(hrImportJobDetailContract.safeParse(LIVE_DETAIL).success).toBe(true);

    for (const counter of ["totalRows", "validRows", "errorRows", "createdRows", "updatedRows", "unchangedRows", "status"] as const) {
      const result = hrImportJobDetailContract.safeParse({ job: without(LIVE_JOB, counter), errorRows: [LIVE_ROW] });
      expect({ counter, success: result.success }).toEqual({ counter, success: false });
    }
  });

  it("rejects an error row missing the row number or the reason, or with a status the backend never writes", () => {
    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [LIVE_ROW] }).success).toBe(true);

    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [without(LIVE_ROW, "rowNumber")] }).success).toBe(false);
    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [without(LIVE_ROW, "error")] }).success).toBe(false);
    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [{ ...LIVE_ROW, status: "skipped" }] }).success).toBe(false);
    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [{ ...LIVE_ROW, rowNumber: "4" }] }).success).toBe(false);
  });

  it("rejects a record ref that is not a table and an id", () => {
    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [{ ...LIVE_ROW, createdRecordRef: { table: "assets", id: 3 } }] }).success).toBe(true);

    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [{ ...LIVE_ROW, createdRecordRef: "assets:3" }] }).success).toBe(false);
    expect(hrImportJobDetailContract.safeParse({ job: LIVE_JOB, errorRows: [{ ...LIVE_ROW, createdRecordRef: { table: "assets" } }] }).success).toBe(false);
  });
});
