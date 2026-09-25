import { queryKeys } from "@/lib/query-keys";
import { invalidateHrWorkforceQueries } from "./hr-workforce-cache";

describe("HR workforce cache invalidation", () => {
  it("invalidates every cross-surface projection and target detail", async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);

    await invalidateHrWorkforceQueries({ invalidateQueries } as never, "user-1");

    const invalidated = invalidateQueries.mock.calls.map(
      ([filter]: [{ queryKey: readonly unknown[] }]) => filter.queryKey,
    );
    expect(invalidated).toEqual(
      expect.arrayContaining([
        queryKeys.hr.employees(),
        queryKeys.hr.orgChart(),
        queryKeys.hr.directory(),
        queryKeys.hr.onboardingStatus(),
        queryKeys.directory.peopleAll,
        queryKeys.directory.workersAll,
        queryKeys.hr.employee("user-1"),
        queryKeys.hr.employeeStats("user-1"),
        queryKeys.hr.employeeEmployment("user-1"),
      ]),
    );
  });

  it("reaches every surface a reporting-line change moves (HRM-15 CONTRACT §5)", async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);

    await invalidateHrWorkforceQueries({ invalidateQueries } as never, "user-1", [queryKeys.hr.reportingManagerRequests()]);

    const invalidated = invalidateQueries.mock.calls.map(
      ([filter]: [{ queryKey: readonly unknown[] }]) => filter.queryKey,
    );
    expect(invalidated).toEqual(
      expect.arrayContaining([
        queryKeys.hr.reportingLine("user-1"),
        queryKeys.hr.managerCoverage(),
        queryKeys.hr.myTeam(),
        queryKeys.hr.myReportingLine(),
        queryKeys.hr.myApprovers(),
        queryKeys.hr.orgChart(),
        queryKeys.hr.reportingManagerRequests(),
      ]),
    );
  });

  it("invalidates the approver prefix every kind-specific lookup sits under", () => {
    const prefix = queryKeys.hr.myApprovers();
    expect(queryKeys.hr.myApprover("leave").slice(0, prefix.length)).toEqual(prefix);
  });
});
