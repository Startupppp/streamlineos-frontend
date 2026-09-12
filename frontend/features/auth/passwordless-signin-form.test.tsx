import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { axe } from "jest-axe";
import { PasswordlessSigninForm } from "./components/passwordless-signin-form";
import { useRequestOtp, useVerifyOtp, useSendMagicLink } from "@/hooks/api/auth";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import { ApiError } from "@/lib/api-client";
import type { RequestOtpResult, VerifyOtpResult } from "@/hooks/api/auth";

jest.mock("@/hooks/api/auth");
jest.mock("@/hooks/common/auth-hooks", () => ({
  signInWithMagicToken: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: jest.fn((e: unknown) => {
    if (e instanceof Error) return e.message;
    if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
    return "Unknown error";
  }),
}));
jest.mock("@/components/ui/input-otp", () => {
  const { createElement } = require("react");
  return {
    InputOTP: ({ onChange, children: _children, ...rest }: {
      onChange: (val: string) => void;
      children?: unknown;
    } & Record<string, unknown>) =>
      createElement("input", {
        "data-testid": "otp-input",
        ...rest,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      }),
    InputOTPGroup: ({ children }: { children: React.ReactNode }) => createElement(React.Fragment, null, children),
    InputOTPSlot: () => null,
    InputOTPSeparator: () => null,
  };
});

const mockedUseRequestOtp = useRequestOtp as jest.Mock;
const mockedUseVerifyOtp = useVerifyOtp as jest.Mock;
const mockedUseSendMagicLink = useSendMagicLink as jest.Mock;
const mockedSignInWithMagicToken = signInWithMagicToken as jest.Mock;

const mockLocation = { assign: jest.fn() };

beforeAll(() => {
  Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
    configurable: true,
  });
});

