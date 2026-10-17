import { hasChosenProfileName } from "./use-workspace-checklist-progress";

/**
 * HRMS-E2E-025's open item. Sign-up stores the email's local part as the name
 * (auth.service.ts), so an owner who never typed a name still has one, and the
 * "Complete your profile" step counted it as done. Nothing ever prompted them.
 */
describe("hasChosenProfileName", () => {
  it("does not count the email's local part, which sign-up stores as a placeholder", () => {
    expect(hasChosenProfileName("asha.verma", "asha.verma@example.com")).toBe(false);
    expect(hasChosenProfileName("  asha  ", "asha@example.com")).toBe(false);
  });

  it("counts a name the person typed, even one that differs from the local part only in case", () => {
    expect(hasChosenProfileName("Asha Verma", "asha.verma@example.com")).toBe(true);
    expect(hasChosenProfileName("Asha", "asha@example.com")).toBe(true);
  });

  it("does not count a blank or one-letter name", () => {
    expect(hasChosenProfileName("", "a@example.com")).toBe(false);
    expect(hasChosenProfileName("A", "b@example.com")).toBe(false);
  });

  it("counts a real name when the email is unknown", () => {
    expect(hasChosenProfileName("Asha Verma", undefined)).toBe(true);
  });
});
