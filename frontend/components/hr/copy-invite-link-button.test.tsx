/**
 * HRMS-E2E-001b. An invitation had exactly one delivery route. When the email
 * did not arrive — and in the audited environment it never did — onboarding
 * stopped for the whole organisation, with the UI still saying it had been sent.
 *
 * These assertions pin the fallback: the administrator gets the link, the
 * clipboard is not the only place it can land, and a failure is told rather
 * than swallowed.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { CopyInviteLinkButton } from "./copy-invite-link-button";

const mutate = jest.fn();
const can = jest.fn(() => true);

jest.mock("@/hooks/api/access", () => ({ useCan: () => can() }));
jest.mock("@/hooks/api/hr", () => ({
  useCreateEmployeeInviteLink: () => ({ mutate, isPending: false }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const LINK = {
  inviteUrl: "https://app.example.com/magic-link?token=abc123",
  expiresAt: "2026-10-01T00:00:00.000Z",
  email: "qa-emp@example.com",
};

function grantClipboard(writeText: jest.Mock) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

beforeEach(() => {
  mutate.mockReset();
  can.mockReturnValue(true);
  jest.mocked(toast.success).mockReset();
  jest.mocked(toast.info).mockReset();
  jest.mocked(toast.error).mockReset();
});

function renderButton() {
  render(<CopyInviteLinkButton employeeId="user-1" employeeName="QA Employee Test" />);
}

describe("CopyInviteLinkButton", () => {
  it("is hidden from someone who cannot onboard", () => {
    can.mockReturnValue(false);
    renderButton();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("copies the link and says it retired the earlier one", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    grantClipboard(writeText);
    mutate.mockImplementation((_id, { onSuccess }) => void onSuccess(LINK));

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /copy invite link/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(LINK.inviteUrl));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("QA Employee Test"),
      expect.objectContaining({ description: expect.stringContaining("no longer works") }),
    );
  });

  it("shows the link when the clipboard refuses, rather than failing silently", async () => {
    grantClipboard(jest.fn().mockRejectedValue(new Error("not allowed")));
    mutate.mockImplementation((_id, { onSuccess }) => void onSuccess(LINK));

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /copy invite link/i }));

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining("QA Employee Test"),
        expect.objectContaining({ description: LINK.inviteUrl }),
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("surfaces a refusal from the server", async () => {
    mutate.mockImplementation((_id, { onError }) => void onError(new Error("Too many requests")));

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /copy invite link/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
