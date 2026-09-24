import { readFileSync } from "node:fs";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { portfolioPageContract, programPageContract } from "./portfolios-schema";

const PORTFOLIOS_SERVICE = "src/modules/build/portfolios/portfolios.service.ts";
const PROGRAMS_SERVICE = "src/modules/build/portfolios/programs.service.ts";
const LAST_PAGE = { limit: 50, hasMore: false, nextCursor: null };

function projectionKeys(relativePath: string, method: string): string[] {
  const source = readFileSync(backendPath(relativePath), "utf8");
  const start = source.indexOf(method);
  const selectAt = source.indexOf(".select({", start);
  const block = source.slice(selectAt, source.indexOf(".from(", selectAt));
  return [...block.matchAll(/^\s{8}(\w+):/gm)].map((match) => match[1]!);
}

function firstRowKeys<T extends object>(rows: T[]): string[] {
  const row = rows[0];
  if (row === undefined) throw new Error("Expected a parsed contract row");
  return Object.keys(row);
}

const PORTFOLIO_ROW = {
  id: 3,
  orgId: "org-1",
  name: "Platform",
  description: null,
  ownerId: null,
  status: "active",
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
  status: "active",
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
    const required = firstRowKeys(portfolioPageContract.parse({
      data: [PORTFOLIO_ROW],
      pagination: LAST_PAGE,
    }).data);
    expect(required.filter((key) => !projected.has(key))).toEqual([]);
  });

  it("asks for no column the program projection omits, which is what threw once a program existed", () => {
    const projected = new Set(projectionKeys(PROGRAMS_SERVICE, "async listPrograms("));
    const required = firstRowKeys(programPageContract.parse({
      data: [PROGRAM_ROW],
      pagination: LAST_PAGE,
    }).data);
    expect(required.filter((key) => !projected.has(key))).toEqual([]);
  });

  it("keeps projectCount on both lists, so each page's count column reads the server value not a stripped zero", () => {
    expect(portfolioPageContract.parse({
      data: [PORTFOLIO_ROW],
      pagination: LAST_PAGE,
    }).data[0]?.projectCount).toBe(2);
    expect(programPageContract.parse({
      data: [PROGRAM_ROW],
      pagination: LAST_PAGE,
    }).data[0]?.projectCount).toBe(4);
  });

  it("rejects a status the portfolio pgEnum never emits, where the previous z.string() waved it through", () => {
    expect(() => portfolioPageContract.parse({
      data: [{ ...PORTFOLIO_ROW, status: "ACTIVE" }],
      pagination: LAST_PAGE,
    })).toThrow();
  });

  it("rejects a health value outside the portfolio health pgEnum on both lists", () => {
    expect(() => portfolioPageContract.parse({
      data: [{ ...PORTFOLIO_ROW, health: "green" }],
      pagination: LAST_PAGE,
    })).toThrow();
    expect(() => programPageContract.parse({
      data: [{ ...PROGRAM_ROW, health: "green" }],
      pagination: LAST_PAGE,
    })).toThrow();
  });

  it("describes the program list as a cursor page, matching the keyset the service now returns", () => {
    const page = programPageContract.parse({ data: [], pagination: LAST_PAGE });
    expect(Object.keys(page)).toEqual(["data", "pagination"]);
  });
});
