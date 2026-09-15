import type { HTMLAttributes, PropsWithChildren } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import type {
  InvitationValidation,
  MagicLinkSignInOutcome,
} from "@/hooks/common/auth-hooks";

interface AcceptInvitationData {
  ok: true;
  autoLoginToken: string;
}

interface AcceptInvitationVariables {
  token: string;
  firstName?: string;
  lastName?: string;
}

interface AcceptCallbacks {
  onSuccess: (data: AcceptInvitationData) => Promise<void> | void;
  onError: (error: unknown) => void;
}

interface DeclineCallbacks {
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

interface FakeSession {
  user: { email: string };
}

interface NavigationRecorder {
  href: string;
  assign: jest.Mock<void, [string]>;
  replace: jest.Mock<void, [string]>;
}

const routerPush = jest.fn<void, [string]>();
const acceptMutate =
  jest.fn<void, [AcceptInvitationVariables, AcceptCallbacks]>();
const declineMutate = jest.fn<void, [{ token: string }, DeclineCallbacks]>();
const refreshSessionClaims = jest.fn<Promise<null>, []>();
const signInWithMagicToken =
  jest.fn<Promise<MagicLinkSignInOutcome>, [string]>();
const toastSuccess = jest.fn<void, [string]>();
const toastError = jest.fn<void, [string]>();

const VALID_INVITATION: InvitationValidation = {
  email: "new.joiner@acme.test",
  organizationName: "Acme Corp",
  role: "MEMBER",
  userExists: false,
};

const validation: {
  data: InvitationValidation | undefined;
  error: Error | null;
  isPending: boolean;
} = { data: VALID_INVITATION, error: null, isPending: false };

const pendingState = { accept: false, decline: false };

let currentSession: FakeSession | null = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: (href: string) => routerPush(href) }),
  useParams: () => ({ invitationToken: "invite-token-1" }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: currentSession }),
}));

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

jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
    error: (message: string) => toastError(message),
  },
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  signInWithMagicToken: (token: string) => signInWithMagicToken(token),
  useValidateInvitation: () => ({
    data: validation.data,
    error: validation.error,
    isPending: validation.isPending,
  }),
  useAcceptInvitation: () => ({
    mutate: acceptMutate,
    isPending: pendingState.accept,
  }),
  useDeclineInvitation: () => ({
    mutate: declineMutate,
    isPending: pendingState.decline,
  }),
  useSessionClaimsRefresh: () => refreshSessionClaims,
}));

import InvitationPage from "@/app/(auth)/invitation/[invitationToken]/page";

const navigation: NavigationRecorder = {
  href: "",
  assign: jest.fn(),
  replace: jest.fn(),
};
const realLocation = window.location;

function acceptResolvesWith(autoLoginToken: string) {
  acceptMutate.mockImplementation((_variables, callbacks) => {
    void callbacks.onSuccess({ ok: true, autoLoginToken });
  });
}

function declineResolves() {
  declineMutate.mockImplementation((_variables, callbacks) => {
    callbacks.onSuccess();
  });
}

async function submitNewJoinerForm() {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole("textbox", { name: /first name/i }),
    "Priya",
  );
  await user.click(screen.getByRole("button", { name: /accept invitation/i }));
}

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: navigation,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  navigation.href = "";
  currentSession = null;
  validation.data = VALID_INVITATION;
  validation.error = null;
  validation.isPending = false;
  pendingState.accept = false;
  pendingState.decline = false;
  acceptMutate.mockImplementation(() => {});
  declineMutate.mockImplementation(() => {});
  refreshSessionClaims.mockResolvedValue(null);
  signInWithMagicToken.mockResolvedValue({ status: "failed" });
});

