import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { axe } from "jest-axe";
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
});
