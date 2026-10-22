import { toAnalyticsCsvRows } from "./analytics-export-button";
import type { HrAnalyticsData } from "@/hooks/api/hr/analytics";

const DATA: HrAnalyticsData = {
  headcount: { total: 5, active: 4, newThisMonth: 1 },
  departments: [{ name: "QA Dept", count: 2 }],
  gender: [],
  roles: [],
  attendance: { totalLogsThisMonth: 12 },
  leaves: { byStatus: { APPROVED: 3 }, byMonth: [] },
  payroll: { totalCostYTD: "1000.00" },
  expenses: { approvedYTD: "0" },
  joiningExitsTrend: [{ month: "2026-10", joins: 1, exits: 0 }],
};

it("flattens every analytics section into section/metric/value rows", () => {
  const rows = toAnalyticsCsvRows(DATA);
  expect(rows).toContainEqual({ section: "Headcount", metric: "Total", value: 5 });
  expect(rows).toContainEqual({ section: "Department", metric: "QA Dept", value: 2 });
  expect(rows).toContainEqual({ section: "Leave by status", metric: "APPROVED", value: 3 });
  expect(rows).toContainEqual({ section: "Exits", metric: "2026-10", value: 0 });
});
