import { fireEvent, render, screen } from "@testing-library/react";
import { ColorField } from "./org-branding-fields";

function renderInForm(value: string) {
  const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <ColorField label="Primary color" value={value} onChange={jest.fn()} />
      <button type="submit">Save</button>
    </form>,
  );
  return { onSubmit };
}

describe("ColorField", () => {
  it("does not submit the branding form when Enter is pressed in the hex field", () => {
    const { onSubmit } = renderInForm("#112233");
    const hex = screen.getByPlaceholderText("#0b1220");
    const event = fireEvent.keyDown(hex, { key: "Enter" });
    expect(event).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("leaves other keys alone", () => {
    renderInForm("#112233");
    expect(fireEvent.keyDown(screen.getByPlaceholderText("#0b1220"), { key: "a" })).toBe(true);
  });

  it("shows no fallback colour in the picker while the hex is empty", () => {
    renderInForm("");
    const picker = screen.getByLabelText("Primary color colour picker");
    expect(picker).toHaveAttribute("data-unset", "true");
    expect(picker.className).toContain("opacity-0");
  });

  it("shows the chosen colour once the hex is valid", () => {
    renderInForm("#112233");
    const picker = screen.getByLabelText("Primary color colour picker");
    expect(picker).not.toHaveAttribute("data-unset");
    expect(picker).toHaveValue("#112233");
  });
});
