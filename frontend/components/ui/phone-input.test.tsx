import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Value } from "react-phone-number-input";
import { PhoneInput } from "./phone-input";

function ControlledPhoneInput() {
  const [value, setValue] = useState<Value | "">("");
  return (
    <PhoneInput
      aria-label="Phone"
      defaultCountry="IN"
      value={value || undefined}
      onChange={(next) => setValue(next ?? "")}
    />
  );
}

it("keeps the visible input synchronized with its controlled value", async () => {
  const user = userEvent.setup();
  render(<ControlledPhoneInput />);

  const input = screen.getByRole("textbox", { name: "Phone" });
  await user.type(input, "9876543210");

  expect(input).toHaveValue("98765 43210");
});
