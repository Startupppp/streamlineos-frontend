import { render, screen } from "@testing-library/react";
import { BuildFilterSelect } from "./build-filter-select";

const LONG_LABEL = "Waiting for external security and compliance review";

function renderFilter(className?: string) {
  render(
    <BuildFilterSelect
      label="Status"
      value="waiting"
      onValueChange={jest.fn()}
      options={[
        { value: "all", label: "All statuses" },
        { value: "waiting", label: LONG_LABEL },
      ]}
      className={className}
    />,
  );

  return screen.getByRole("combobox", { name: "Status" });
}

describe("BuildFilterSelect", () => {
  it("lets a long selected label size the desktop trigger up to a readable bound", () => {
    const trigger = renderFilter();

    expect(trigger).toHaveTextContent(LONG_LABEL);
    expect(trigger).toHaveClass("md:w-fit", "md:min-w-40", "md:max-w-80");
    expect(trigger).not.toHaveClass("md:w-40");
  });

  it("fills the available width on mobile without forcing a desktop full width", () => {
    const trigger = renderFilter();

    expect(trigger).toHaveClass("w-full", "min-w-0");
    expect(trigger).toHaveClass("md:w-fit");
  });

  it("allows a caller width override to replace the responsive default", () => {
    const trigger = renderFilter("md:w-56 md:max-w-none");

    expect(trigger).toHaveClass("md:w-56", "md:max-w-none");
    expect(trigger).not.toHaveClass("md:w-fit", "md:max-w-80");
  });
});
