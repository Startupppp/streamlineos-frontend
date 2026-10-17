import { groupPolicyVersions } from "./policies-page";
import type { HrPolicy } from "@/types/hr/policies";

function policy(id: number, name: string, version: number, status: HrPolicy["status"]): HrPolicy {
  return {
    id,
    orgId: "org-1",
    policyType: "leave",
    name,
    description: null,
    status,
    version,
    parentPolicyId: null,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    rules: {},
    priority: 0,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    scopes: [],
  };
}

describe("groupPolicyVersions", () => {
  it("shows one row per policy with its versions grouped and the latest version leading", () => {
    const rows = groupPolicyVersions([
      policy(3, "Annual leave", 3, "draft"),
      policy(9, "Sick leave", 1, "active"),
      policy(1, "Annual leave", 1, "archived"),
      policy(2, "Annual leave", 2, "active"),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].latest.id).toBe(3);
    expect(rows[0].versions.map((v) => v.version)).toEqual([1, 2, 3]);
    expect(rows[1].versions).toHaveLength(1);
  });
});
