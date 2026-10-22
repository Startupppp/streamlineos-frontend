import type { HTMLAttributes, PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ invitationToken: "invite-token-1" }),
}));

const sessionState: { data: { user: { email: string } } | null } = { data: null };

jest.mock("next-auth/react", () => ({
  useSession: () => sessionState,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const acceptMutation = { mutate: jest.fn(), isPending: false };
const claimMutation = { mutate: jest.fn(), isPending: false };
const declineMutation = { mutate: jest.fn(), isPending: false };
const requestOtpMutation = {
  mutate: jest.fn((_variables: { token: string }, callbacks: { onSuccess: () => void }) => {
    callbacks.onSuccess();
  }),
  isPending: false,
};

const invitation = {
  id: "inv-1",
  email: "new.joiner@acme.test",
  organizationName: "Acme Corp",
  role: "MEMBER",
  userExists: false,
};

const invitationError: { value: unknown } = { value: null };

jest.mock("@/hooks/common/auth-hooks", () => ({
  useValidateInvitation: () => ({
    data: invitationError.value === null ? invitation : undefined,
    error: invitationError.value,
    isPending: false,
  }),
  useClaimInvitation: () => claimMutation,
  useAcceptInvitation: () => acceptMutation,
  useDeclineInvitation: () => declineMutation,
  useRequestInvitationOtp: () => requestOtpMutation,
  useSessionClaimsRefresh: () => jest.fn(),
  signInWithMagicToken: jest.fn(),
}));

import InvitationPage from "@/app/(auth)/invitation/[invitationToken]/page";

const OVER_LIMIT_NAME = "x".repeat(101);

describe("InvitationPage — a rejected name tells the invitee why", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acceptMutation.isPending = false;
    declineMutation.isPending = false;
    sessionState.data = null;
    invitation.userExists = false;
    invitationError.value = null;
  });

  it("renders the reason and points the offending input at it", async () => {
    const user = userEvent.setup();
    render(<InvitationPage />);

    const firstName = screen.getByRole("textbox", { name: /first name/i });
    await user.click(firstName);
    await user.paste(OVER_LIMIT_NAME);
    await user.type(screen.getByRole("textbox", { name: /last name/i }), "Sharma");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const message = await screen.findByRole("alert");
    expect(message).toBeVisible();
    expect(message).toHaveTextContent(/100 characters/i);

    const describedBy = firstName.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/)).toContain(message.id);
    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(requestOtpMutation.mutate).not.toHaveBeenCalled();
    expect(acceptMutation.mutate).not.toHaveBeenCalled();
  });

  it("leaves an accepted name free of an error announcement", async () => {
    const user = userEvent.setup();
    render(<InvitationPage />);

    const firstName = screen.getByRole("textbox", { name: /first name/i });
    await user.type(firstName, "Priya");
    await user.type(screen.getByRole("textbox", { name: /last name/i }), "Sharma");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(firstName).toHaveAttribute("aria-invalid", "false");
    expect(requestOtpMutation.mutate).toHaveBeenCalledTimes(1);
  });

  it("disables the control while the verification code is being sent", () => {
    requestOtpMutation.isPending = true;
    render(<InvitationPage />);

    expect(
      screen.getByRole("button", { name: /sending verification code/i }),
    ).toBeDisabled();
  });
});

