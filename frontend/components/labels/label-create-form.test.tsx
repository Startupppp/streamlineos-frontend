import { render, screen } from "@testing-library/react";
import { LabelCreateForm } from "./label-create-form";

function renderForm(name: string) {
  render(
    <LabelCreateForm
      name={name}
      color="#3B82F6"
      onNameChange={jest.fn()}
      onColorChange={jest.fn()}
      onSubmit={jest.fn()}
    />,
  );
}

const SPACES_HINT = "Enter a label name. Spaces alone are not a name.";

describe("LabelCreateForm whitespace-only name (U-011)", () => {
  it("explains why Create is disabled when the name is only spaces", () => {
    renderForm("   ");
    expect(screen.getByText(SPACES_HINT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeDisabled();
  });

  it("shows no hint for an empty field", () => {
    renderForm("");
    expect(screen.queryByText(SPACES_HINT)).not.toBeInTheDocument();
  });

  it("shows no hint and enables Create for a real name", () => {
    renderForm("Bug");
    expect(screen.queryByText(SPACES_HINT)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeEnabled();
  });
});
