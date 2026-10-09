import { fireEvent, render, screen } from "@testing-library/react";
import { AmountInput } from "./expense-form-fields";

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
