import { Component, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { authenticatedScope } from "@/lib/query-scope";
import { ProjectsPage } from "./projects-page";

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/projects",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: ORG_ID, user: { id: USER_ID } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "granted",
  useModuleEnabled: () => true,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("./new-project-dialog", () => ({
  NewProjectDialog: () => null,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

class CatchingBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p>route boundary reached</p>;
    return this.props.children;
  }
}

function clientForTest(): QueryClient {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  return client;
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

it("keeps the project list fetch error off the route boundary so an org with no projects sees the page error state instead of the route error.tsx", async () => {
  render(
    <QueryClientProvider client={clientForTest()}>
      <CatchingBoundary>
        <ProjectsPage />
      </CatchingBoundary>
    </QueryClientProvider>,
  );

  await waitFor(() =>
    expect(screen.getByText("Something went wrong")).toBeInTheDocument(),
  );
  expect(screen.queryByText("route boundary reached")).not.toBeInTheDocument();
});
