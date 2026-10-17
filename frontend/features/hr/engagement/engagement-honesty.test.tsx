import { Component, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { HrEngagementPage } from "./engagement-page";

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const ACCESS: AccessResponse = {
  scopes: {
    "hr:engagement:view": "all",
    "hr:engagement:manage": "all",
    "settings:view": "all",
  },
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

function client(): QueryClient {
  const queryClient = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  queryClient.setQueryData(queryKeys.access.me(), ACCESS);
  return queryClient;
}

function renderUnderBoundary(ui: ReactNode) {
  return render(
    <QueryClientProvider client={client()}>
      <TooltipProvider>
        <RouteErrorBoundaryProbe>{ui}</RouteErrorBoundaryProbe>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

const DEFAULTS: Record<string, unknown> = {
  "/hr/engagement/overview": {
    topLeaderboard: [{ userId: USER_ID, total: 12 }],
    employeeOfMonth: { period: "2026-10", top: null },
  },
  "/hr/engagement/mood/aggregate": {
    points: [],
    minResponses: 3,
    suppressedDays: 0,
  },
  "/hr/engagement/mood/history": [],
  "/hr/engagement/badges": [],
  "/hr/engagement/points/leaderboard": [],
  "/hr/recognition": [],
  "/organization/members": { data: [], pagination: { total: 0 } },
  "/me/org-display": { currency: "INR", locale: "en-IN" },
};

function respondPerPath(overrides: Record<string, unknown> = {}) {
  const routes = { ...DEFAULTS, ...overrides };
  mockedGet.mockImplementation((path: string) => {
    const value = routes[path.split("?")[0] ?? path];
    if (value instanceof Error) return Promise.reject(value);
    return Promise.resolve(value ?? {});
  });
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

function statCardText(label: string): string {
  const card = screen.getByText(label).closest("div.flex-1");
  return card?.textContent ?? "";
}

describe("HRMS-B3-006 the engagement overview never reports a count its read did not return", () => {
  it("renders the overview on a healthy session, so the failure cases below are not passing on a page that never mounts", async () => {
    respondPerPath();

    renderUnderBoundary(<HrEngagementPage />);

    expect(await screen.findByText("Recognitions")).toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("marks the Recognitions stat unmeasured and shows no 0 when the recognitions read 500s", async () => {
    respondPerPath({
      "/hr/recognition": new ApiError("Internal server error", 500),
    });

    renderUnderBoundary(<HrEngagementPage />);

    await screen.findByText("Recognitions");
    await screen.findByText("Couldn't load");
    const card = statCardText("Recognitions");

    expect(card).toContain("—");
    expect(card).not.toContain("0");
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("reports 0 recognitions only when the read genuinely returned none", async () => {
    respondPerPath({ "/hr/recognition": [] });

    renderUnderBoundary(<HrEngagementPage />);

    await screen.findByText("All time");

    expect(statCardText("Recognitions")).toContain("0");
  });

  it("says the mood trend failed rather than that nobody has checked in", async () => {
    respondPerPath({
      "/hr/engagement/mood/aggregate": new ApiError("Internal server error", 500),
    });

    renderUnderBoundary(<HrEngagementPage />);

    expect(
      await screen.findByText(/couldn't load the mood trend/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no mood check-ins yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("still says nobody has checked in when the aggregate genuinely holds no points", async () => {
    respondPerPath();

    renderUnderBoundary(<HrEngagementPage />);

    expect(await screen.findByText(/no mood check-ins yet/i)).toBeInTheDocument();
  });
});

describe("HRMS-B3-005 the kudos feed never reports an empty feed for a failed read", () => {
  it("renders an alert with retry instead of No kudos yet when the recognitions read 500s", async () => {
    respondPerPath({
      "/hr/recognition": new ApiError("Internal server error", 500),
    });

    renderUnderBoundary(<HrEngagementPage />);
    await userEvent.click(await screen.findByRole("button", { name: /recognition/i }));

    expect(
      await screen.findByText(/couldn't load recognitions/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no kudos yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("still shows the honest empty feed, with its CTA, when the read genuinely returns none", async () => {
    respondPerPath();

    renderUnderBoundary(<HrEngagementPage />);
    await userEvent.click(await screen.findByRole("button", { name: /recognition/i }));

    expect(await screen.findByText(/no kudos yet/i)).toBeInTheDocument();
  });
});
