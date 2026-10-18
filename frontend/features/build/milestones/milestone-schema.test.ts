import { milestoneFormSchema } from "./milestone-schema";

const VALID = { name: "Beta", targetDate: "2026-10-30", status: "PENDING" as const };

describe("milestone name rule — spaces only is not a name", () => {
  it("rejects a spaces-only name with the required message", () => {
    const result = milestoneFormSchema.safeParse({ ...VALID, name: "   " });
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe("Name is required");
  });

  it("accepts and trims a padded name", () => {
    expect(milestoneFormSchema.parse({ ...VALID, name: "  Beta  " }).name).toBe("Beta");
  });
});
