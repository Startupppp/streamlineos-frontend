import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectMilestonesPage } from "./project-milestones-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/milestones",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/hooks/api/build", () => ({
  useProjectMilestones: jest.fn(),
  useDeleteMilestone: jest.fn(),
  useUpdateMilestone: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    ul: ({ children, ...rest }: React.HTMLAttributes<HTMLUListElement>) => <ul {...rest}>{children}</ul>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, actions }: { children: React.ReactNode; title?: string; actions?: React.ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid={`stat-${label.toLowerCase()}`}>{value}</div>
  ),
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-grid-skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "pm-fill-panel",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock("./milestone-upsert-sheet", () => ({
  MilestoneUpsertSheet: () => <div data-testid="milestone-upsert-sheet" />,
}));

jest.mock("./milestone-card", () => ({
  MilestoneCard: ({ milestone, onSelect }: { milestone: { id: number; name: string }; onSelect?: (m: { id: number; name: string }, checked: boolean) => void }) => (
    <div data-testid="milestone-card" onClick={() => onSelect?.(milestone, true)}>{milestone.name}</div>
  ),
}));

import { useProjectMilestones, useDeleteMilestone, useUpdateMilestone } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProjectMilestones = useProjectMilestones as jest.Mock;
const mockUseDeleteMilestone = useDeleteMilestone as jest.Mock;
const mockUseUpdateMilestone = useUpdateMilestone as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

function cursorPage<T>(items: T[]) {
  return { data: items, pagination: { limit: 20, hasMore: false, nextCursor: null } };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectMilestones.mockReturnValue(baseQueryResult({ data: cursorPage([]) }));
  mockUseDeleteMilestone.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateMilestone.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("renders NoPermissionState when build:view is denied instead of empty milestone list", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProjectMilestones.mockReturnValue(baseQueryResult());
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders milestone cards when data is populated", () => {
  const milestone = {
    id: 1,
    projectId: 1,
    orgId: "org-1",
    name: "Beta Launch",
    targetDate: "2026-12-01",
    status: "PENDING",
    description: null,
    createdBy: null,
    clientVisible: false,
    deletedAt: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  mockUseProjectMilestones.mockReturnValue(
    baseQueryResult({ data: cursorPage([milestone]) }),
  );
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByTestId("milestone-card")).toHaveTextContent("Beta Launch");
});

it("hides New Milestone button and delete actions when build:manage is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.queryByRole("button", { name: /new milestone/i })).not.toBeInTheDocument();
});

it("shows New Milestone button when build:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByRole("button", { name: /new milestone/i })).toBeInTheDocument();
});

it("keyboard c shortcut opens create sheet when build:manage granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ProjectMilestonesPage projectId="1" />);
  fireEvent.keyDown(document, { key: "c" });
  expect(screen.getByTestId("milestone-upsert-sheet")).toBeInTheDocument();
});

const milestoneRow = {
  id: 1,
  projectId: 1,
  orgId: "org-1",
  name: "Beta Launch",
  targetDate: "2026-12-01",
  status: "PENDING" as const,
  description: null,
  createdBy: null,
  clientVisible: false,
  deletedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

it("shows bulk action bar with count after milestone is selected", () => {
  mockUseProjectMilestones.mockReturnValue(
    baseQueryResult({ data: cursorPage([milestoneRow]) }),
  );
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId("milestone-card"));
  expect(screen.getByText("1 selected")).toBeInTheDocument();
});

it("hides bulk action bar after clear button is clicked", () => {
  mockUseProjectMilestones.mockReturnValue(
    baseQueryResult({ data: cursorPage([milestoneRow]) }),
  );
  render(<ProjectMilestonesPage projectId="1" />);
  fireEvent.click(screen.getByTestId("milestone-card"));
  fireEvent.click(screen.getByLabelText("Clear selection"));
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
});
