import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
} from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MagicLinkSignInOutcome } from "@/hooks/common/auth-hooks";

interface VerifyEmailData {
  autoLoginToken: string;
}

interface VerifyEmailCallbacks {
  onSuccess: (data: VerifyEmailData) => Promise<void> | void;
  onError: (error: unknown) => void;
}

interface ResendCallbacks {
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

interface NavigationRecorder {
  href: string;
  assign: jest.Mock<void, [string]>;
  replace: jest.Mock<void, [string]>;
}

const verifyMutate = jest.fn<void, [{ token: string }, VerifyEmailCallbacks]>();
const resendMutate = jest.fn<void, [{ email: string }, ResendCallbacks]>();
const signInWithMagicToken =
  jest.fn<Promise<MagicLinkSignInOutcome>, [string]>();
const toastSuccess = jest.fn<void, [string]>();
const toastError = jest.fn<void, [string]>();
const pendingState = { verify: false, resend: false };

let currentSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
}));

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

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
  useVerifyEmail: () => ({
    mutate: verifyMutate,
    isPending: pendingState.verify,
  }),
  useResendVerificationEmail: () => ({
    mutate: resendMutate,
    isPending: pendingState.resend,
  }),
}));

import VerifyEmailPage from "@/app/(auth)/verify-email/page";

const navigation: NavigationRecorder = {
  href: "",
  assign: jest.fn(),
  replace: jest.fn(),
};
const realLocation = window.location;

function resolveVerificationWith(autoLoginToken: string) {
  verifyMutate.mockImplementation((_variables, callbacks) => {
    void callbacks.onSuccess({ autoLoginToken });
  });
}

function rejectVerificationWith(error: unknown) {
  verifyMutate.mockImplementation((_variables, callbacks) => {
    callbacks.onError(error);
  });
}

function leaveVerificationInFlight() {
  verifyMutate.mockImplementation(() => {});
}

function messageUnder(heading: HTMLElement): string {
  return heading.nextElementSibling?.textContent ?? "";
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
  pendingState.verify = false;
  pendingState.resend = false;
  leaveVerificationInFlight();
  signInWithMagicToken.mockResolvedValue({ status: "failed" });
});

describe("VerifyEmailPage — the three auto sign-in outcomes", () => {
  it("sends a confirmed sign-in to org setup with a single token attempt", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-signed-in" });
    resolveVerificationWith("login-signed-in");
    signInWithMagicToken.mockResolvedValue({ status: "signed-in" });

    const view = render(<VerifyEmailPage />);

    await waitFor(() => expect(navigation.href).toBe("/org-setup"));
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
    expect(signInWithMagicToken).toHaveBeenCalledWith("login-signed-in");
    expect(toastSuccess).toHaveBeenCalledWith("Email verified! Signing you in…");
    expect(toastError).not.toHaveBeenCalled();

    view.unmount();
  });

  it("leaves no recorded outcome behind after a confirmed sign-in", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-cleared" });
    resolveVerificationWith("login-cleared");
    signInWithMagicToken.mockResolvedValue({ status: "signed-in" });

    const view = render(<VerifyEmailPage />);
    await waitFor(() => expect(navigation.href).toBe("/org-setup"));
    view.unmount();

    leaveVerificationInFlight();
    render(<VerifyEmailPage />);

    await waitFor(() => expect(verifyMutate).toHaveBeenCalledTimes(2));
    expect(verifyMutate).toHaveBeenLastCalledWith(
      { token: "vt-cleared" },
      expect.anything(),
    );
  });

  it("shows the sign-in incomplete panel and never navigates when sign-in fails", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-failed" });
    resolveVerificationWith("login-failed");
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    render(<VerifyEmailPage />);

    const heading = await screen.findByRole("heading", {
      name: /sign-in incomplete/i,
    });
    expect(messageUnder(heading)).toMatch(/no longer valid/i);
    expect(navigation.href).toBe("");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(navigation.assign).not.toHaveBeenCalled();
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
  });

  it("shows a not-confirmed panel and never navigates when sign-in is indeterminate", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-indeterminate" });
    resolveVerificationWith("login-indeterminate");
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    render(<VerifyEmailPage />);

    const heading = await screen.findByRole("heading", {
      name: /sign-in not confirmed/i,
    });
    expect(messageUnder(heading)).toMatch(/could not confirm the sign-in/i);
    expect(navigation.href).toBe("");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(navigation.assign).not.toHaveBeenCalled();
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
  });

  it("tells an indeterminate outcome apart from a failed one", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-distinct-failed" });
    resolveVerificationWith("login-distinct-failed");
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    const failedView = render(<VerifyEmailPage />);
    const failedHeading = await screen.findByRole("heading", {
      name: /sign-in incomplete/i,
    });
    const failedTitle = failedHeading.textContent ?? "";
    const failedMessage = messageUnder(failedHeading);
    failedView.unmount();

    currentSearchParams = new URLSearchParams({
      token: "vt-distinct-indeterminate",
    });
    resolveVerificationWith("login-distinct-indeterminate");
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    render(<VerifyEmailPage />);
    const indeterminateHeading = await screen.findByRole("heading", {
      name: /sign-in not confirmed/i,
    });
    const indeterminateTitle = indeterminateHeading.textContent ?? "";
    const indeterminateMessage = messageUnder(indeterminateHeading);

    expect(failedTitle).not.toBe("");
    expect(failedMessage).not.toBe("");
    expect(indeterminateTitle).not.toBe(failedTitle);
    expect(indeterminateMessage).not.toBe(failedMessage);
  });
});

