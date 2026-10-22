import { DEFAULT_INVITE_ROLE, USER_INVITE_ROLES } from "@/lib/constants/user-invite-roles";

describe("invite role defaults", () => {
  it("defaults a new invite to the least-privileged role", () => {
    expect(DEFAULT_INVITE_ROLE).toBe("MEMBER");
  });

  it("offers the default as a selectable option", () => {
    expect(USER_INVITE_ROLES.some((r) => r.value === DEFAULT_INVITE_ROLE)).toBe(
      true,
    );
  });

  it("never lets ORG_ADMIN be the default", () => {
    expect(DEFAULT_INVITE_ROLE).not.toBe("ORG_ADMIN");
  });
});
