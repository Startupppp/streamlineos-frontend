import { createEpicSchema, editEpicSchema } from "./epic-schema";

function firstTitleMessage(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

describe("epic title rule — a blank title reads as required, not as too short (U-005)", () => {
  it("create says the epic title is required for spaces only", () => {
    expect(firstTitleMessage(createEpicSchema.safeParse({ title: "   ", priority: "LOW" }))).toBe("Epic title is required");
  });

  it("edit says the title is required for spaces only", () => {
    expect(
      firstTitleMessage(editEpicSchema.safeParse({ title: "   ", priority: "LOW", status: "TODO" })),
    ).toBe("Title is required");
  });

  it("keeps the 3-character minimum for a short real title", () => {
    expect(firstTitleMessage(createEpicSchema.safeParse({ title: "ab", priority: "LOW" }))).toBe(
      "Title must be at least 3 characters",
    );
  });

  it("saves the trimmed title", () => {
    expect(createEpicSchema.parse({ title: "  Checkout  ", priority: "LOW" }).title).toBe("Checkout");
  });
});
