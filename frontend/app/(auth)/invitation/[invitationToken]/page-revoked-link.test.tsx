import { Component, type HTMLAttributes, type PropsWithChildren, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";

/**
 * SEC-HRMS-004. The sibling page tests mock `useValidateInvitation` whole, so
 * the provider's `throwOnError` default never ran against this page: a revoked
 * link's 404 threw to the route boundary (rendered as blank "empty") and the
 * page's own "Invitation expired" card was unreachable. This one keeps the
 * real hook and the real query client, and fakes only the transport.
 */

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
  usePathname: () => "/invitation/revoked-token",
  useParams: () => ({ invitationToken: "revoked-token" }),
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

it("shows the expired card for a revoked link instead of throwing to the route boundary", async () => {
  jest
    .mocked(apiClient.get)
    .mockRejectedValue(new ApiError("Invitation not found", 404, "NOT_FOUND"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  render(
    <QueryClientProvider client={createAppQueryClient()}>
      <RouteSegmentBoundary>
        <InvitationPage />
      </RouteSegmentBoundary>
    </QueryClientProvider>,
  );

  expect(await screen.findByText("Invitation expired")).toBeVisible();
  expect(screen.queryByText("route boundary hit")).toBeNull();
  expect(apiClient.get).toHaveBeenCalledWith(
    "/organization/invitations/validate",
    { token: "revoked-token" },
    expect.anything(),
    expect.anything(),
  );
  consoleError.mockRestore();
});
