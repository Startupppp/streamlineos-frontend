import type { HTMLAttributes, PropsWithChildren } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("framer-motion", () => {
  function MotionDiv({
    children,
    variants: _variants,
    initial: _initial,
    animate: _animate,
    ...props
  }: PropsWithChildren<
    HTMLAttributes<HTMLDivElement> & {
      variants?: unknown;
      initial?: unknown;
      animate?: unknown;
    }
  >) {
    return <div {...props}>{children}</div>;
  }

  return { motion: { div: MotionDiv }, useReducedMotion: () => false };
});

const mockPush = jest.fn();
const mockRefreshSessionClaims = jest.fn();
const mockToastError = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ invitationToken: "invite-token-1" }),
}));

const invitation = {
  email: "new.joiner@acme.test",
  organizationName: "Acme Corp",
  role: "MEMBER",
  userExists: true,
};

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "new.joiner@acme.test" } } }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn((...args: unknown[]) => mockToastError(...args)),
  },
}));

type AcceptCallbacks = { onSuccess?: (data: { ok: true }) => Promise<void> };

const acceptMutation = {
  mutate: jest.fn((_variables: unknown, callbacks?: AcceptCallbacks) => {
    void callbacks?.onSuccess?.({ ok: true });
  }),
  isPending: false,
};

jest.mock("@/hooks/common/auth-hooks", () => ({
  useValidateInvitation: () => ({
    data: invitation,
    error: null,
    isPending: false,
  }),
  useAcceptInvitation: () => acceptMutation,
  useDeclineInvitation: () => ({ mutate: jest.fn(), isPending: false }),
  useSessionClaimsRefresh: () => mockRefreshSessionClaims,
  signInWithMagicToken: jest.fn(),
}));

import InvitationPage from "@/app/(auth)/invitation/[invitationToken]/page";

const JOINED_SESSION = {
  user: { id: "user-1", name: "Ada" },
  orgId: "org-acme",
  expires: "2099-01-01",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshSessionClaims.mockReset();
  acceptMutation.isPending = false;
});

async function acceptAsExistingUser() {
  const user = userEvent.setup();
  render(<InvitationPage />);
  await user.click(screen.getByRole("button", { name: /accept & join/i }));
}

describe("InvitationPage — joining without an auto-login token waits for a confirmed session", () => {
  it("sends the invitee to the dashboard once the refresh returns a session", async () => {
    mockRefreshSessionClaims.mockResolvedValue(JOINED_SESSION);

    await acceptAsExistingUser();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("PINS THE GAP: the accept response carries no org id, so the refresh is asked for nothing", async () => {
    mockRefreshSessionClaims.mockResolvedValue(JOINED_SESSION);

    await acceptAsExistingUser();

    await waitFor(() => {
      expect(mockRefreshSessionClaims).toHaveBeenCalledWith(undefined);
    });
  });

  it("keeps the invitee off the dashboard when the claims refresh times out, because the session still names the previous org", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);

    await acceptAsExistingUser();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalledWith("/dashboard");
  });

  it("a refresh that lands after a newer acceptance started is discarded in silence", async () => {
    let settleFirst: ((session: unknown) => void) | undefined;
    mockRefreshSessionClaims
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            settleFirst = resolve;
          }),
      )
      .mockResolvedValue(JOINED_SESSION);

    const user = userEvent.setup();
    render(<InvitationPage />);
    const acceptButton = screen.getByRole("button", { name: /accept & join/i });
    await user.click(acceptButton);
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    await act(async () => {
      settleFirst?.(JOINED_SESSION);
      await Promise.resolve();
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
