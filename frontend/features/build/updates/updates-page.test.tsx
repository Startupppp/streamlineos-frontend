import { render, screen } from "@testing-library/react";
import { UpdatesPage } from "./updates-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build/project-updates", () => ({
  useProjectUpdates: jest.fn(),
  useCreateProjectUpdate: jest.fn(),
  useDeleteProjectUpdate: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));
jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));
jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <button onClick={onRetry}>Retry</button>
  ),
}));
jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));
jest.mock("@/components/shared", () => ({
  EntityFormDialog: ({ children }: { children: unknown }) => null,
}));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));
jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

import { useProjectUpdates, useCreateProjectUpdate, useDeleteProjectUpdate } from "@/hooks/api/build/project-updates";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProjectUpdates = useProjectUpdates as jest.Mock;
const mockUseCreateProjectUpdate = useCreateProjectUpdate as jest.Mock;
const mockUseDeleteProjectUpdate = useDeleteProjectUpdate as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:updates:view": "all", "build:updates:manage": "all" }, modules: {} },
  isLoading: false,
};

const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(overrides = {}) {
  return {
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectUpdates.mockReturnValue(baseQueryResult());
  mockUseCreateProjectUpdate.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteProjectUpdate.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("renders denied state when build:updates:view is not in the access snapshot", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toHaveTextContent("build:updates:view");
});

it("renders empty state when there are no updates", () => {
  mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [] }));
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
});

it("renders error state and retry on query failure", () => {
  mockUseProjectUpdates.mockReturnValue(baseQueryResult({ isError: true }));
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByText("Retry")).toBeInTheDocument();
});

it("renders update cards when data is populated", () => {
  mockUseProjectUpdates.mockReturnValue(
    baseQueryResult({
      data: [
        {
          id: 1,
          orgId: "org-1",
          projectId: 1,
          authorMembershipId: 7,
          body: "Sprint 3 is on track.",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          deletedAt: null,
        },
      ],
    }),
  );
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByText("Sprint 3 is on track.")).toBeInTheDocument();
});

it("hides delete button when canManage is false", () => {
  mockUseCan.mockImplementation((key: string) => key === "build:updates:view");
  mockUseProjectUpdates.mockReturnValue(
    baseQueryResult({
      data: [
        {
          id: 1,
          orgId: "org-1",
          projectId: 1,
          authorMembershipId: 7,
          body: "An update body.",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          deletedAt: null,
        },
      ],
    }),
  );
  render(<UpdatesPage projectId={1} />);
  expect(screen.queryByText("Delete")).not.toBeInTheDocument();
});

it("shows skeleton and not a denial while the access snapshot is still in flight because useCan answers false before access lands", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCan.mockReturnValue(false);
  mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [], isLoading: false }));
  render(<UpdatesPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the plan upgrade link the backend sent with a 402 MODULE_NOT_ENABLED instead of a generic error", () => {
  mockUseProjectUpdates.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<UpdatesPage projectId={1} />);
  expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", "/settings/billing");
});
