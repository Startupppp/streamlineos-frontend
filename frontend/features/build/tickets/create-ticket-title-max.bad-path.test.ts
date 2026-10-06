import { createTicketInputSchema } from "@/lib/validation/projects";

describe("Create Issue title max length (D1)", () => {
  it("rejects titles over 200 characters instead of truncating", () => {
    const title = "a".repeat(250);
    const result = createTicketInputSchema.safeParse({
      projectId: 1,
      title,
      type: "TASK",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("200"))).toBe(
        true,
      );
    }
  });

  it("accepts a 200-character title", () => {
    const result = createTicketInputSchema.safeParse({
      projectId: 1,
      title: `Title ${"a".repeat(194)}`,
      type: "TASK",
    });
    expect(result.success).toBe(true);
  });
});
