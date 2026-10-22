import {
  DISPLAY_NAME_MAX_LENGTH,
  WORKSPACE_VISIBLE_FIELDS,
  workspaceStepSchema,
} from "./basics-schema";

describe("workspace setup", () => {
  const valid = {
    displayName: "Acme",
    phone: "+919876543210",
    country: "IN",
    timezone: "Asia/Kolkata",
  };

  it("requires a workspace name, callable phone, country, and matching time zone", () => {
    expect(workspaceStepSchema.safeParse(valid).success).toBe(true);
    for (const field of ["displayName", "phone", "country", "timezone"] as const) {
      expect(workspaceStepSchema.safeParse({ ...valid, [field]: "" }).success).toBe(false);
    }
    expect(workspaceStepSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(workspaceStepSchema.safeParse({ ...valid, phone: "+911111111111" }).success).toBe(false);
    expect(workspaceStepSchema.safeParse({ ...valid, country: "ZZ" }).success).toBe(false);
    expect(workspaceStepSchema.safeParse({ ...valid, country: "US" }).success).toBe(false);
    expect(WORKSPACE_VISIBLE_FIELDS).toEqual(["displayName", "phone", "country", "timezone"]);
  });

  it("rejects names beyond the server's limit", () => {
    expect(workspaceStepSchema.safeParse({ ...valid, displayName: "a".repeat(DISPLAY_NAME_MAX_LENGTH) }).success).toBe(true);
    expect(workspaceStepSchema.safeParse({ ...valid, displayName: "a".repeat(DISPLAY_NAME_MAX_LENGTH + 1) }).success).toBe(false);
  });
});
