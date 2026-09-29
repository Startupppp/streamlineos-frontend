import { isFormFieldPath } from "./form-field-path";

const values = { title: "", severity: "LOW", ownerId: null as string | null };

describe("isFormFieldPath", () => {
  it("accepts a path the form actually declares, so a real server field error still reaches its input", () => {
    expect(isFormFieldPath(values, "title")).toBe(true);
    expect(isFormFieldPath(values, "ownerId")).toBe(true);
  });

  it("rejects a path the form does not declare, so a server error cannot block submit on an invisible field", () => {
    expect(isFormFieldPath(values, "nonExistentField")).toBe(false);
    expect(isFormFieldPath(values, "")).toBe(false);
  });

  it("rejects an inherited Object property, so a path named toString cannot pass as a field", () => {
    expect(isFormFieldPath(values, "toString")).toBe(false);
    expect(isFormFieldPath(values, "constructor")).toBe(false);
  });
});
