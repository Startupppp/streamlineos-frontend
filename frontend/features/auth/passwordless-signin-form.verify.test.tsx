import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PasswordlessSigninForm } from "./components/passwordless-signin-form";
import { useRequestOtp, useVerifyOtp, useSendMagicLink } from "@/hooks/api/auth";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
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

const OTP_RESEND_COOLDOWN_MS = 31_000;

beforeAll(() => {
  Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
    configurable: true,
  });
});

describe("PasswordlessSigninForm", () => {
  let requestOtpOnSuccess: ((data: RequestOtpResult, vars: string) => void) | undefined;
  let _requestOtpOnError: ((error: Error) => void) | undefined;
  let verifyOtpOnSuccess: ((data: VerifyOtpResult) => Promise<void>) | undefined;
  let _verifyOtpOnError: ((error: Error) => void) | undefined;

  const _mockRequestOtpMutate = jest.fn();
  const mockVerifyOtpMutate = jest.fn();

  function setupMocks(verifyIsPending = false) {
    mockedUseRequestOtp.mockImplementation((options: {
      onSuccess?: (data: RequestOtpResult, vars: string) => void;
      onError?: (error: Error) => void;
    }) => {
      requestOtpOnSuccess = options?.onSuccess;
      _requestOtpOnError = options?.onError;
      return { mutate: _mockRequestOtpMutate, isPending: false };
    });

    mockedUseVerifyOtp.mockImplementation((options: {
      onSuccess?: (data: VerifyOtpResult) => Promise<void>;
      onError?: (error: Error) => void;
    }) => {
      verifyOtpOnSuccess = options?.onSuccess;
      _verifyOtpOnError = options?.onError;
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

  describe("superseded-code notice", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it("shows no superseded notice on the first code, because nothing has been replaced yet", async () => {
      await renderInCodeStage();
      expect(screen.queryByText(/stopped working/i)).not.toBeInTheDocument();
    });

    it("warns that the earlier code stopped working once a resend lands, because the server invalidates every outstanding code when it issues a new one and the two failures are otherwise indistinguishable", async () => {
      jest.useFakeTimers();
      setupMocks();
      render(<PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.submit(emailInput.closest("form")!);
      await act(async () => {
        requestOtpOnSuccess?.({ message: "Code sent" }, "test@example.com");
      });

      await act(async () => {
        jest.advanceTimersByTime(OTP_RESEND_COOLDOWN_MS);
      });

      fireEvent.click(screen.getByRole("button", { name: /resend code/i }));
      await act(async () => {
        requestOtpOnSuccess?.({ message: "Code sent" }, "test@example.com");
      });

      expect(screen.getByText(/stopped working/i)).toBeInTheDocument();
    });
  });

  describe("session-scope remount during sign-in", () => {
    it("still navigates when the form unmounts mid sign-in, because signing in remounts the provider tree and the user is already authenticated by then", async () => {
      setupMocks();
      const { unmount } = render(
        <PasswordlessSigninForm getCallbackUrl={() => "/dashboard"} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.submit(emailInput.closest("form")!);
      await act(async () => {
        requestOtpOnSuccess?.({ message: "Code sent" }, "test@example.com");
      });

      let resolveSignIn: ((value: { status: string }) => void) | undefined;
      mockedSignInWithMagicToken.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
      );

      const pending = verifyOtpOnSuccess?.({ autoLoginToken: "tok" });
      unmount();

      await act(async () => {
        resolveSignIn?.({ status: "signed-in" });
        await pending;
      });

      expect(mockLocation.assign).toHaveBeenCalledWith("/dashboard");
    });
  });
});
