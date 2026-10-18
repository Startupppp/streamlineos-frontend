import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { ModuleAccessSection } from "./invite-module-access";

function renderSection() {
  renderWithProviders(<ModuleAccessSection field={{ value: [], onChange: jest.fn() }} />);
}

describe("invite module access shows core modules as included, not deniable", () => {
  it("renders Knowledge Base as Included with no access selector, because every member can read it", () => {
    renderSection();

    expect(
      screen.getByLabelText(
        "Module access for Knowledge Base: included for every member",
      ),
    ).toHaveTextContent("Knowledge Base");
    expect(
      screen.queryByRole("combobox", { name: "Module access for Knowledge Base" }),
    ).toBeNull();
  });

  it("keeps a selector for a plan-gated module such as HR", () => {
    renderSection();

    expect(screen.getByRole("combobox", { name: "Module access for HR" })).toBeInTheDocument();
  });
});
