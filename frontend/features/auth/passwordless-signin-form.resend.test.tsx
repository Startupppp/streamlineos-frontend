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
      jest.runOnlyPendingTimers();
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
