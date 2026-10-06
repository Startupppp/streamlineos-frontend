import { formSchema } from "./ticket-create-model";

describe("create ticket validation — bad paths first", () => {
  it("rejects an empty title", () => {
    const result = formSchema.safeParse({ title: "", type: "TASK" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only titles", () => {
    const result = formSchema.safeParse({ title: "   ", type: "TASK" });
    expect(result.success).toBe(false);
  });

  it("rejects titles shorter than 3 characters after trim", () => {
    const result = formSchema.safeParse({ title: "ab", type: "TASK" });
    expect(result.success).toBe(false);
  });

  it("rejects titles that exceed 200 characters", () => {
    const result = formSchema.safeParse({
      title: "a".repeat(201),
      type: "TASK",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a title at the 200-character search/API limit", () => {
    const result = formSchema.safeParse({
      title: "a".repeat(200),
      type: "TASK",
    });
    expect(result.success).toBe(true);
  });

  it("rejects titles with no alphanumeric characters", () => {
    const result = formSchema.safeParse({ title: "!!!", type: "TASK" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid ticket type", () => {
    const result = formSchema.safeParse({ title: "Valid title", type: "NOPE" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid title on the happy path", () => {
    const result = formSchema.safeParse({ title: "Ship login", type: "TASK" });
    expect(result.success).toBe(true);
  });
});
