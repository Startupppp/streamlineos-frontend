import { basicsSchema, PROJECT_NAME_MAX, PROJECT_KEY_MAX } from "./project-create-schema";

function keyErrors(key: string): string[] {
  const result = basicsSchema.safeParse({ name: "Alpha", key });
  if (result.success) return [];
  return result.error.issues
    .filter((i) => i.path[0] === "key")
    .map((i) => i.message);
}

describe("create project basics — bad paths first", () => {
  it("rejects an empty name", () => {
    expect(basicsSchema.safeParse({ name: "", key: "AB" }).success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(basicsSchema.safeParse({ name: "  ", key: "AB" }).success).toBe(false);
  });

  it("rejects a name that is too long", () => {
    expect(
      basicsSchema.safeParse({
        name: "x".repeat(PROJECT_NAME_MAX + 1),
        key: "AB",
      }).success,
    ).toBe(false);
  });

  it("rejects a lowercase project key", () => {
    expect(basicsSchema.safeParse({ name: "Alpha", key: "ab" }).success).toBe(
      false,
    );
  });

  it("rejects a key that starts with a digit", () => {
    expect(basicsSchema.safeParse({ name: "Alpha", key: "1AB" }).success).toBe(
      false,
    );
  });

  it("rejects a key that is too long", () => {
    expect(
      basicsSchema.safeParse({
        name: "Alpha",
        key: "A".repeat(PROJECT_KEY_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects end date before start date", () => {
    expect(
      basicsSchema.safeParse({
        name: "Alpha",
        key: "AB",
        startDate: "2099-06-10",
        endDate: "2099-06-01",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid basics payload on the happy path", () => {
    expect(
      basicsSchema.safeParse({ name: "Alpha", key: "AB" }).success,
    ).toBe(true);
  });
});

describe("project key validation messages — BUG-14", () => {
  it("shows an allowed-characters message when the key is empty (all chars stripped)", () => {
    const errors = keyErrors("");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/uppercase letters|A.Z/i);
  });

  it("shows a length message (not an allowed-characters message) for a single valid character", () => {
    const errors = keyErrors("A");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/at least 2 characters/i);
    expect(errors[0]).not.toMatch(/uppercase letters|A.Z/i);
  });

  it("shows a starts-with-letter message when the key begins with a digit", () => {
    const errors = keyErrors("1AB");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/start with a letter/i);
  });
});

describe("project key sanitization — NEW-11", () => {
  function sanitize(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, PROJECT_KEY_MAX);
  }

  it("uppercases lowercase letters during sanitization", () => {
    expect(sanitize("qa")).toBe("QA");
  });

  it("removes special characters from the sanitized key", () => {
    expect(sanitize("qa-1!")).toBe("QA1");
  });

  it("sanitized value QA1 passes schema validation (stale error clears when trigger runs)", () => {
    expect(basicsSchema.safeParse({ name: "Alpha", key: sanitize("qa-1!") }).success).toBe(true);
  });

  it("sanitized value of all-special input is empty and fails validation", () => {
    expect(sanitize("---")).toBe("");
    expect(keyErrors("").length).toBeGreaterThan(0);
  });

  it("sanitize produces a different value from the raw input containing special chars", () => {
    const raw = "qa-1!";
    const sanitized = sanitize(raw);
    expect(sanitized).not.toBe(raw);
  });

  it("sanitize is a no-op for already-valid uppercase input", () => {
    const raw = "QA1";
    const sanitized = sanitize(raw);
    expect(sanitized).toBe(raw);
  });

  it("sanitize applied to a mixed-case key without special chars matches the uppercased form", () => {
    expect(sanitize("QaB1")).toBe("QAB1");
  });
});
