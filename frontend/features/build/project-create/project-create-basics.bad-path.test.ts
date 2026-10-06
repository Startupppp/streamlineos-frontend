import { basicsSchema, PROJECT_NAME_MAX, PROJECT_KEY_MAX } from "./project-create-schema";

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
