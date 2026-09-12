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
  useParams: () => ({ token: "invite-token-1" }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
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

jest.mock("@/hooks/common/auth-hooks", () => ({
  useValidateInvitation: () => ({
    data: invitation,
    error: null,
    isPending: false,
  }),
  useAcceptInvitation: () => acceptMutation,
  useDeclineInvitation: () => declineMutation,
  useSessionClaimsRefresh: () => jest.fn(),
  signInWithMagicToken: jest.fn(),
}));

import InvitationPage from "@/app/(auth)/invitation/[token]/page";

const OVER_LIMIT_NAME = "x".repeat(101);

describe("InvitationPage — a rejected name tells the invitee why", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acceptMutation.isPending = false;
    declineMutation.isPending = false;
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
