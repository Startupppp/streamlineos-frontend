import { Component, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { CompOffPageClient } from "@/features/hr/overtime/comp-off-page-client";
import { UserStatsCards } from "@/features/directory/users/user-stats-cards";

/**
 * The shape this pins: a read that fails reaches a surface as `data === undefined`,
 * and a screen that spells that `?? 0` renders a confident zero. Without the
 * provider's `throwOnError`, `UserStatsCards` tells the user the organization has
 * 0 users, 0 active and 0 suspended — five numbers, none of them measured.
 *
 * `CompOffPageClient` is the control: it branches on `isError` first, so the same
 * failed read renders its own inline `ErrorState` rather than a fabricated 0.0.
 * Both still reach the route boundary once the policy is installed, which is the
 * point — the policy does not depend on the screen remembering to check.
 */

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import { useEntitlements } from "@/hooks/api/entitlements";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const ACCESS: AccessResponse = {
  scopes: { "hr:attendance:view": "all", "settings:view": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { hr: true },
};

class RouteErrorBoundaryProbe extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p>route error boundary</p>;
    return this.props.children;
  }
}

function clientWithPolicy(): QueryClient {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  return client;
}

/** The provider exactly as it stood before this ticket: no `throwOnError` at all. */
function clientWithoutPolicy(): QueryClient {
  const client = clientWithPolicy();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, throwOnError: undefined },
  });
  return client;
}

function renderUnderBoundary(ui: ReactNode, client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <RouteErrorBoundaryProbe>{ui}</RouteErrorBoundaryProbe>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockRejectedValue(new ApiError("Internal server error", 500));
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("a 500 on /hr/overtime/comp-off", () => {
  it("renders the screen's own inline error, not a fabricated 0.0", async () => {
    renderUnderBoundary(<CompOffPageClient />, clientWithoutPolicy());

    expect(
      await screen.findByText("Couldn't load comp-off balance"),
    ).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
    expect(screen.queryByText("days earned")).not.toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("reaches the error boundary instead", async () => {
    renderUnderBoundary(<CompOffPageClient />, clientWithPolicy());

    expect(await screen.findByText("route error boundary")).toBeInTheDocument();
    expect(screen.queryByText("days earned")).not.toBeInTheDocument();
  });
});

describe("a 500 on /users/stats", () => {
  it("was rendered as five confident zeroes", async () => {
    renderUnderBoundary(<UserStatsCards />, clientWithoutPolicy());

    /**
     * The label renders while the read is still in flight, so waiting on it
     * asserts against a skeleton. Wait for the settled zeroes themselves.
     */
    await waitFor(() =>
      expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(5),
    );
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("reaches the error boundary instead", async () => {
    renderUnderBoundary(<UserStatsCards />, clientWithPolicy());

    expect(await screen.findByText("route error boundary")).toBeInTheDocument();
    expect(screen.queryByText("Total Users")).not.toBeInTheDocument();
  });
});

describe("peripheral entitlements failure does not take the route down", () => {
  function PageWithPeripheralEntitlements() {
    const { data: entitlements, isError } = useEntitlements();
    return (
      <p data-testid="route-content">
        {isError ? "entitlements absent" : entitlements ? "entitlements loaded" : "loading"}
      </p>
    );
  }

  it("a network error on entitlements leaves the route rendered", async () => {
    mockedGet.mockRejectedValue(
      new ApiError("Network error contacting localhost:1500", undefined, "NETWORK_ERROR"),
    );

    renderUnderBoundary(<PageWithPeripheralEntitlements />, clientWithPolicy());

    expect(await screen.findByTestId("route-content")).toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("a primary read failing still reaches the boundary when entitlements is also peripheral", async () => {
    mockedGet.mockRejectedValue(
      new ApiError("Network error contacting localhost:1500", undefined, "NETWORK_ERROR"),
    );

    function PageWithBoth() {
      const { data: entitlements } = useEntitlements();
      void entitlements;
      return <CompOffPageClient />;
    }

    renderUnderBoundary(<PageWithBoth />, clientWithPolicy());

    expect(await screen.findByText("route error boundary")).toBeInTheDocument();
  });
});

describe("a screen that already loaded", () => {
  it("survives a failed background refresh rather than being replaced by an error", async () => {
    const client = clientWithPolicy();
    client.setQueryData(queryKeys.hr.compOff(), [
      { orgId: ORG_ID, userId: USER_ID, earnedDays: "3.5" },
    ]);

    renderUnderBoundary(<CompOffPageClient />, client);

    expect(await screen.findByText("3.5")).toBeInTheDocument();

    await client.refetchQueries({ queryKey: queryKeys.hr.compOff() });

    await waitFor(() => expect(screen.getByText("3.5")).toBeInTheDocument());
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });
});
