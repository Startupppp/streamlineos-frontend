import type { ChangeEvent } from "react";
import { personNameFieldChange } from "./restricted-field-change";

function typed(value: string): ChangeEvent<HTMLInputElement> {
  return { target: { value } } as unknown as ChangeEvent<HTMLInputElement>;
}

describe("personNameFieldChange (QA 2026-10-13 P1: Unicode names were silently reverted)", () => {
  it.each(["姓名测试-Αβγ", "O'Brien", "O’Brien", "José", "Nguyễn Văn", "St. John", "van der Berg", ""])(
    "accepts %p",
    (value) => {
      const onChange = jest.fn();
      personNameFieldChange(onChange)(typed(value));
      expect(onChange).toHaveBeenCalledWith(value);
    },
  );

  it.each(["Ada1", "Ada@", "<script>", "Ada_"])("still rejects %p", (value) => {
    const onChange = jest.fn();
    personNameFieldChange(onChange)(typed(value));
    expect(onChange).not.toHaveBeenCalled();
  });
});
