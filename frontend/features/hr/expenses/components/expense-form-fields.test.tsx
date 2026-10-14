import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AmountInput } from "./expense-form-fields";
import { EXPENSE_AMOUNT_MAX } from "./expense-form-schema";

function ControlledAmount({ initial = 0 }: { initial?: number }) {
  const [value, setValue] = React.useState(initial);
  return <AmountInput value={value} onChange={setValue} />;
}

describe("AmountInput prop synchronization", () => {
  it("preserves an in-progress decimal while reflecting a genuinely new external value", () => {
    const onChange = jest.fn();
    const { rerender } = render(<AmountInput value={12} onChange={onChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "12." } });
    expect(input).toHaveValue("12.");
    expect(onChange).toHaveBeenLastCalledWith(12);

    rerender(<AmountInput value={99} onChange={onChange} />);
    expect(input).toHaveValue("99");
  });
});

describe("AmountInput large-value handling", () => {
  it("calls onChange with the over-limit value instead of silently rejecting it", () => {
    const onChange = jest.fn();
    render(<AmountInput value={0} onChange={onChange} />);
    const input = screen.getByRole("textbox");

    const overLimit = String(EXPENSE_AMOUNT_MAX + 1);
    fireEvent.change(input, { target: { value: overLimit } });

    expect(onChange).toHaveBeenLastCalledWith(EXPENSE_AMOUNT_MAX + 1);
  });

  it("does not normalize an over-limit value on blur so the display stays readable", () => {
    render(<ControlledAmount />);
    const input = screen.getByRole("textbox");

    const overLimit = String(EXPENSE_AMOUNT_MAX + 1);
    fireEvent.change(input, { target: { value: overLimit } });
    fireEvent.blur(input);

    expect(input).toHaveValue(overLimit);
  });
});