describe("VerifyEmailPage — a remount reads the recorded attempt", () => {
  it("renders the recorded failure instead of the pre-verification panel", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-remount" });
    resolveVerificationWith("login-remount");
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    const view = render(<VerifyEmailPage />);
    await screen.findByRole("heading", { name: /sign-in incomplete/i });
    view.unmount();

    render(<VerifyEmailPage />);

    expect(
      await screen.findByRole("heading", { name: /sign-in incomplete/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: /check your email/i }),
    ).toBeNull();
    expect(verifyMutate).toHaveBeenCalledTimes(1);
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
  });

  it("renders a result-unavailable panel when the recorded attempt never finished", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-interrupted" });
    pendingState.verify = true;
    leaveVerificationInFlight();

    const view = render(<VerifyEmailPage />);
    expect(
      await screen.findByRole("heading", { name: /verifying email/i }),
    ).toBeVisible();
    view.unmount();

    pendingState.verify = false;
    render(<VerifyEmailPage />);

    const heading = await screen.findByRole("heading", {
      name: /verification result unavailable/i,
    });
    expect(messageUnder(heading)).toMatch(/no longer available here/i);
    expect(
      screen.queryByRole("heading", { name: /check your email/i }),
    ).toBeNull();
    expect(verifyMutate).toHaveBeenCalledTimes(1);
    expect(signInWithMagicToken).not.toHaveBeenCalled();
  });

  it("never suppresses verification for a different token", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-other-a" });
    resolveVerificationWith("login-other-a");
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    const view = render(<VerifyEmailPage />);
    await screen.findByRole("heading", { name: /sign-in incomplete/i });
    view.unmount();

    currentSearchParams = new URLSearchParams({ token: "vt-other-b" });
    resolveVerificationWith("login-other-b");
    render(<VerifyEmailPage />);

    await waitFor(() => expect(verifyMutate).toHaveBeenCalledTimes(2));
    expect(verifyMutate).toHaveBeenLastCalledWith(
      { token: "vt-other-b" },
      expect.anything(),
    );
    expect(signInWithMagicToken).toHaveBeenCalledTimes(2);
    expect(signInWithMagicToken).toHaveBeenNthCalledWith(1, "login-other-a");
    expect(signInWithMagicToken).toHaveBeenNthCalledWith(2, "login-other-b");
  });

  it("clears the recorded entry and re-runs verification on retry", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-retry" });
    rejectVerificationWith(new Error("This link has expired"));

    render(<VerifyEmailPage />);

    const heading = await screen.findByRole("heading", {
      name: /verification failed/i,
    });
    expect(messageUnder(heading)).toBe("This link has expired");

    resolveVerificationWith("login-retry");
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(
      await screen.findByRole("heading", { name: /sign-in not confirmed/i }),
    ).toBeVisible();
    expect(verifyMutate).toHaveBeenCalledTimes(2);
    expect(verifyMutate).toHaveBeenLastCalledWith(
      { token: "vt-retry" },
      expect.anything(),
    );
  });
});

describe("VerifyEmailPage — nothing to verify", () => {
  it("shows the check-your-email panel and verifies nothing without a token", () => {
    currentSearchParams = new URLSearchParams({ email: "joiner@acme.test" });

    render(<VerifyEmailPage />);

    expect(
      screen.getByRole("heading", { name: /check your email/i }),
    ).toBeVisible();
    expect(screen.getByText("joiner@acme.test")).toBeVisible();
    expect(verifyMutate).not.toHaveBeenCalled();
    expect(signInWithMagicToken).not.toHaveBeenCalled();
  });

  it("reports a verified email with no sign-in token without attempting sign-in", async () => {
    currentSearchParams = new URLSearchParams({ token: "vt-no-login-token" });
    resolveVerificationWith("");

    render(<VerifyEmailPage />);

    const heading = await screen.findByRole("heading", {
      name: /sign-in incomplete/i,
    });
    expect(messageUnder(heading)).toMatch(/no sign-in token was issued/i);
    expect(signInWithMagicToken).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
  });
});
