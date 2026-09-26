import { auditExportJobContract } from "./restored-surfaces-schema";

const JOB_STATUSES = [
  "PENDING",
  "VALIDATING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
] as const;

function job(status: string) {
  return {
    id: 4,
    status,
    schemaVersion: 1,
    evidenceVersion: "L9001.A4400",
    sections: ["ledger"],
    scopeWarehouseIds: null,
    filterFrom: null,
    filterTo: null,
    ledgerRowCount: null,
    auditRowCount: null,
    checksumAlgorithm: "sha-256",
    checksum: null,
    byteLength: null,
    settledAt: null,
    failureReason: null,
    createdBy: "u1",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

describe("auditExportJobContract — the status vocabulary the database can produce", () => {
  it.each(JOB_STATUSES)(
    "accepts %s, which inv_job_status declares",
    (status) => {
      expect(auditExportJobContract.parse(job(status)).status).toBe(status);
    },
  );

  it("rejects READY, which no row can hold and which the panel used to branch on", () => {
    expect(() => auditExportJobContract.parse(job("READY"))).toThrow();
  });

  it("rejects a value from no vocabulary at all, so the rejection above is about the set and not about READY alone", () => {
    expect(() => auditExportJobContract.parse(job("SETTLING"))).toThrow();
  });
});
