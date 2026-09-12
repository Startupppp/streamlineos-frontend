import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
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

  describe("code stage — accessible name and error wiring", () => {
    it("the OTP field carries an accessible name from the component, not from the test double", async () => {
      await renderInCodeStage();
      const byLabel = screen.getByLabelText("Verification code");
      expect(byLabel).toBe(screen.getByTestId("otp-input"));
      expect(byLabel).toHaveAttribute("id", "otp-code");
      expect(byLabel).toHaveAttribute("aria-describedby", "otp-code-hint");
    });

    it("points aria-describedby at the error and marks the field invalid once a verify fails", async () => {
      await renderInCodeStage();
      const otpInput = screen.getByTestId("otp-input");
      fireEvent.change(otpInput, { target: { value: "123456" } });
      await act(async () => {
        verifyOtpOnError?.(new ApiError("Invalid or expired code", 401));
      });
      const field = screen.getByTestId("otp-input");
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field.getAttribute("aria-describedby")).toContain("otp-code-error");
      expect(screen.getByRole("alert")).toHaveAttribute("id", "otp-code-error");
    });
  });

  describe("code stage — the Verify control is reachable only when retrying is valid", () => {
    it("clears the code after a server verdict, so a spent code cannot be resubmitted", async () => {
      await renderInCodeStage();
      fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });
      expect(mockVerifyOtpMutate).toHaveBeenCalledTimes(1);
      await act(async () => {
        verifyOtpOnError?.(new ApiError("Invalid or expired code", 401));
      });
      expect(screen.getByTestId("otp-input")).toHaveValue("");
      expect(screen.queryByRole("button", { name: /verify code/i })).not.toBeInTheDocument();
    });

    it("keeps the code after a request that never reached a verdict, and Verify retries it", async () => {
      await renderInCodeStage();
      fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });
      expect(mockVerifyOtpMutate).toHaveBeenCalledTimes(1);
      await act(async () => {
        verifyOtpOnError?.(new TypeError("Failed to fetch"));
      });
      expect(screen.getByTestId("otp-input")).toHaveValue("123456");
      const verify = screen.getByRole("button", { name: /verify code/i });
      expect(verify).toBeEnabled();
      fireEvent.click(verify);
      expect(mockVerifyOtpMutate).toHaveBeenCalledTimes(2);
      expect(mockVerifyOtpMutate).toHaveBeenLastCalledWith({
        email: "test@example.com",
        code: "123456",
      });
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
});
