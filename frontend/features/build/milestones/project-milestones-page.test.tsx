import { render, screen } from "@testing-library/react";
import { ProjectMilestonesPage } from "./project-milestones-page";

jest.mock("@/hooks/api/build", () => ({
  useProjectMilestones: jest.fn(),
  useDeleteMilestone: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
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
  PlusIcon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
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
}));

jest.mock("./milestone-upsert-sheet", () => ({
  MilestoneUpsertSheet: () => null,
}));

jest.mock("./milestone-card", () => ({
  MilestoneCard: ({ milestone }: { milestone: { name: string } }) => (
    <div data-testid="milestone-card">{milestone.name}</div>
  ),
}));

import { useProjectMilestones, useDeleteMilestone } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";

const mockUseProjectMilestones = useProjectMilestones as jest.Mock;
const mockUseDeleteMilestone = useDeleteMilestone as jest.Mock;
const mockUseCan = useCan as jest.Mock;

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

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseProjectMilestones.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseDeleteMilestone.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("renders NoPermissionState when build:view is denied instead of empty milestone list", () => {
  mockUseCan.mockReturnValue(false);
  mockUseProjectMilestones.mockReturnValue(baseQueryResult());
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders milestone cards when data is populated", () => {
  mockUseProjectMilestones.mockReturnValue(
    baseQueryResult({
      data: [
        {
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
        },
      ],
    }),
  );
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByTestId("milestone-card")).toHaveTextContent("Beta Launch");
});
