import { render, screen } from "@testing-library/react";
import { BuilderProvider } from "./builder-context";
import { FieldPalette } from "./field-palette";

function renderPalette(props: { hasRecipient: boolean; editable: boolean }) {
  return render(
    <BuilderProvider>
      <FieldPalette {...props} />
    </BuilderProvider>,
  );
}

describe("the field palette follows whether the envelope can still be edited", () => {
  it("offers field types on a draft once a recipient is selected", () => {
    renderPalette({ hasRecipient: true, editable: true });

    expect(screen.getByRole("button", { name: "Signature" })).toBeEnabled();
  });

  it("locks every field type once the envelope has been sent, and says why", () => {
    renderPalette({ hasRecipient: true, editable: false });

    expect(screen.getByRole("button", { name: "Signature" })).toBeDisabled();
    expect(screen.getByText(/Fields are locked once the envelope is sent/)).toBeInTheDocument();
  });
});
