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
});
