import type { Permission } from "@/lib/rbac/permissions";
import { groupDelegationPermissions } from "./delegation-permissions";

const catalog: Permission[] = [
  {
    name: "crm:leads:view",
    resource: "crm:leads",
    action: "view",
    description: "View leads",
  },
  {
    name: "hr:employees:view",
    resource: "hr:employees",
    action: "view",
    description: "View employees",
  },
  {
    name: "settings:rbac:manage",
    resource: "settings:rbac",
    action: "manage",
    description: "Manage roles",
  },
];

describe("groupDelegationPermissions", () => {
  it("groups only server-approved grantable permissions by module", () => {
    expect(
      groupDelegationPermissions(
        catalog,
        ["crm:leads:view", "hr:employees:view"],
        "",
      ),
    ).toEqual([
      expect.objectContaining({
        key: "crm",
        label: "CRM",
        permissions: [expect.objectContaining({ name: "crm:leads:view" })],
      }),
      expect.objectContaining({
        key: "hr",
        label: "HR",
        permissions: [expect.objectContaining({ name: "hr:employees:view" })],
      }),
    ]);
  });

  it("searches names and descriptions without leaking non-grantable keys", () => {
    const result = groupDelegationPermissions(
      catalog,
      ["crm:leads:view", "hr:employees:view"],
      "employees",
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.permissions.map((permission) => permission.name)).toEqual([
      "hr:employees:view",
    ]);
  });
});
