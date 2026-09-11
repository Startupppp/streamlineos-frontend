import { upperCaseFieldChange, lowerCaseFieldChange } from "@/lib/case-field";

function typeInto(
  handler: (event: React.ChangeEvent<HTMLInputElement>) => void,
  value: string,
): void {
  handler({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
}

describe("upperCaseFieldChange", () => {
  it("upper-cases what was typed", () => {
    const onChange = jest.fn();
    typeInto(upperCaseFieldChange(onChange), "abc123");
    expect(onChange).toHaveBeenCalledWith("ABC123");
  });

  it("bite proof: it keeps separators, which codeFieldValue would strip", () => {
    const onChange = jest.fn();
    typeInto(upperCaseFieldChange(onChange), "29ab-cde 1z5");
    expect(onChange).toHaveBeenCalledWith("29AB-CDE 1Z5");
  });

  it("passes an emptied box straight through", () => {
    const onChange = jest.fn();
    typeInto(upperCaseFieldChange(onChange), "");
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("returns a named handler, so a stack trace says which rule ran", () => {
    expect(upperCaseFieldChange(jest.fn()).name).toBe("handleUpperCaseFieldChange");
  });
});

describe("lowerCaseFieldChange", () => {
  it("lower-cases what was typed", () => {
    const onChange = jest.fn();
    typeInto(lowerCaseFieldChange(onChange), "My-Key");
    expect(onChange).toHaveBeenCalledWith("my-key");
  });

  it("returns a named handler", () => {
    expect(lowerCaseFieldChange(jest.fn()).name).toBe("handleLowerCaseFieldChange");
  });
});
