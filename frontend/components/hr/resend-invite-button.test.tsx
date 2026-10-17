import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const canState = { allowed: false };
jest.mock("@/hooks/api/access", () => ({
  useCan: () => canState.allowed,
}));

type MutateOptions = {
  onSuccess: (result: { success: boolean; invite: { sent: boolean; reason: string | null } }) => void;
  onError: (error: unknown) => void;
};

const mutate = jest.fn<void, [string, MutateOptions]>();
const mutationState = { isPending: false };
jest.mock("@/hooks/api/hr", () => ({
  useResendEmployeeInvite: () => ({
    mutate,
    get isPending() {
      return mutationState.isPending;
    },
  }),
}));

const toastSuccess = jest.fn();
const toastWarning = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (message: string, options?: unknown) => toastSuccess(message, options),
    warning: (message: string) => toastWarning(message),
    error: (message: string) => toastError(message),
  },
}));

import { ResendInviteButton } from "@/components/hr/resend-invite-button";

function lastMutateOptions(): MutateOptions {
  const options = mutate.mock.calls.at(-1)?.[1];
  if (!options) throw new Error("mutate was not given options");
  return options;
}

describe("ResendInviteButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    canState.allowed = true;
    mutationState.isPending = false;
  });

  it("renders nothing for someone without hr:onboarding:manage, so the control never claims authority it lacks", () => {
    canState.allowed = false;
    render(<ResendInviteButton employeeId="user-1" employeeName="Priya Sharma" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sends the resend for this employee and confirms a queued invitation", async () => {
    const user = userEvent.setup();
    render(<ResendInviteButton employeeId="user-1" employeeName="Priya Sharma" />);

    await user.click(screen.getByRole("button", { name: /resend invite to priya sharma/i }));

    expect(mutate).toHaveBeenCalledWith("user-1", expect.any(Object));
    lastMutateOptions().onSuccess({ success: true, invite: { sent: true, reason: null } });
    // The test's own name said "queued" while it asserted "sent", which is the
    // gap the ticket is about: invite.sent means the outbox accepted the mail,
    // not that anyone received it.
    expect(toastSuccess).toHaveBeenCalledWith(
      "Invitation queued for Priya Sharma",
      expect.objectContaining({ description: expect.stringContaining("Copy invite link") }),
    );
    expect(toastWarning).not.toHaveBeenCalled();
  });

  it("warns with the backend's reason when the invitation was accepted by the API but not queued for delivery", async () => {
    const user = userEvent.setup();
    render(<ResendInviteButton employeeId="user-1" employeeName="Priya Sharma" />);

    await user.click(screen.getByRole("button", { name: /resend invite/i }));
    lastMutateOptions().onSuccess({
      success: true,
      invite: { sent: false, reason: "No email provider is configured, so the email could not be sent." },
    });

    expect(toastWarning).toHaveBeenCalledWith(
      "Invitation not sent. No email provider is configured, so the email could not be sent.",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("surfaces a failed request through the shared error reader", async () => {
    const user = userEvent.setup();
    render(<ResendInviteButton employeeId="user-1" employeeName="Priya Sharma" />);

    await user.click(screen.getByRole("button", { name: /resend invite/i }));
    lastMutateOptions().onError(new Error("Employee not found in this organization."));

    expect(toastError).toHaveBeenCalledWith("Employee not found in this organization.");
  });

  it("disables itself while a resend is in flight", () => {
    mutationState.isPending = true;
    render(<ResendInviteButton employeeId="user-1" employeeName="Priya Sharma" />);
    expect(screen.getByRole("button", { name: /resend invite/i })).toBeDisabled();
  });
});
