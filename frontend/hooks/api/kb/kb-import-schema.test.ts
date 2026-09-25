import {
  kbImportJobListPageContract,
  kbExportJobListPageContract,
} from "./kb-import-schema";

const importJob = {
  id: 1,
  orgId: "org-1",
  sourceType: "markdown",
  fileKey: null,
  status: "completed" as const,
  totalItems: 3,
  processedItems: 3,
  succeededItems: 3,
  failedItems: 0,
  duplicateItems: 0,
  errorReport: null,
  createdById: "user-1",
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

const exportJob = {
  id: 2,
  orgId: "org-1",
  scopeType: "page",
  scopeId: 4,
  format: "markdown" as const,
  status: "completed" as const,
  fileKey: "exports/2.md",
  expiresAt: null,
  createdById: "user-1",
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

const pagination = { limit: 20, hasMore: false, nextCursor: null };

describe("kb import/export job list contracts", () => {
  it("accepts the cursor envelope the backend actually returns", () => {
    expect(
      kbImportJobListPageContract.parse({ data: [importJob], pagination }),
    ).toEqual({ data: [importJob], pagination });
    expect(
      kbExportJobListPageContract.parse({ data: [exportJob], pagination }),
    ).toEqual({ data: [exportJob], pagination });
  });

  it("rejects a bare array, the shape that broke the Import & Export page in production", () => {
    expect(() => kbImportJobListPageContract.parse([importJob])).toThrow();
    expect(() => kbExportJobListPageContract.parse([exportJob])).toThrow();
  });

  it("carries nextCursor through so history pages server-side", () => {
    const parsed = kbImportJobListPageContract.parse({
      data: [importJob],
      pagination: { limit: 20, hasMore: true, nextCursor: "cursor-2" },
    });
    expect(parsed.pagination.nextCursor).toBe("cursor-2");
    expect(parsed.pagination.hasMore).toBe(true);
  });
});