describe("InvitationPage — an existing account opening the invitation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acceptMutation.isPending = false;
    declineMutation.isPending = false;
    sessionState.data = null;
    invitation.userExists = true;
    invitationError.value = null;
  });

  afterEach(() => {
    invitation.userExists = false;
  });

  it("warns when a different account is signed in", () => {
    sessionState.data = { user: { email: "someone.else@acme.test" } };
    render(<InvitationPage />);

    expect(screen.getByText(/currently signed in as/i)).toBeVisible();
  });

  it("does not warn when the same address differs only by case or padding", () => {
    sessionState.data = { user: { email: "  New.Joiner@ACME.test " } };
    render(<InvitationPage />);

    expect(screen.queryByText(/currently signed in as/i)).toBeNull();
  });

  it("offers sign-in rather than acceptance when nobody is signed in", () => {
    render(<InvitationPage />);

    expect(screen.getByRole("button", { name: /sign in & join/i })).toBeEnabled();
  });

  it("calls the claim mutation directly for a signed-in invited account without requesting an OTP", async () => {
    const user = userEvent.setup();
    sessionState.data = { user: { email: invitation.email } };
    render(<InvitationPage />);

    await user.click(screen.getByRole("button", { name: /accept & join/i }));

    expect(claimMutation.mutate).toHaveBeenCalledTimes(1);
    expect(claimMutation.mutate).toHaveBeenCalledWith(invitation.id, expect.anything());
    expect(requestOtpMutation.mutate).not.toHaveBeenCalled();
    expect(acceptMutation.mutate).not.toHaveBeenCalled();
  });

  it("disables the control while an acceptance is in flight", () => {
    sessionState.data = { user: { email: invitation.email } };
    acceptMutation.isPending = true;
    render(<InvitationPage />);

    expect(screen.getByRole("button", { name: /accept/i })).toBeDisabled();
  });
});

describe("InvitationPage — an unusable invitation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionState.data = null;
    invitation.userExists = false;
    invitationError.value = null;
  });

  afterEach(() => {
    invitationError.value = null;
  });

  it("shows a generic unavailable state for non-404 errors", () => {
    invitationError.value = new Error("Service unavailable");
    render(<InvitationPage />);

    expect(screen.getByText(/invitation unavailable/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /go to sign in/i })).toBeEnabled();
  });

  it("shows the link-unavailable copy for a 404 and tells the invitee to check for a newer email", () => {
    invitationError.value = new ApiError("Invalid or expired invitation", 404);
    render(<InvitationPage />);

    expect(screen.getByText(/invitation link unavailable/i)).toBeVisible();
    expect(screen.getByText(/expired.*already used.*replaced/i)).toBeVisible();
    expect(screen.getByText(/check your inbox/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /go to sign in/i })).toBeEnabled();
  });

  it("does not show the 404 error copy for a pending invite that validates successfully", () => {
    render(<InvitationPage />);

    expect(screen.queryByText(/invitation link unavailable/i)).toBeNull();
    expect(screen.queryByText(/invitation unavailable/i)).toBeNull();
  });
});

describe("InvitationPage — HRMS-005 invariant: link validity and status agreement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionState.data = null;
    invitation.userExists = false;
    invitationError.value = null;
  });

  afterEach(() => {
    invitationError.value = null;
  });

  it("shows the acceptance form for a pending unexpired invite, not an error state", () => {
    render(<InvitationPage />);

    expect(screen.getByRole("textbox", { name: /first name/i })).toBeInTheDocument();
    expect(screen.queryByText(/invitation.*unavailable/i)).toBeNull();
    expect(screen.queryByText(/expired/i)).toBeNull();
  });

  it("never uses the word 'expired' when a consumed token returns 404", () => {
    invitationError.value = new ApiError("Invalid or expired invitation", 404);
    render(<InvitationPage />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).not.toMatch(/expired/i);
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
  });
});

describe("InvitationPage — unauthenticated user accepts inline without a signin redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acceptMutation.isPending = false;
    declineMutation.isPending = false;
    sessionState.data = null;
    invitation.userExists = true;
    invitationError.value = null;
  });

  afterEach(() => {
    invitation.userExists = false;
  });

  it("requests OTP directly rather than navigating to the signin page", async () => {
    const user = userEvent.setup();
    render(<InvitationPage />);

    await user.click(screen.getByRole("button", { name: /sign in & join/i }));

    expect(requestOtpMutation.mutate).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith(
      expect.stringContaining("/signin"),
    );
  });
});
