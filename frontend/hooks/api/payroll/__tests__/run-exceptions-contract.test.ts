import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runExceptionsPageContract } from "../run-exceptions-schema";

interface OpenApiSchema {
  type?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
}

function exceptionsResponseSchema(): OpenApiSchema {
  const document = JSON.parse(
    readFileSync(join(process.cwd(), "contracts", "openapi.json"), "utf8"),
  );
  const operation = document.paths["/payroll/runs/{runId}/exceptions"].get;
  return operation.responses["200"].content["application/json"].schema.properties.data;
}

describe("GET /payroll/runs/{runId}/exceptions is a cursor page, not a bare array", () => {
  it("matches the vendored contract's envelope", () => {
    const schema = exceptionsResponseSchema();
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(expect.arrayContaining(["data", "pagination"]));
    expect(schema.properties?.data.type).toBe("array");
  });

  it("declares every pagination field the backend requires, including the total it now sends", () => {
    const schema = exceptionsResponseSchema();
    const backendFields = (schema.properties?.pagination.required ?? []).slice().sort();
    const frontendFields = Object.keys(
      runExceptionsPageContract.shape.pagination.shape,
    ).sort();

    expect(backendFields).toContain("total");
    expect(frontendFields).toEqual(backendFields);
  });

  it("declares every field the vendored contract requires on an item, and no field it omits", () => {
    const schema = exceptionsResponseSchema();
    const backendFields = (schema.properties?.data.items?.required ?? []).slice().sort();
    const frontendFields = Object.keys(runExceptionsPageContract.shape.data.element.shape).sort();
    expect(frontendFields).toEqual(backendFields);
  });

  it("parses a page the backend would send", () => {
    const parsed = runExceptionsPageContract.safeParse({
      data: [
        {
          id: 1,
          code: "MISSING_BANK_ACCOUNT",
          severity: "BLOCKER",
          status: "OPEN",
          message: "Ravi Kumar has no bank account on file.",
          metadata: null,
          userId: "u-2",
          resolvedBy: null,
          resolvedAt: null,
          overrideReason: null,
          createdAt: "2026-09-24T04:30:00.000Z",
          userName: "Ravi Kumar",
          userEmail: "ravi@alpha.test",
        },
      ],
      pagination: { limit: 100, hasMore: false, nextCursor: null, total: 1 },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects the bare array the frontend used to expect", () => {
    const parsed = runExceptionsPageContract.safeParse([]);
    expect(parsed.success).toBe(false);
  });
});
