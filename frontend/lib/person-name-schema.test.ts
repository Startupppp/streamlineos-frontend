import { hrPersonNameField } from "./person-name-schema";

const schema = hrPersonNameField("First name");

describe("hrPersonNameField", () => {
  it("accepts a simple ASCII name", () => {
    expect(schema.safeParse("Alice").success).toBe(true);
  });

  it("accepts a name with hyphen and apostrophe", () => {
    expect(schema.safeParse("O'Brien-Smith").success).toBe(true);
  });

  it("accepts a name with curly apostrophe", () => {
    expect(schema.safeParse("D’Souza").success).toBe(true);
  });

  it("accepts Unicode letters with diacritics", () => {
    expect(schema.safeParse("Ñúñez").success).toBe(true);
    expect(schema.safeParse("José").success).toBe(true);
    expect(schema.safeParse("Nguyễn").success).toBe(true);
  });

  it("rejects a name with digits and returns the specific message", () => {
    const result = schema.safeParse("Ab1");
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Numbers are not allowed in names");
    }
  });

  it("returns digits message before shape message when both fail", () => {
    const result = schema.safeParse("123");
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages[0]).toBe("Numbers are not allowed in names");
    }
  });

  it("HRM-B-013: rejects HTML tags with the angle-bracket message, not the digit or shape message", () => {
    for (const input of ["<b>x</b>", "<script>alert(1)</script>"]) {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages[0]).toBe("Angle brackets are not allowed in names");
        expect(messages).not.toContain("Numbers are not allowed in names");
      }
    }
  });

  it("rejects empty string with required message", () => {
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("First name is required");
      expect(messages).not.toContain(
        "Names can contain letters, spaces, apostrophes, periods and hyphens",
      );
    }
  });

  it("rejects whitespace-only string with required message", () => {
    const result = schema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("First name is required");
    }
  });

  it("rejects a name over 100 characters", () => {
    const result = schema.safeParse("A".repeat(101));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("First name must be at most 100 characters");
    }
  });

  it("accepts a name of exactly 100 characters", () => {
    expect(schema.safeParse("A".repeat(100)).success).toBe(true);
  });
});
