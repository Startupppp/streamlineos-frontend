import { act, render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import { SettingsEditNameForm } from "./settings-edit-name-form";
import { SESSION_CLAIMS_UNCONFIRMED_MESSAGE } from "@/hooks/common/use-confirmed-session-claims-refresh";

interface ProfileUpdateOptions {
  onSuccess: () => Promise<void> | void;
  onError: (error: Error) => void;
}

const updateCalls: Array<{
  body: { name: string };
  options: ProfileUpdateOptions;
}> = [];
const mockRefreshSessionClaims = jest.fn();
const onClose = jest.fn();

jest.mock("@/hooks/api/auth", () => ({
  useUpdateMyProfile: () => ({
    isPending: false,
    mutate: (body: { name: string }, options: ProfileUpdateOptions) => {
      updateCalls.push({ body, options });
    },
  }),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSessionClaimsRefresh: () => mockRefreshSessionClaims,
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockToastError = toast.error as jest.Mock;
const mockToastSuccess = toast.success as jest.Mock;

function sessionNamed(name: string): Session {
  return {
    user: { id: "user-1", role: "MEMBER", name },
    orgId: "org-a",
    expires: "2099-01-01T00:00:00.000Z",
  };
}

async function saveName() {
  const button = screen.getByRole("button", { name: "Save name" });
  await act(async () => {
    button.click();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  updateCalls.length = 0;
});

describe("the display-name edit only reports success once the session carries the new name", () => {
  it("announces the update when the refreshed session carries the saved name", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionNamed("Ada Lovelace"));
    render(<SettingsEditNameForm name="Ada Lovelace" onClose={onClose} />);
    await saveName();

    expect(updateCalls[0]?.body).toEqual({ name: "Ada Lovelace" });
    await act(async () => {
      await updateCalls[0]?.options.onSuccess();
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({
      name: "Ada Lovelace",
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Name updated");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not claim the name was updated when the refresh times out", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);
    render(<SettingsEditNameForm name="Ada Lovelace" onClose={onClose} />);
    await saveName();

    await act(async () => {
      await updateCalls[0]?.options.onSuccess();
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not claim the name was updated when the session still carries the old name", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionNamed("Grace Hopper"));
    render(<SettingsEditNameForm name="Ada Lovelace" onClose={onClose} />);
    await saveName();

    await act(async () => {
      await updateCalls[0]?.options.onSuccess();
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });

  it("stays silent for a save that a newer save has already superseded", async () => {
    let settleFirst: ((session: Session) => void) | undefined;
    mockRefreshSessionClaims
      .mockImplementationOnce(
        () =>
          new Promise<Session>((resolve) => {
            settleFirst = resolve;
          }),
      )
      .mockResolvedValue(sessionNamed("Ada Lovelace"));

    render(<SettingsEditNameForm name="Ada Lovelace" onClose={onClose} />);
    await saveName();
    const firstSuccess = updateCalls[0]?.options.onSuccess();

    await saveName();
    await act(async () => {
      await updateCalls[1]?.options.onSuccess();
    });
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleFirst?.(sessionNamed("Ada Lovelace"));
      await firstSuccess;
    });

    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
