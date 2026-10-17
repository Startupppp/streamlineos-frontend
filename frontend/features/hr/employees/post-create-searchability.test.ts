import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";

function isPrefixOf(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  return prefix.every((part, index) => JSON.stringify(part) === JSON.stringify(key[index]));
}

describe("Flow 1 — a new hire must be findable by the debounced search straight after create", () => {
  const listKey = humanResourcesQueryKeys.hr.employees();

  it("invalidates the directory list key the create mutation shares with the search", async () => {
    const invalidated: unknown[] = [];
    await invalidateHrWorkforceQueries(
      {
        invalidateQueries: async (filters: { queryKey?: readonly unknown[] }) => {
          invalidated.push(filters.queryKey);
        },
      } as never,
      "u-new",
    );

    expect(invalidated).toContainEqual(listKey);
  });

  it("covers the searched list, its accumulated pages and the header counts under one prefix", () => {
    const searchedKey = humanResourcesQueryKeys.hr.employees({
      search: "Ada",
      limit: 20,
      isActive: "all",
    });
    const pagesKey = [...searchedKey, "pages"];
    const countsKey = humanResourcesQueryKeys.hr.employeeCounts({ search: "Ada" });

    expect(isPrefixOf(listKey, searchedKey)).toBe(true);
    expect(isPrefixOf(listKey, pagesKey)).toBe(true);
    expect(isPrefixOf(listKey, countsKey)).toBe(true);
  });
});
