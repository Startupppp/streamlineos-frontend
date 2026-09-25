import { onboardEmployeeInputSchema } from "./hr";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";

const base = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+919876543210",
  whatsappSameAsPhone: true,
  gender: "FEMALE" as const,
  dateOfBirth: new Date("1990-01-01"),
  joiningDate: new Date("2026-10-01"),
  designation: "Engineer",
  departmentId: "dept-1",
  role: DEFAULT_INVITE_ROLE,
  employeeId: "",
};

function messages(input: object): string[] {
  const result = onboardEmployeeInputSchema.safeParse({ ...base, ...input });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("onboarding reporting validation (HRM-15 D2/D3, PRD §6)", () => {
  it("accepts a blank primary manager — the backend resolves it by policy", () => {
    expect(messages({})).toEqual([]);
  });

  it("requires a reason for a top-level role", () => {
    expect(messages({ topLevelRole: true })).toEqual(["Explain why this role has no reporting manager."]);
    expect(messages({ topLevelRole: true, topLevelRoleReason: "   " })).toEqual(["Explain why this role has no reporting manager."]);
    expect(messages({ topLevelRole: true, topLevelRoleReason: "Founder" })).toEqual([]);
  });

  it("refuses a top-level role that also names any manager", () => {
    const refusal = "A top-level role cannot also have a reporting manager.";
    expect(messages({ topLevelRole: true, topLevelRoleReason: "Founder", reportingManagerUserId: "u-m" })).toEqual([refusal]);
    expect(
      messages({ topLevelRole: true, topLevelRoleReason: "Founder", secondaryManagers: [{ managerUserId: "u-s" }] }),
    ).toEqual([refusal]);
  });

  it("refuses a secondary manager who duplicates the primary or another secondary", () => {
    expect(messages({ reportingManagerUserId: "u-m", secondaryManagers: [{ managerUserId: "u-m" }] })).toEqual([
      "Already the primary reporting manager.",
    ]);
    expect(messages({ secondaryManagers: [{ managerUserId: "u-s" }, { managerUserId: "u-s" }] })).toEqual([
      "Already added as an additional manager.",
    ]);
  });

  it("caps additional managers at three and labels at 60 characters", () => {
    const four = ["a", "b", "c", "d"].map((id) => ({ managerUserId: id }));
    expect(messages({ secondaryManagers: four })).toContain("At most three additional managers");
    expect(messages({ secondaryManagers: [{ managerUserId: "a", label: "x".repeat(61) }] })).toEqual([
      "Keep the label under 60 characters",
    ]);
  });

  it("asks for a manager on an added-but-empty secondary row", () => {
    expect(messages({ secondaryManagers: [{ managerUserId: "" }] })).toEqual(["Choose a manager or remove this row"]);
  });
});
