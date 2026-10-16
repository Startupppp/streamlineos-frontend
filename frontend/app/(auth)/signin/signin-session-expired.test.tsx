import { render, screen } from "@testing-library/react";

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

jest.mock("@/lib/parse-auth-error", () => ({
  parseAuthErrorCode: jest.fn(() => ({ code: "OTHER" })),
}));

jest.mock("@/features/auth", () => ({
  PasswordlessSigninForm: () => null,
  OAuthButtons: () => null,
  SignInAlerts: () => null,
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useGoogleSignIn: () => ({ mutate: jest.fn(), isPending: false }),
}));

import { SignInPageClient } from "@/app/(auth)/signin/signin-page-client";

beforeEach(() => jest.clearAllMocks());

describe("SignInPage — session-expired redirect state", () => {
  test("(positive) renders the session-expired banner when sessionParam is 'expired'", () => {
    render(<SignInPageClient hasGoogle={false} sessionParam="expired" />);
    expect(
      screen.queryByText("Your session expired. Sign in again to continue."),
    ).toBeInTheDocument();
  });

  test("(negative) does not render the banner when sessionParam is absent", () => {
    render(<SignInPageClient hasGoogle={false} />);
    expect(
      screen.queryByText("Your session expired. Sign in again to continue."),
    ).not.toBeInTheDocument();
  });

  test("(negative) does not render the banner when only an error param is present", () => {
    render(<SignInPageClient hasGoogle={false} errorParam="AccessDenied" />);
    expect(
      screen.queryByText("Your session expired. Sign in again to continue."),
    ).not.toBeInTheDocument();
  });

  test("(positive) still renders the banner when an error param is also present", () => {
    render(
      <SignInPageClient
        hasGoogle={false}
        sessionParam="expired"
        errorParam="OAuthCallback"
      />,
    );
    expect(
      screen.queryByText("Your session expired. Sign in again to continue."),
    ).toBeInTheDocument();
  });
});
