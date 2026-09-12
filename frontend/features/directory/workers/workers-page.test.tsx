import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { usePermissionGate } from "@/hooks/api/access";
import { workersListKey } from "@/lib/query-keys/directory-workers-list";
import type { Worker, WorkersPage } from "@/types/directory/workers";
import { WorkersPage as WorkersPageComponent } from "./workers-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/directory/workers",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn((permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("./worker-form-dialog", () => ({
  WorkerFormDialog: () => null,
}));

jest.mock("./worker-engagements-sheet", () => ({
  WorkerEngagementsSheet: () => null,
}));

const alice: Worker = {
  workerId: "worker-1",
  organizationId: "org-1",
  organizationPersonId: "person-1",
  workerNumber: "EMP001",
  status: "ACTIVE",
  isPayee: false,
  deletedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  firstName: "Alice",
  lastName: "Nguyen",
  displayName: "Alice Nguyen",
  workEmail: "alice@example.com",
  avatarUrl: null,
  userId: "user-1",
};

const seededPage: WorkersPage = {
  data: [alice],
  pageInfo: { limit: 20, hasMore: false, nextCursor: null },
};

function makeHydratedState() {
  const seed = new QueryClient();
  seed.setQueryData(workersListKey(), seededPage);
  return dehydrate(seed);
}

function Wrapper({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TooltipProvider>
  );
}

describe("WorkersPage server-prefetch seam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissionGate as jest.Mock).mockImplementation(
      (permission: string) => ({
        permission,
        allowed: true,
        denied: false,
        pending: false,
      }),
    );
  });

  it("renders rows from the hydrated cache and makes no API call", () => {
    const state = makeHydratedState();
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <WorkersPageComponent />
        </HydrationBoundary>
      </Wrapper>,
    );

    expect(screen.getByText("Alice Nguyen")).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("fetches from the API when HydrationBoundary carries no cache", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <WorkersPageComponent />
      </Wrapper>,
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("/directory/workers"),
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("shows a denied state rather than an empty workforce, and sends no request", () => {
    (usePermissionGate as jest.Mock).mockImplementation(
      (permission: string) => ({
        permission,
        allowed: false,
        denied: true,
        pending: false,
      }),
    );
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <WorkersPageComponent />
      </Wrapper>,
    );

    expect(screen.getByText("Workforce unavailable")).toBeInTheDocument();
    expect(screen.getByText("directory:workers:view")).toBeInTheDocument();
    expect(screen.queryByText("No workers yet")).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("shows a skeleton, never a denial, while the access snapshot is pending", () => {
    (usePermissionGate as jest.Mock).mockImplementation(
      (permission: string) => ({
        permission,
        allowed: false,
        denied: false,
        pending: true,
      }),
    );
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <WorkersPageComponent />
      </Wrapper>,
    );

    expect(screen.queryByText("Workforce unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("No workers yet")).not.toBeInTheDocument();
  });
});
