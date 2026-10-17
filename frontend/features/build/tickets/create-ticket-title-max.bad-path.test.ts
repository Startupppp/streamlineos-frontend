import { createTicketInputSchema, TICKET_TITLE_MAX } from "@/lib/validation/projects";

describe("Create Issue title max length (D1)", () => {
  it("rejects titles over 500 characters instead of truncating", () => {
    const title = "a".repeat(550);
    const result = createTicketInputSchema.safeParse({
      projectId: 1,
      title,
      type: "TASK",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes(String(TICKET_TITLE_MAX)),
        ),
      ).toBe(true);
    }
  });

  it("accepts a title at the backend max length", () => {
    const result = createTicketInputSchema.safeParse({
      projectId: 1,
      title: `Title ${"a".repeat(TICKET_TITLE_MAX - 6)}`,
      type: "TASK",
    });
    expect(result.success).toBe(true);
  });
});
