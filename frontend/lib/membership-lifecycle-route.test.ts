import { getMembershipLifecycleDestination } from "./membership-lifecycle-route";

describe("getMembershipLifecycleDestination", () => {
  it("moves suspended memberships to the recovery screen", () => {
    expect(
      getMembershipLifecycleDestination("suspended", "/settings/users"),
    ).toBe("/access-suspended");
  });

  it("does not loop while already on the recovery screen", () => {
    expect(
      getMembershipLifecycleDestination("suspended", "/access-suspended"),
    ).toBeNull();
  });

  it("leaves recovery after an organization becomes active", () => {
    expect(
      getMembershipLifecycleDestination("active", "/access-suspended"),
    ).toBe("/dashboard");
  });

  it("does not hijack setup or feature navigation on an active org change", () => {
    expect(getMembershipLifecycleDestination("active", "/org-setup")).toBeNull();
    expect(
      getMembershipLifecycleDestination(
        "active",
        "/settings/users?view=invitations",
      ),
    ).toBeNull();
  });
});
