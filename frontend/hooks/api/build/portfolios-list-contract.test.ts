import { readFileSync } from "node:fs";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { portfolioPageContract, programListContract } from "./portfolios-schema";

const PORTFOLIOS_SERVICE = "src/modules/build/portfolios/portfolios.service.ts";
const PROGRAMS_SERVICE = "src/modules/build/portfolios/programs.service.ts";

function projectionKeys(relativePath: string, method: string): string[] {
  const source = readFileSync(backendPath(relativePath), "utf8");
  const start = source.indexOf(method);
  const selectAt = source.indexOf(".select({", start);
  const block = source.slice(selectAt, source.indexOf(".from(", selectAt));
  return [...block.matchAll(/^\s{8}(\w+):/gm)].map((match) => match[1]!);
}

const PORTFOLIO_ROW = {
  id: 3,
  orgId: "org-1",
  name: "Platform",
  description: null,
  ownerId: null,
  status: "ACTIVE",
  health: null,
  strategicGoal: null,
  createdBy: "user-1",
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
  projectCount: 2,
};

const PROGRAM_ROW = {
  id: 5,
  orgId: "org-1",
  portfolioId: 3,
  name: "Onboarding",
  description: null,
  ownerId: null,
  status: "ACTIVE",
  health: null,
  createdBy: "user-1",
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
  projectCount: 4,
};

describe("the portfolio and program list contracts describe the rows their endpoints actually send", () => {
  it("reaches both backend services, so a broken scan fails instead of passing vacuously", () => {
    expect(backendReachable(PORTFOLIOS_SERVICE)).toBe(true);
    expect(backendReachable(PROGRAMS_SERVICE)).toBe(true);
    expect(projectionKeys(PORTFOLIOS_SERVICE, "async listPortfolios(").length).toBeGreaterThanOrEqual(11);
    expect(projectionKeys(PROGRAMS_SERVICE, "async listPrograms(").length).toBeGreaterThanOrEqual(11);
  });

  it("asks for no column the portfolio projection omits, which is what threw once a portfolio existed", () => {
    const projected = new Set(projectionKeys(PORTFOLIOS_SERVICE, "async listPortfolios("));
    const required = Object.keys(portfolioPageContract.shape.data.element.shape);
    expect(required.filter((key) => !projected.has(key))).toEqual([]);
  });

  it("asks for no column the program projection omits, which is what threw once a program existed", () => {
    const projected = new Set(projectionKeys(PROGRAMS_SERVICE, "async listPrograms("));
    const required = Object.keys(programListContract.element.shape);
    expect(required.filter((key) => !projected.has(key))).toEqual([]);
  });

  it("keeps projectCount on both lists, so each page's count column reads the server value not a stripped zero", () => {
    expect(portfolioPageContract.parse({
      data: [PORTFOLIO_ROW],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    }).data[0]?.projectCount).toBe(2);
    expect(programListContract.parse([PROGRAM_ROW])[0]?.projectCount).toBe(4);
  });
});
