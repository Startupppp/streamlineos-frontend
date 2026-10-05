import type { HTMLAttributes, PropsWithChildren } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import type {
  InvitationValidation,
  MagicLinkSignInOutcome,
} from "@/hooks/common/auth-hooks";
import { ApiError } from "@/lib/api-envelope";

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

interface RequestOtpCallbacks {
  onSuccess: () => void;
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
/**
 * Added when the invitation email OTP landed and never stubbed, so every test in
 * this file threw on render — the whole invitation flow went uncovered through the
 * release QA found broken (BUG-HRMS-010). Succeeding by default is the OTP being
 * sent; the code step is then driven explicitly.
 */
const requestOtpMutate =
  jest.fn<void, [{ token: string }, RequestOtpCallbacks]>((_variables, callbacks) => {
    callbacks.onSuccess();
  });
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

const pendingState = { accept: false, decline: false, requestOtp: false };

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
  useRequestInvitationOtp: () => ({
    mutate: requestOtpMutate,
    isPending: pendingState.requestOtp,
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

const EMAIL_OTP = "424242";

/**
 * Acceptance is two steps now: the invitee identifies themselves, the API sends a
 * code to the invited mailbox, and the code is what actually accepts. The link
 * alone is a bearer token, so it is no longer accepted as proof of who holds it.
 */
async function enterEmailCode() {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole("textbox", { name: /verification code/i }),
    EMAIL_OTP,
  );
  await user.click(screen.getByRole("button", { name: /verify & create account/i }));
}

async function submitNewJoinerForm() {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole("textbox", { name: /first name/i }),
    "Priya",
  );
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await enterEmailCode();
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
  pendingState.requestOtp = false;
  acceptMutate.mockImplementation(() => {});
  declineMutate.mockImplementation(() => {});
  requestOtpMutate.mockImplementation((_variables, callbacks) => {
    callbacks.onSuccess();
  });
  refreshSessionClaims.mockResolvedValue(null);
  signInWithMagicToken.mockResolvedValue({ status: "failed" });
});

describe("InvitationPage — accepting as a new joiner", () => {
  it("signs the invited account in once and resolves its authorized landing", async () => {
    acceptResolvesWith("invite-login-1");
    signInWithMagicToken.mockResolvedValue({ status: "signed-in" });

    render(<InvitationPage />);
    await submitNewJoinerForm();

    await waitFor(() =>
      expect(navigation.href).toBe("/post-invite"),
    );
    expect(acceptMutate).toHaveBeenCalledTimes(1);
    expect(acceptMutate).toHaveBeenCalledWith(
      { token: "invite-token-1", firstName: "Priya", lastName: undefined, emailOtp: EMAIL_OTP },
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
  /**
   * BUG-HRMS-010. This used to accept on the token alone. `accept` is a public
   * route, so it cannot see that the caller is signed in — a signed-in invitee is
   * indistinguishable from anyone else holding the link — and it therefore
   * requires a code on every path. The one-click version could only ever be
   * refused with a 400, so an invitee who already had an account could never
   * join, whatever the state of the OTP route.
   */
  it("verifies the invited mailbox before joining, then resolves its authorized landing once", async () => {
    validation.data = { ...VALID_INVITATION, userExists: true };
    currentSession = { user: { email: "existing@acme.test" } };
    acceptResolvesWith("invite-login-existing");
    signInWithMagicToken.mockResolvedValue({ status: "signed-in" });

    render(<InvitationPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /accept & join/i }));

    expect(requestOtpMutate).toHaveBeenCalledWith(
      { token: "invite-token-1" },
      expect.anything(),
    );
    expect(acceptMutate).not.toHaveBeenCalled();

    await enterEmailCode();

    await waitFor(() => expect(navigation.href).toBe("/post-invite"));
    expect(acceptMutate).toHaveBeenCalledWith(
      { token: "invite-token-1", emailOtp: EMAIL_OTP },
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
    await enterEmailCode();

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

  it("two code submissions in the same render consume the invitation once", async () => {
    validation.data = { ...VALID_INVITATION, userExists: true };
    currentSession = { user: { email: "existing@acme.test" } };

    render(<InvitationPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /accept & join/i }));
    await user.type(
      screen.getByRole("textbox", { name: /verification code/i }),
      EMAIL_OTP,
    );
    const verify = screen.getByRole("button", { name: /verify & create account/i });
    fireEvent.click(verify);
    fireEvent.click(verify);

    await waitFor(() => expect(acceptMutate).toHaveBeenCalledTimes(1));
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

async function acceptWithError(error: unknown) {
  validation.data = { ...VALID_INVITATION, userExists: true };
  currentSession = { user: { email: VALID_INVITATION.email } };
  acceptMutate.mockImplementation((_v, cb) => { cb.onError(error); });
  render(<InvitationPage />);
  const u = userEvent.setup();
  await u.click(screen.getByRole("button", { name: /accept & join/i }));
  await u.type(screen.getByRole("textbox", { name: /verification code/i }), EMAIL_OTP);
  await u.click(screen.getByRole("button", { name: /verify & create account/i }));
}

describe("InvitationPage — specific acceptance error states (BT-618d66782f9e)", () => {
  it("shows 'Already a member' state on ALREADY_MEMBER code without a toast (BT-618d66782f9e)", async () => {
    await acceptWithError(new ApiError("You are already a member of this organization", 409, "ALREADY_MEMBER"));
    await waitFor(() => expect(screen.getByRole("heading", { name: /already a member/i })).toBeVisible());
    expect(toastError).not.toHaveBeenCalled();
  });
  it("shows 'Already a member' state on bare 409 status without a code — fallback (BT-618d66782f9e)", async () => {
    await acceptWithError(new ApiError("You are already a member of this organization", 409));
    await waitFor(() => expect(screen.getByRole("heading", { name: /already a member/i })).toBeVisible());
    expect(toastError).not.toHaveBeenCalled();
  });
  it("shows 'Account suspended' state on ACCOUNT_SUSPENDED code (BT-618d66782f9e)", async () => {
    await acceptWithError(new ApiError("This account is suspended", 403, "ACCOUNT_SUSPENDED"));
    await waitFor(() => expect(screen.getByRole("heading", { name: /account suspended/i })).toBeVisible());
    expect(toastError).not.toHaveBeenCalled();
  });
  it("shows 'Organization at capacity' state on ORG_AT_CAPACITY code (BT-618d66782f9e)", async () => {
    await acceptWithError(new ApiError("This organization has reached its member limit", 403, "ORG_AT_CAPACITY"));
    await waitFor(() => expect(screen.getByRole("heading", { name: /organization at capacity/i })).toBeVisible());
    expect(toastError).not.toHaveBeenCalled();
  });
  it("falls back to a toast for unclassified errors — control (BT-618d66782f9e)", async () => {
    await acceptWithError(new Error("Something went wrong"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: /already a member/i })).toBeNull();
  });
});
