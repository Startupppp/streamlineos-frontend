import { Component, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  QueryClientProvider,
  useQueryErrorResetBoundary,
  type QueryClient,
} from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { useCalendarEvents } from "@/hooks/api/calendar";
import CalendarError from "./error";

/**
 * A 500 on `GET /calendar/events` reaches this route's boundary by the
 * `query-error-policy` default, so "Try Again" is the reader's only way back.
 *
 * The trap it has to clear is TanStack's, not React's. `throwOnError` is set
 * for every read on the provider, and `ensurePreventErrorBoundaryRetry` answers
 * that by setting `retryOnMount: false` on each read for as long as the query
 * error-reset boundary reports "not reset". A React `reset()` therefore re-runs
 * the subtree, finds the cached `error` state, declines to refetch and re-throws
 * — the same screen, no request. The second describe below measures exactly
 * that: one arm resets only React, the other also resets the query boundary.
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
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const ACCESS: AccessResponse = {
  scopes: { "calendar:read": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
};

const RANGE_START = new Date("2026-09-01T00:00:00.000Z");
const RANGE_END = new Date("2026-09-30T00:00:00.000Z");

function CalendarEventsProbe() {
  const { data } = useCalendarEvents(RANGE_START, RANGE_END);
  return <p>events loaded: {data?.events.length ?? 0}</p>;
}

/**
 * Mirrors Next's `ErrorBoundaryHandler`: `reset` is a plain
 * `setState({ error: null })` (node_modules/next/dist/client/components/
 * error-boundary.js), with no router refresh and no cache involvement.
 */
class RouteSegmentBoundary extends Component<
  { children: ReactNode; fallback: (reset: () => void) => ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  handleReset = () => this.setState({ failed: false });

  render() {
    if (this.state.failed) return this.props.fallback(this.handleReset);
    return this.props.children;
  }
}

function clientWithAccess(): QueryClient {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  return client;
}

function eventsRequestCount(): number {
  return mockedGet.mock.calls.filter((call) => call[0] === "/calendar/events")
    .length;
}

function clickTryAgain() {
  fireEvent.click(screen.getByRole("button", { name: /try again/i }));
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockImplementation((path: string) => {
    if (path === "/me/access") return Promise.resolve(ACCESS);
    return Promise.reject(new ApiError("Internal server error", 500));
  });
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("the /calendar route error boundary", () => {
  function renderRoute(client: QueryClient) {
    return render(
      <QueryClientProvider client={client}>
        <RouteSegmentBoundary
          fallback={(reset) => (
            <CalendarError
              error={new Error("Internal server error")}
              reset={reset}
            />
          )}
        >
          <CalendarEventsProbe />
        </RouteSegmentBoundary>
      </QueryClientProvider>,
    );
  }

  it("re-issues GET /calendar/events when the reader clicks Try Again", async () => {
    renderRoute(clientWithAccess());

    expect(await screen.findByText("Calendar error")).toBeInTheDocument();
    await waitFor(() => expect(eventsRequestCount()).toBe(1));

    mockedGet.mockImplementation((path: string) => {
      if (path === "/me/access") return Promise.resolve(ACCESS);
      return Promise.resolve({ events: [], failures: [], truncated: false });
    });

    clickTryAgain();

    await waitFor(() => expect(eventsRequestCount()).toBe(2));
    expect(await screen.findByText(/events loaded/)).toBeInTheDocument();
  });

  it("keeps re-issuing while the endpoint keeps failing", async () => {
    renderRoute(clientWithAccess());

    expect(await screen.findByText("Calendar error")).toBeInTheDocument();
    await waitFor(() => expect(eventsRequestCount()).toBe(1));

    clickTryAgain();
    await waitFor(() => expect(eventsRequestCount()).toBe(2));

    expect(await screen.findByText("Calendar error")).toBeInTheDocument();
    clickTryAgain();
    await waitFor(() => expect(eventsRequestCount()).toBe(3));
  });
});

describe("resetting React alone does not re-drive a failed read", () => {
  function PlainFallback({
    reset,
    alsoResetQueryBoundary,
  }: {
    reset: () => void;
    alsoResetQueryBoundary: boolean;
  }) {
    const queryErrors = useQueryErrorResetBoundary();
    const handleClick = () => {
      if (alsoResetQueryBoundary) queryErrors.reset();
      reset();
    };
    return (
      <button type="button" onClick={handleClick}>
        Try Again
      </button>
    );
  }

  async function measure(alsoResetQueryBoundary: boolean): Promise<number> {
    render(
      <QueryClientProvider client={clientWithAccess()}>
        <RouteSegmentBoundary
          fallback={(reset) => (
            <PlainFallback
              reset={reset}
              alsoResetQueryBoundary={alsoResetQueryBoundary}
            />
          )}
        >
          <CalendarEventsProbe />
        </RouteSegmentBoundary>
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: /try again/i });
    await waitFor(() => expect(eventsRequestCount()).toBe(1));

    clickTryAgain();
    await new Promise((resolve) => setTimeout(resolve, 150));
    return eventsRequestCount();
  }

  it("issues no request at all without the query error-reset", async () => {
    expect(await measure(false)).toBe(1);
  });

  it("issues the request once the query error-reset is cleared", async () => {
    expect(await measure(true)).toBe(2);
  });
});
