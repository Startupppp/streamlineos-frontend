import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";

describe("useRevokeGrant — portal projection cache purge", () => {
  it("portal.all prefix key covers both the project list and every project overview", () => {
    const all = directoryAndOwnershipQueryKeys.portal.all;
    const list = directoryAndOwnershipQueryKeys.portal.projects();
    const overview = directoryAndOwnershipQueryKeys.portal.projectOverview(42);

    expect(list.slice(0, all.length)).toEqual([...all]);
    expect(overview.slice(0, all.length)).toEqual([...all]);
  });

  it("portal.all is a static array, not a factory — invalidateQueries with it is always non-empty", () => {
    const all = directoryAndOwnershipQueryKeys.portal.all;
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it("portal.all prefix-matches the project list key", () => {
    const all = directoryAndOwnershipQueryKeys.portal.all;
    const list = directoryAndOwnershipQueryKeys.portal.projects();
    expect(list.join(",").startsWith(all.join(","))).toBe(true);
  });

  it("portal.all prefix-matches every projectOverview key regardless of projectId", () => {
    const all = directoryAndOwnershipQueryKeys.portal.all;
    for (const id of [1, 42, 9999]) {
      const ov = directoryAndOwnershipQueryKeys.portal.projectOverview(id);
      expect(ov.join(",").startsWith(all.join(","))).toBe(true);
    }
  });
});
