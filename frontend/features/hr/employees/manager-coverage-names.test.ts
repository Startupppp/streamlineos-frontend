import type { ManagerCoverageReport } from "@/hooks/api/hr/reporting-lines-schema";
import { circularChainRows } from "./manager-coverage-names";

function report(overrides: Partial<ManagerCoverageReport>): ManagerCoverageReport {
  return {
    generatedAt: "2026-09-26T00:00:00Z",
    spanOfControlLimit: 12,
    summary: { employees: 3, withManager: 3, withoutManager: 0, inactiveManager: 0, circular: 1, overSpan: 0 },
    withoutManager: [],
    inactiveManager: [],
    circular: [{ userIds: ["u-a", "u-b", "u-c"] }],
    overSpan: [],
    ...overrides,
  };
}

describe("circularChainRows — a reporting loop is shown by name, never by user id", () => {
  it("names members from the member lookup and from the rest of the report", () => {
    const rows = circularChainRows(
      report({
        inactiveManager: [
          { userId: "u-x", name: "Xavier", managerUserId: "u-b", managerName: "Bea", managerState: "exited", effectiveFrom: "2026-01-01" },
        ],
      }),
      new Map([["u-a", "Asha"]]),
    );

    expect(rows).toEqual([
      {
        key: "u-a>u-b>u-c",
        members: [
          { userId: "u-a", name: "Asha" },
          { userId: "u-b", name: "Bea" },
          { userId: "u-c", name: null },
        ],
      },
    ]);
  });

  it("prefers the member lookup over a name from the report", () => {
    const rows = circularChainRows(
      report({ overSpan: [{ managerUserId: "u-a", managerName: "Old name", directReports: 20 }] }),
      new Map([["u-a", "Asha Rao"]]),
    );
    expect(rows[0]?.members[0]).toEqual({ userId: "u-a", name: "Asha Rao" });
  });

  it("never falls back to the id as a display name", () => {
    const rows = circularChainRows(report({}), new Map());
    for (const member of rows[0]?.members ?? []) expect(member.name).not.toBe(member.userId);
  });
});
