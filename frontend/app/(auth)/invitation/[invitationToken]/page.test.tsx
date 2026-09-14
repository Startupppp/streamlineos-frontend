import type { HTMLAttributes, PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
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
const declineMutation = { mutate: jest.fn(), isPending: false };

const invitation = {
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
  useAcceptInvitation: () => acceptMutation,
  useDeclineInvitation: () => declineMutation,
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
    await user.click(screen.getByRole("button", { name: /accept invitation/i }));

    const message = await screen.findByRole("alert");
    expect(message).toBeVisible();
    expect(message).toHaveTextContent(/100 characters/i);

    const describedBy = firstName.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/)).toContain(message.id);
    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(acceptMutation.mutate).not.toHaveBeenCalled();
  });

  it("leaves an accepted name free of an error announcement", async () => {
    const user = userEvent.setup();
    render(<InvitationPage />);

    const firstName = screen.getByRole("textbox", { name: /first name/i });
    await user.type(firstName, "Priya");
    await user.click(screen.getByRole("button", { name: /accept invitation/i }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(firstName).toHaveAttribute("aria-invalid", "false");
    expect(acceptMutation.mutate).toHaveBeenCalledTimes(1);
  });

  it("disables the accept control while the acceptance is in flight", () => {
    acceptMutation.isPending = true;
    render(<InvitationPage />);

    expect(
      screen.getByRole("button", { name: /accepting invitation/i }),
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

  it("accepts once for a signed-in invited account", async () => {
    const user = userEvent.setup();
    sessionState.data = { user: { email: invitation.email } };
    render(<InvitationPage />);

    await user.click(screen.getByRole("button", { name: /accept & join/i }));

    expect(acceptMutation.mutate).toHaveBeenCalledTimes(1);
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
    invitationError.value = new Error("Invalid or expired invitation");
  });

  afterEach(() => {
    invitationError.value = null;
  });

  it("explains that the link may have expired and offers a way forward", () => {
    render(<InvitationPage />);

    expect(screen.getByText(/invitation unavailable/i)).toBeVisible();
    expect(screen.getByText(/expired or was replaced/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /go to sign in/i })).toBeEnabled();
  });
});
