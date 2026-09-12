import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import type { MagicLinkSignInOutcome } from "@/hooks/common/auth-hooks";

interface NavigationRecorder {
  href: string;
  assign: jest.Mock<void, [string]>;
  replace: jest.Mock<void, [string]>;
}

const signInWithMagicToken =
  jest.fn<Promise<MagicLinkSignInOutcome>, [string]>();

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

jest.mock("@/hooks/common/auth-hooks", () => ({
  signInWithMagicToken: (token: string) => signInWithMagicToken(token),
}));

import MagicLinkPage from "@/app/(auth)/magic-link/page";

const navigation: NavigationRecorder = {
  href: "",
  assign: jest.fn(),
  replace: jest.fn(),
};
const realLocation = window.location;

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
  signInWithMagicToken.mockResolvedValue({ status: "failed" });
});

describe("MagicLinkPage — the link carries no token", () => {
  it("explains the missing token without attempting a sign-in", () => {
    currentSearchParams = new URLSearchParams();

    render(<MagicLinkPage />);

    const heading = screen.getByRole("heading", { name: /link expired/i });
    expect(messageUnder(heading)).toMatch(/missing its sign-in token/i);
    expect(signInWithMagicToken).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

describe("MagicLinkPage — the three sign-in outcomes", () => {
  it("replaces to the dashboard exactly once on a confirmed sign-in", async () => {
    currentSearchParams = new URLSearchParams({ token: "ml-signed-in" });
    signInWithMagicToken.mockResolvedValue({ status: "signed-in" });

    const view = render(<MagicLinkPage />);

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/dashboard"),
    );
    view.rerender(<MagicLinkPage />);

    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
    expect(signInWithMagicToken).toHaveBeenCalledWith("ml-signed-in");
  });

  it("shows the expired-link panel and stays put when the token is rejected", async () => {
    currentSearchParams = new URLSearchParams({ token: "ml-failed" });
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    const view = render(<MagicLinkPage />);

    const heading = await screen.findByRole("heading", {
      name: /link expired/i,
    });
    expect(messageUnder(heading)).toMatch(/invalid, expired, or has already/i);
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(navigation.href).toBe("");

    view.rerender(<MagicLinkPage />);
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable not-confirmed panel and stays put when the outcome is indeterminate", async () => {
    currentSearchParams = new URLSearchParams({ token: "ml-indeterminate" });
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    const view = render(<MagicLinkPage />);

    const heading = await screen.findByRole("heading", {
      name: /sign-in not confirmed/i,
    });
    expect(messageUnder(heading)).toMatch(/nothing was changed on this device/i);
    expect(
      screen.getByRole("link", { name: /sign in again/i }),
    ).toHaveAttribute("href", "/signin");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(navigation.href).toBe("");

    view.rerender(<MagicLinkPage />);
    expect(signInWithMagicToken).toHaveBeenCalledTimes(1);
    expect(signInWithMagicToken).toHaveBeenCalledWith("ml-indeterminate");
  });

  it("tells an indeterminate outcome apart from a rejected token", async () => {
    currentSearchParams = new URLSearchParams({ token: "ml-distinct-failed" });
    signInWithMagicToken.mockResolvedValue({ status: "failed" });

    const failedView = render(<MagicLinkPage />);
    const failedHeading = await screen.findByRole("heading", {
      name: /link expired/i,
    });
    const failedTitle = failedHeading.textContent ?? "";
    const failedMessage = messageUnder(failedHeading);
    failedView.unmount();

    currentSearchParams = new URLSearchParams({
      token: "ml-distinct-indeterminate",
    });
    signInWithMagicToken.mockResolvedValue({ status: "indeterminate" });

    render(<MagicLinkPage />);
    const indeterminateHeading = await screen.findByRole("heading", {
      name: /sign-in not confirmed/i,
    });

    expect(failedTitle).not.toBe("");
    expect(failedMessage).not.toBe("");
    expect(indeterminateHeading.textContent).not.toBe(failedTitle);
    expect(messageUnder(indeterminateHeading)).not.toBe(failedMessage);
  });

  it("shows the signing-in state until the outcome resolves", async () => {
    currentSearchParams = new URLSearchParams({ token: "ml-pending" });
    let settle: (outcome: MagicLinkSignInOutcome) => void = () => {};
    signInWithMagicToken.mockReturnValue(
      new Promise<MagicLinkSignInOutcome>((resolve) => {
        settle = resolve;
      }),
    );

    render(<MagicLinkPage />);

    expect(screen.getByText(/signing you in/i)).toBeVisible();
    expect(navigation.replace).not.toHaveBeenCalled();

    settle({ status: "failed" });

    expect(
      await screen.findByRole("heading", { name: /link expired/i }),
    ).toBeVisible();
  });
});
