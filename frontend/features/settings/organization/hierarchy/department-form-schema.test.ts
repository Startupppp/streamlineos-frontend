import { departmentFormSchema } from "./department-form-schema";

function messagesFor(values: { name: string; code: string }) {
  const result = departmentFormSchema.safeParse({ ...values });
  if (result.success) return [];
  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

describe("departmentFormSchema messages", () => {
  it("reports only Name is required for a whitespace-only name", () => {
    expect(messagesFor({ name: "   ", code: "ENG" })).toEqual([
      "name: Name is required",
    ]);
  });

  it("reports the custom minimum for a one-character code, with no library text", () => {
    const messages = messagesFor({ name: "Engineering", code: "E" });

    expect(messages).toEqual(["code: Code must be at least 2 characters"]);
  });

  it("reports a custom maximum for an over-long code and name", () => {
    const messages = messagesFor({
      name: "N".repeat(101),
      code: "C".repeat(21),
    });

    expect(messages).toEqual([
      "name: Name must be at most 100 characters",
      "code: Code must be at most 20 characters",
    ]);
  });

  it("rejects a one-character name with the same minimum the API enforces (HRM-B-008)", () => {
    expect(messagesFor({ name: " A ", code: "ENG" })).toEqual([
      "name: Name must be at least 2 characters",
    ]);
    expect(messagesFor({ name: "QA", code: "ENG" })).toEqual([]);
  });

  it("accepts a valid department", () => {
    expect(messagesFor({ name: "Engineering", code: "ENG" })).toEqual([]);
  });
});
