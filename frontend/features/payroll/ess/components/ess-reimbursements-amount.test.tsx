import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitSheet } from "./ess-reimbursements-submit-sheet";
import { reimbursementSchema } from "./ess-reimbursements-schema";

const mutateAsync = jest.fn();

jest.mock("@/hooks/api/payroll/ess", () => ({
  useSubmitReimbursement: () => ({ mutateAsync, isPending: false }),
}));

jest.mock("@/hooks/api/use-upload-file", () => ({
  useUploadFile: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

async function fillAndSubmit(amount: string) {
  const user = userEvent.setup();
  render(<SubmitSheet open onClose={jest.fn()} />);
  if (amount) await user.type(screen.getByLabelText(/Amount/), amount);
  await user.type(screen.getByLabelText(/Description/), "Taxi to client site");
  await user.click(screen.getByRole("button", { name: /Submit Claim/ }));
}

/**
 * PAY-004. `min="0"` made the browser's own validation reject `-1` before the
 * resolver ran, so the field kept the value and said nothing. The claim must
 * fail in the form, under the field, and never reach the API.
 */
describe("the reimbursement Amount field", () => {
  beforeEach(() => mutateAsync.mockReset());

  it.each([
    ["-1", /at least ₹1/i],
    ["0", /at least ₹1/i],
    ["", /Amount is required/i],
    ["1000000", /at most/i],
    ["1.005", /2 decimal places/i],
  ])("rejects %p inline and submits nothing", async (amount, message) => {
    await fillAndSubmit(amount);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps a negative value visible so it can be corrected", async () => {
    await fillAndSubmit("-1");

    expect(screen.getByLabelText(/Amount/)).toHaveValue(-1);
  });

  it("points a screen reader at the message from the field itself", async () => {
    await fillAndSubmit("-1");

    const amount = screen.getByLabelText(/Amount/);
    const message = await screen.findByText(/at least ₹1/i);
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(amount.getAttribute("aria-describedby")).toContain(message.id);
  });

  it.each(["1", "250.50", "999999"])(
    "accepts %p",
    (amount) => {
      expect(
        reimbursementSchema.shape.amount.safeParse(amount).success,
      ).toBe(true);
    },
  );

  it("rejects '0.01' because the floor is now ₹1, matching the HR route that writes the same decimal(15,2) column", () => {
    expect(reimbursementSchema.shape.amount.safeParse("0.01").success).toBe(false);
  });
});
