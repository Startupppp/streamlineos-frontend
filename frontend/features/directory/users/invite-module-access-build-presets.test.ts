import { INVITE_ACCESS_PRESETS, describeModuleAccess } from "./invite-module-access";

describe("INVITE_ACCESS_PRESETS — Build standings", () => {
  it("includes Build Member and Build Admin presets", () => {
    const member = INVITE_ACCESS_PRESETS.find((p) => p.id === "build-member");
    const admin = INVITE_ACCESS_PRESETS.find((p) => p.id === "build-admin");
    expect(member?.access).toEqual([{ moduleKey: "build", standing: "MEMBER" }]);
    expect(admin?.access).toEqual([{ moduleKey: "build", standing: "ADMIN" }]);
  });

  it("describes Build Member access", () => {
    expect(
      describeModuleAccess([{ moduleKey: "build", standing: "MEMBER" }]),
    ).toBe("Build Member");
  });
});
