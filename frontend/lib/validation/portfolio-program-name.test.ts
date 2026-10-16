import { portfolioOrProgramNameSchema } from "./projects";

describe("portfolioOrProgramNameSchema — B-074: whitespace-only names are rejected", () => {
  it.each([
    ["empty string", ""],
    ["single space", " "],
    ["multiple spaces", "   "],
    ["tab character", "\t"],
    ["newline", "\n"],
    ["space-tab mix", " \t "],
  ])("rejects %s as a name", (_label, input) => {
    expect(portfolioOrProgramNameSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ["plain word", "Alpha"],
    ["word with surrounding spaces (trimmed)", "  Beta  "],
    ["max length", "a".repeat(255)],
  ])("accepts %s as a name", (_label, input) => {
    expect(portfolioOrProgramNameSchema.safeParse(input).success).toBe(true);
  });

  it("trims surrounding whitespace from a valid name so the stored value is clean", () => {
    const result = portfolioOrProgramNameSchema.safeParse("  Portfolio A  ");
    expect(result.success && result.data).toBe("Portfolio A");
  });

  it("rejects a name that is 256 characters long", () => {
    expect(portfolioOrProgramNameSchema.safeParse("a".repeat(256)).success).toBe(false);
  });
});
