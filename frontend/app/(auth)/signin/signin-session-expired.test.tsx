import { render, screen, waitFor } from "@testing-library/react";

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

jest.mock("@/lib/auth-providers", () => ({
  hasGoogleProvider: false,
}));

import SignInPage from "@/app/(auth)/signin/page";

const realLocation = window.location;

interface MockLocation {
  pathname: string;
  search: string;
  assign: jest.Mock;
  replace: jest.Mock;
}

const mockLocation: MockLocation = {
  pathname: "/signin",
  search: "",
  assign: jest.fn(),
  replace: jest.fn(),
};

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: mockLocation,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

beforeEach(() => {
  mockLocation.search = "";
  jest.clearAllMocks();
});

describe("SignInPage — session-expired banner", () => {
  test("renders the session-expired message when ?session=expired is present and no error param", async () => {
    mockLocation.search = "?session=expired";
    render(<SignInPage />);
    await waitFor(() => {
      expect(
        screen.getByText("Your session expired. Sign in again to continue."),
      ).toBeInTheDocument();
    });
  });

  test("does not render the session-expired message when no params are present", async () => {
    mockLocation.search = "";
    render(<SignInPage />);
    await waitFor(() => {
      expect(
        screen.queryByText("Your session expired. Sign in again to continue."),
      ).not.toBeInTheDocument();
    });
  });

  test("does not render the session-expired message when only an error param is present", async () => {
    mockLocation.search = "?error=AccessDenied";
    render(<SignInPage />);
    await waitFor(() => {
      expect(
        screen.queryByText("Your session expired. Sign in again to continue."),
      ).not.toBeInTheDocument();
    });
  });

  test("renders the session-expired message even when an error param is also present", async () => {
    mockLocation.search = "?session=expired&error=OAuthCallback";
    render(<SignInPage />);
    await waitFor(() => {
      expect(
        screen.getByText("Your session expired. Sign in again to continue."),
      ).toBeInTheDocument();
    });
  });
});
