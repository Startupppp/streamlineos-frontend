import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-client";
import { DepartmentForm } from "./department-form";

jest.mock("@/components/organization/hierarchy-parent-selector", () => ({
  HierarchyParentSelector: () => null,
}));
jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => null,
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

function renderForm(onSubmit: () => Promise<void>) {
  render(
    <>
      <DepartmentForm onSubmit={onSubmit} />
      <button type="submit" form="department-form">
        Save
      </button>
    </>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("DepartmentForm", () => {
  it("shows the custom code message and no library text for a one-character code", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    fill("Name", "Engineering");
    fill("Code", "E");
    fireEvent.click(screen.getByText("Save"));

    expect(
      await screen.findByText("Code must be at least 2 characters"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Too small/)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows only Name is required for a blank name", async () => {
    renderForm(jest.fn().mockResolvedValue(undefined));

    fill("Name", "   ");
    fill("Code", "ENG");
    fireEvent.click(screen.getByText("Save"));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.queryByText(/Too small/)).not.toBeInTheDocument();
  });

  it("shows the server's duplicate-name conflict inline on the Name field", async () => {
    const conflict = new ApiError("Validation failed.", 409, "VALIDATION_FAILED", [
      { path: "name", message: "A department named 'QA Dept 1013' already exists." },
    ]);
    const onSubmit = jest.fn().mockRejectedValue(conflict);
    renderForm(onSubmit);

    fill("Name", "qa dept 1013");
    fill("Code", "QAD1013B");
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(
        screen.getByText("A department named 'QA Dept 1013' already exists."),
      ).toBeInTheDocument(),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
