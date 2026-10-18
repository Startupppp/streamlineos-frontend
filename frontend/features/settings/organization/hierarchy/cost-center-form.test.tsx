import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { CostCenterForm } from "./cost-center-form";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const KNOWN = [{ id: "cc-1", code: "QR2C", name: "QA cost centre" }];

function renderForm(onSubmit: jest.Mock, editingId?: string, code = "") {
  render(
    <>
      <CostCenterForm
        defaultValues={{ code, name: "", description: "" }}
        knownCostCenters={KNOWN}
        editingId={editingId}
        onSubmit={onSubmit}
      />
      <button type="submit" form="cc-form">
        Save
      </button>
    </>,
  );
}

async function fillAndSave(code: string) {
  const codeInput = screen.getByPlaceholderText("CC001");
  await userEvent.clear(codeInput);
  await userEvent.type(codeInput, code);
  await userEvent.type(screen.getByPlaceholderText("Engineering"), "Duplicate");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CostCenterForm duplicate code feedback", () => {
  it("flags a code already on the list inline at once, without waiting for the server", async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);
    await fillAndSave("qr2c");
    expect(
      await screen.findByText("Code 'QR2C' is already used by the cost center 'QA cost centre'."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("lets the row being edited keep its own code", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderForm(onSubmit, "cc-1", "QR2C");
    await userEvent.type(screen.getByPlaceholderText("Engineering"), "Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("shows the server's 409 under Code with no raw 'code:' prefix and no toast", async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      new ApiError("Cost center code already exists", 409, "VALIDATION_FAILED", [
        { path: "code", message: "Code 'NEW1' is already used by the cost center 'Archived'." },
      ]),
    );
    renderForm(onSubmit);
    await fillAndSave("NEW1");
    expect(
      await screen.findByText("Code 'NEW1' is already used by the cost center 'Archived'."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^code:/)).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts an error that is not a field conflict", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new ApiError("Server unavailable", 503));
    renderForm(onSubmit);
    await fillAndSave("NEW2");
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
