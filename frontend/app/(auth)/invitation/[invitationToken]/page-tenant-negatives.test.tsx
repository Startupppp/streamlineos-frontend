import { Component, type HTMLAttributes, type PropsWithChildren, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/invitation/tenant-token",
  useParams: () => ({ invitationToken: "tenant-token" }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  getSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import InvitationPage from "@/app/(auth)/invitation/[invitationToken]/page";

class RouteSegmentBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p>route boundary hit</p>;
    return this.props.children;
  }
}

function renderPage() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <RouteSegmentBoundary>
        <InvitationPage />
      </RouteSegmentBoundary>
    </QueryClientProvider>,
  );
}

describe("InvitationPage — cross-tenant 404 and in-tenant 403", () => {
  beforeEach(() => {
    jest.mocked(apiClient.get).mockReset();
  });

  it("shows Invitation expired for cross-tenant 404 without raw UUIDs", async () => {
    jest.mocked(apiClient.get).mockRejectedValue(
      new ApiError(
        "Invitation not found 7eca7bad-1234-4abc-9def-0123456789ab",
        404,
        "NOT_FOUND",
      ),
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText("Invitation expired")).toBeVisible();
    expect(screen.queryByText(/7eca7bad/i)).not.toBeInTheDocument();
    expect(screen.queryByText("route boundary hit")).toBeNull();
    consoleError.mockRestore();
  });

  it("shows Invitation unavailable for in-tenant 403 without crashing", async () => {
    jest.mocked(apiClient.get).mockRejectedValue(
      new ApiError(
        "You do not have access to this invitation",
        403,
        "FORBIDDEN",
      ),
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText("Invitation unavailable")).toBeVisible();
    expect(screen.queryByText("route boundary hit")).toBeNull();
    consoleError.mockRestore();
  });
});