describe("PasswordlessSigninForm", () => {
  let requestOtpOnSuccess: ((data: RequestOtpResult, vars: string) => void) | undefined;
  let requestOtpOnError: ((error: Error) => void) | undefined;
  let verifyOtpOnSuccess: ((data: VerifyOtpResult) => Promise<void>) | undefined;
  let verifyOtpOnError: ((error: Error) => void) | undefined;

  const mockRequestOtpMutate = jest.fn();
  const mockVerifyOtpMutate = jest.fn();

  function setupMocks(verifyIsPending = false) {
    mockedUseRequestOtp.mockImplementation((options: {
      onSuccess?: (data: RequestOtpResult, vars: string) => void;
      onError?: (error: Error) => void;
    }) => {
      requestOtpOnSuccess = options?.onSuccess;
      requestOtpOnError = options?.onError;
      return { mutate: mockRequestOtpMutate, isPending: false };
    });

    mockedUseVerifyOtp.mockImplementation((options: {
      onSuccess?: (data: VerifyOtpResult) => Promise<void>;
      onError?: (error: Error) => void;
    }) => {
      verifyOtpOnSuccess = options?.onSuccess;
      verifyOtpOnError = options?.onError;
      return { mutate: mockVerifyOtpMutate, isPending: verifyIsPending };
    });

    mockedUseSendMagicLink.mockReturnValue({ mutate: jest.fn(), isPending: false });
  }

  async function renderInCodeStage(verifyIsPending = false) {
    setupMocks(verifyIsPending);
    render(<PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await act(async () => {
      requestOtpOnSuccess?.({ message: "Code sent" }, "test@example.com");
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.assign.mockClear();
    mockedSignInWithMagicToken.mockResolvedValue({ status: "signed-in" });
  });

  describe("email stage", () => {
    it("renders the email input and submit button", () => {
      setupMocks();
      render(<PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });
  });

  describe("code stage — Verify button visibility", () => {
    it("shows no Verify button when fewer than 6 digits are entered", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "12345" } });
      expect(screen.queryByRole("button", { name: /verify/i })).not.toBeInTheDocument();
    });

    it("shows the Verify button when exactly 6 digits are entered", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });
      expect(screen.getByRole("button", { name: /verify code/i })).toBeInTheDocument();
    });

    it("Verify button is enabled (not disabled) at 6 digits", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });
      const verifyBtn = screen.getByRole("button", { name: /verify code/i });
      expect(verifyBtn).not.toBeDisabled();
    });

    it("Verify button is not present at 0 digits", async () => {
      await renderInCodeStage();
      expect(screen.queryByRole("button", { name: /verify code/i })).not.toBeInTheDocument();
    });

    it("Verify button is not present at 3 digits", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123" } });
      expect(screen.queryByRole("button", { name: /verify code/i })).not.toBeInTheDocument();
    });
  });

  describe("single-flight guard", () => {
    it("does not call verify mutate when verification is already pending", async () => {
      await renderInCodeStage(true);
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });
      expect(mockVerifyOtpMutate).not.toHaveBeenCalled();
    });

    it("auto-submit fires exactly once on entering 6th digit when not pending", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });
      expect(mockVerifyOtpMutate).toHaveBeenCalledTimes(1);
      expect(mockVerifyOtpMutate).toHaveBeenCalledWith({
        email: "test@example.com",
        code: "123456",
      });
    });

    it("Verify button is disabled (loading) when isPending is true", async () => {
      await renderInCodeStage(true);
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      setupMocks(true);
      render(<PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />);
      await act(async () => {
        requestOtpOnSuccess?.({ message: "Code sent" }, "test@example.com");
      });
      fireEvent.change(screen.getAllByTestId("otp-input")[1], { target: { value: "123456" } });
      const verifyBtns = screen.getAllByRole("button", { name: /verify code|verifying/i });
      const lastBtn = verifyBtns[verifyBtns.length - 1];
      expect(lastBtn).toBeDisabled();
    });
  });

  describe("stale response guard — Back while pending", () => {
    it("does not navigate when Back is clicked before verification resolves", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      const backBtn = screen.getByRole("button", { name: /use a different email/i });
      fireEvent.click(backBtn);

      await act(async () => {
        await verifyOtpOnSuccess?.({ autoLoginToken: "tok" });
      });

      expect(mockLocation.assign).not.toHaveBeenCalled();
    });
  });

  describe("inline error live region", () => {
    it("shows inline error when verification fails", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      await act(async () => {
        verifyOtpOnError?.(new Error("Invalid or expired code"));
      });

      expect(screen.getByRole("alert")).toHaveTextContent("Invalid or expired code");
    });

    it("shows inline error for network failure", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      await act(async () => {
        verifyOtpOnError?.(new Error("Network request failed"));
      });

      expect(screen.getByRole("alert")).toHaveTextContent("Network request failed");
    });

    it("shows inline error for 429 rate limit", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      const rateLimitError = Object.assign(new Error("Too many attempts. Please wait."), { status: 429 });
      await act(async () => {
        verifyOtpOnError?.(rateLimitError);
      });

      expect(screen.getByRole("alert")).toHaveTextContent("Too many attempts");
    });

    it("inline error has aria-live assertive", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      await act(async () => {
        verifyOtpOnError?.(new Error("Expired code"));
      });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("clears inline error when OTP value changes", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      await act(async () => {
        verifyOtpOnError?.(new Error("Expired code"));
      });

      expect(screen.getByRole("alert")).toBeInTheDocument();

      fireEvent.change(otpInput, { target: { value: "12345" } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("indeterminate outcome", () => {
    it("shows recoverable message (not navigation) when status is indeterminate", async () => {
      mockedSignInWithMagicToken.mockResolvedValue({ status: "indeterminate" });
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      await act(async () => {
        await verifyOtpOnSuccess?.({ autoLoginToken: "tok" });
      });

      expect(mockLocation.assign).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("uncertain");
    });

    it("navigates when status is signed-in", async () => {
      mockedSignInWithMagicToken.mockResolvedValue({ status: "signed-in" });
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      await act(async () => {
        await verifyOtpOnSuccess?.({ autoLoginToken: "tok" });
      });

      expect(mockLocation.assign).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Resend while pending", () => {
    it("disables Resend button when verification is pending", async () => {
      await renderInCodeStage(true);
      const resendBtn = screen.getByRole("button", { name: /resend/i });
      expect(resendBtn).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("email stage passes axe audit", async () => {
      setupMocks();
      const { container } = render(
        <PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("code stage passes axe audit", async () => {
      const { container } = render(
        <PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />,
      );
      setupMocks();

      await act(async () => {
        requestOtpOnSuccess?.({ message: "Code sent" }, "test@example.com");
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    // jsdom has no layout engine — `scrollWidth` and `offsetWidth` are 0 here, so
    // no jest test can see an overflow. The real 320px verdict is
    // `scripts/verify-identity-journey.mjs`, whose `overflowVerdict` compares
    // `scrollWidth` against `innerWidth` in Chrome. This only pins that the form
    // mounts inside a narrow container.
    it("mounts inside a 320px container (overflow itself is proved in the browser harness)", async () => {
      setupMocks();
      const { container } = render(
        <div style={{ width: "320px" }}>
          <PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />
        </div>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("the code field sanitises what it is given", () => {
    it("strips separators and whitespace from a pasted code and submits it once", async () => {
      await renderInCodeStage();

      fireEvent.change(screen.getByTestId("otp-input"), {
        target: { value: "12-34 56" },
      });

      expect(screen.getByTestId("otp-input")).toHaveValue("123456");
      expect(mockVerifyOtpMutate).toHaveBeenCalledTimes(1);
      expect(mockVerifyOtpMutate).toHaveBeenCalledWith({
        email: "test@example.com",
        code: "123456",
      });
    });

    it("truncates an over-long paste to six digits rather than sending the whole string", async () => {
      await renderInCodeStage();

      fireEvent.change(screen.getByTestId("otp-input"), {
        target: { value: "1234567890" },
      });

      expect(mockVerifyOtpMutate).toHaveBeenCalledWith({
        email: "test@example.com",
        code: "123456",
      });
    });

    it("(negative) a paste with no digits submits nothing and leaves the field empty", async () => {
      await renderInCodeStage();

      fireEvent.change(screen.getByTestId("otp-input"), {
        target: { value: "abc-def" },
      });

      expect(screen.getByTestId("otp-input")).toHaveValue("");
      expect(mockVerifyOtpMutate).not.toHaveBeenCalled();
    });
  });

  describe("resend cooldown", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
    });

    function resendControl(): HTMLElement {
      return screen.getByRole("button", { name: /resend/i });
    }

    it("starts a 30-second countdown on a delivered code and disables Resend for its duration", async () => {
      await renderInCodeStage();

      expect(resendControl()).toHaveTextContent("Resend in 30s");
      expect(resendControl()).toBeDisabled();

      act(() => {
        jest.advanceTimersByTime(1_000);
      });
      expect(resendControl()).toHaveTextContent("Resend in 29s");

      act(() => {
        jest.advanceTimersByTime(29_000);
      });
      expect(resendControl()).toHaveTextContent("Resend code");
      expect(resendControl()).toBeEnabled();

      fireEvent.click(resendControl());
      expect(mockRequestOtpMutate).toHaveBeenLastCalledWith("test@example.com");
    });

    it("(negative) a click during the cooldown requests nothing", async () => {
      await renderInCodeStage();
      mockRequestOtpMutate.mockClear();

      fireEvent.click(resendControl());

      expect(mockRequestOtpMutate).not.toHaveBeenCalled();
    });

    it("clears the countdown when the user goes back to the email stage", async () => {
      await renderInCodeStage();

      fireEvent.click(screen.getByRole("button", { name: /use a different email/i }));

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(screen.queryByText(/resend in/i)).toBeNull();
    });

    it("PINNED GAP: a 429 surfaces its message but starts no cooldown of its own", async () => {
      // The only cooldown in this form is the 30s resend timer, started by a
      // SUCCESSFUL request. Nothing reads the 429's `retryAfterSeconds`, so after
      // the resend timer elapses the control is offered again immediately even
      // though the server is still refusing. Recorded, not repaired: wiring the
      // server's retry-after into this control is a product decision.
      await renderInCodeStage();
      act(() => {
        jest.advanceTimersByTime(30_000);
      });
      expect(resendControl()).toBeEnabled();

      await act(async () => {
        verifyOtpOnError?.(
          new ApiError("Too many attempts. Try again later.", 429, "AUTH_RATE_LIMITED"),
        );
      });

      expect(screen.getByRole("alert")).toHaveTextContent("Too many attempts");
      expect(resendControl()).toBeEnabled();
      expect(resendControl()).toHaveTextContent("Resend code");
    });
  });
});
