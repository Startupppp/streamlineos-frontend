/**
 * QA-FE-003 — why `/timesheets/team` showed "Failed to load team time data".
 *
 * That copy is the route's own `error.tsx`, not the ErrorState `TeamView`
 * draws. `throwOnError: readErrorReachesBoundary` is set on the provider for
 * every read, so a 500 on either of the page's two reads was thrown to the
 * route boundary and replaced the whole page — taking the page's retry with it,
 * and letting a failure of the billable-percentage satellite destroy a Team
 * page whose own data had loaded fine.
 *
 * Both reads are declared `INLINE_READ_ERROR` now. The probe below is the
 * measurement: a 500 must leave the component mounted and reporting `isError`.
 */
import { Component, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { useTeamWeekSummary } from "./team";
import { useReportsOverview } from "./reports";

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: ORG_ID, user: { id: USER_ID } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const ACCESS: AccessResponse = {
  scopes: { "timesheets:team:view": "all", "timesheets:reports:view": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { timesheets: true },
};

class CatchingBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <p>route boundary reached</p>;
    return this.props.children;
  }
}

function TeamProbe() {
  const { isError } = useTeamWeekSummary([], "2026-09-28", "2026-10-04");
  return <p>team isError: {String(isError)}</p>;
}

function OverviewProbe() {
  const { isError } = useReportsOverview({ startDate: "2026-09-28", endDate: "2026-10-04" });
  return <p>overview isError: {String(isError)}</p>;
}

function clientWithAccess(): QueryClient {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  return client;
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

afterEach(() => consoleError.mockRestore());

function renderProbe(probe: ReactNode) {
  return render(
    <QueryClientProvider client={clientWithAccess()}>
      <CatchingBoundary>{probe}</CatchingBoundary>
    </QueryClientProvider>,
  );
}

it("keeps a failed team week-summary read off the route boundary", async () => {
  renderProbe(<TeamProbe />);

  await waitFor(() => expect(screen.getByText("team isError: true")).toBeInTheDocument());
  expect(screen.queryByText("route boundary reached")).not.toBeInTheDocument();
});

it("keeps a failed reports-overview read off the route boundary", async () => {
  renderProbe(<OverviewProbe />);

  await waitFor(() => expect(screen.getByText("overview isError: true")).toBeInTheDocument());
  expect(screen.queryByText("route boundary reached")).not.toBeInTheDocument();
});