describe("InvitationPage — accepting as a new joiner", () => {
  it("signs the invited account in once and lands on employee onboarding", async () => {
    acceptResolvesWith("invite-login-1");
    signInWithMagicToken.mockResolvedValue({ status: "signed-in" });

    render(<InvitationPage />);
    await submitNewJoinerForm();

    await waitFor(() =>
      expect(navigation.href).toBe("/employee-onboarding"),
    );
    expect(acceptMutate).toHaveBeenCalledTimes(1);
    expect(acceptMutate).toHaveBeenCalledWith(
      { token: "invite-token-1", firstName: "Priya", lastName: undefined },
      expect.anything(),
    );
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
    expect(signInWithMagicToken).toHaveBeenCalledWith("invite-login-1");
    expect(routerPush).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("routes a rejected sign-in link back to sign in without claiming success", async () => {
    acceptResolvesWith("invite-login-failed");
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    render(<InvitationPage />);
    await submitNewJoinerForm();

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/signin"));
    expect(toastError).toHaveBeenCalledWith(
      "That sign-in link is no longer valid. Please sign in with the invited email address.",
    );
    expect(navigation.href).toBe("");
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
  });

  it("routes an indeterminate sign-in back to sign in with its own message", async () => {
    acceptResolvesWith("invite-login-indeterminate");
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    render(<InvitationPage />);
    await submitNewJoinerForm();

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/signin"));
    expect(toastError).toHaveBeenCalledWith(
      "We could not confirm the sign-in for the invited account. Please sign in with that email to finish joining.",
    );
    expect(navigation.href).toBe("");
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
  });

  it("tells an indeterminate outcome apart from a rejected one", async () => {
    acceptResolvesWith("invite-login-distinct-failed");
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    const failedView = render(<InvitationPage />);
    await submitNewJoinerForm();
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    const failedMessage = toastError.mock.calls[0]?.[0] ?? "";
    failedView.unmount();

    toastError.mockClear();
    acceptResolvesWith("invite-login-distinct-indeterminate");
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    render(<InvitationPage />);
    await submitNewJoinerForm();
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    const indeterminateMessage = toastError.mock.calls[0]?.[0] ?? "";

    expect(failedMessage).not.toBe("");
    expect(indeterminateMessage).not.toBe("");
    expect(indeterminateMessage).not.toBe(failedMessage);
  });

  it("falls back to sign in when acceptance issues no sign-in token", async () => {
    acceptResolvesWith("");

    render(<InvitationPage />);
    await submitNewJoinerForm();

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/signin"));
    expect(signInWithMagicToken).not.toHaveBeenCalled();
    expect(navigation.href).toBe("");
  });
});

describe("InvitationPage — accepting as an existing account", () => {
  it("accepts with the token alone and lands on the dashboard once", async () => {
    validation.data = { ...VALID_INVITATION, userExists: true };
    currentSession = { user: { email: "existing@acme.test" } };
    acceptResolvesWith("invite-login-existing");
    signInWithMagicToken.mockResolvedValue({ status: "signed-in" });

    render(<InvitationPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /accept & join/i }));

    await waitFor(() => expect(navigation.href).toBe("/dashboard"));
    expect(acceptMutate).toHaveBeenCalledWith(
      { token: "invite-token-1" },
      expect.anything(),
    );
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("does not treat the unrelated session already in the browser as the invitation login", async () => {
    validation.data = { ...VALID_INVITATION, userExists: true };
    currentSession = { user: { email: "someone.else@acme.test" } };
    acceptResolvesWith("invite-login-other-session");
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    render(<InvitationPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /accept & join/i }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/signin"));
    expect(navigation.href).toBe("");
    expect(refreshSessionClaims).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      "We could not confirm the sign-in for the invited account. Please sign in with that email to finish joining.",
    );
  });

  it("warns when the browser holds a different account than the invitation", () => {
    validation.data = { ...VALID_INVITATION, userExists: true };
    currentSession = { user: { email: "someone.else@acme.test" } };

    render(<InvitationPage />);

    const warning = screen.getByText(/you are currently signed in as/i);
    expect(warning).toBeVisible();
    expect(within(warning).getByText("someone.else@acme.test")).toBeVisible();
  });

  it("two accept events in the same render consume the invitation once", () => {
    validation.data = { ...VALID_INVITATION, userExists: true };
    currentSession = { user: { email: "existing@acme.test" } };

    render(<InvitationPage />);
    const accept = screen.getByRole("button", { name: /accept & join/i });
    fireEvent.click(accept);
    fireEvent.click(accept);

    expect(acceptMutate).toHaveBeenCalledTimes(1);
  });
});

describe("InvitationPage — declining", () => {
  it("confirms the decline, reports it and returns to sign in", async () => {
    declineResolves();

    render(<InvitationPage />);
    const user = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    await user.click(
      screen.getByRole("button", { name: /decline invitation/i }),
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(/decline this invitation\?/i),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: /decline invitation/i }),
    );

    expect(declineMutate).toHaveBeenCalledWith(
      { token: "invite-token-1" },
      expect.anything(),
    );
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/signin"));
    expect(toastSuccess).toHaveBeenCalledWith(
      "Invitation declined. We let the sender know.",
    );
    expect(signInWithMagicToken).not.toHaveBeenCalled();
    expect(navigation.href).toBe("");
  });
});

describe("InvitationPage — the invitation cannot be used", () => {
  it("explains an expired invitation and offers only sign in", async () => {
    validation.data = undefined;
    validation.error = new Error("This invitation has expired");

    render(<InvitationPage />);

    expect(
      screen.getByRole("heading", { name: /invitation unavailable/i }),
    ).toBeVisible();
    expect(screen.getByText("This invitation has expired")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /accept invitation/i }),
    ).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /go to sign in/i }));

    expect(routerPush).toHaveBeenCalledWith("/signin");
    expect(acceptMutate).not.toHaveBeenCalled();
  });

  it("shows the validating placeholder before the invitation resolves", () => {
    validation.isPending = true;
    validation.data = undefined;

    render(<InvitationPage />);

    expect(
      screen.queryByRole("button", { name: /accept invitation/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /invitation unavailable/i }),
    ).toBeNull();
  });
});
