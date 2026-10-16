import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TypedEmailConfirmDialog } from "./typed-email-confirm-dialog";
import { toExecutePayload } from "./subject-request-schema";

function renderDialog(onConfirm: jest.Mock, withReason = false) {
  render(
    <TypedEmailConfirmDialog
      open
      onOpenChange={jest.fn()}
      title="Erase?"
      description="Cannot be undone."
      email="Ada@Example.com"
      confirmLabel="Erase permanently"
      isPending={false}
      withReason={withReason}
      onConfirm={onConfirm}
    />,
  );
  return screen.getByRole("button", { name: "Erase permanently" });
}

it("keeps erasure shut until the subject's email is typed", async () => {
  const onConfirm = jest.fn();
  const confirm = renderDialog(onConfirm);
  expect(confirm).toBeDisabled();

  await userEvent.type(screen.getByLabelText(/to confirm/), "ada@example.co");
  await waitFor(() => expect(confirm).toBeDisabled());

  await userEvent.type(screen.getByLabelText(/to confirm/), "m");
  await waitFor(() => expect(confirm).toBeEnabled());
  await userEvent.click(confirm);
  await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  expect(onConfirm.mock.calls[0][0]).toMatchObject({ confirmEmail: "ada@example.com" });
});

it("also requires a reason when asked for one", async () => {
  const onConfirm = jest.fn();
  const confirm = renderDialog(onConfirm, true);
  await userEvent.type(screen.getByLabelText(/to confirm/), "ada@example.com");
  await waitFor(() => expect(confirm).toBeDisabled());
  await userEvent.type(screen.getByLabelText("Reason"), "Subject asked");
  await waitFor(() => expect(confirm).toBeEnabled());
});

it("omits blank optional fields from the strict execute DTO", () => {
  expect(toExecutePayload({ kind: "export", subjectEmail: "a@b.co", dueBy: "", backupsExpireBy: "" })).toEqual({
    kind: "export",
    subjectEmail: "a@b.co",
  });
});
