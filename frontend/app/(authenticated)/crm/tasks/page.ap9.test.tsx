"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import CrmTasksPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/tasks",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "plan-required" ||
      resolution.kind === "module-denied"
    )
      return <div role="status">Access Restricted</div>;
    return <div>{resolution.kind}</div>;
  },
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title: string }) => <div data-testid="error-state">{title}</div>,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => null,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/timeline/my-tasks-panel", () => ({
  MyTasksPanel: () => null,
}));

jest.mock("@/features/crm/tasks/task-bucket-section", () => ({
  TaskBucketSection: () => null,
}));

jest.mock("@/features/crm/tasks/create-task-dialog", () => ({
  CreateTaskDialog: () => null,
}));

jest.mock("@/features/crm/tasks/tasks-toolbar", () => ({
  TasksToolbar: () => null,
}));

jest.mock("@/components/renderer/density-toggle", () => ({
  useDensity: () => ["comfortable", jest.fn()],
}));

jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: (layout: unknown) => layout,
}));

jest.mock("@/lib/renderer/crm/task-layout", () => ({
  TASK_LAYOUT: {
    list: { columns: [{ key: "title" }] },
  },
  taskRecordFields: (task: unknown) => task,
}));

jest.mock("@/hooks/api/tasks", () => ({
  useTasks: jest.fn(() => ({
    data: { tasks: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  useCompleteTask: jest.fn(() => ({ mutate: jest.fn() })),
  useDeleteTask: jest.fn(() => ({ mutate: jest.fn() })),
}));

jest.mock("@/hooks/api/calendar", () => ({
  useCalendarMemberLookup: jest.fn(() => ({ data: [] })),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: CrmTasksPage must use crm:tasks:view permission, not directory:people:view", () => {
  it("does not show access-denied state while the access snapshot is still loading", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<CrmTasksPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:tasks:view" });

    render(<CrmTasksPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the tasks page when usePageState resolves to ready", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CrmTasksPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes crm:tasks:view to usePageState — not directory:people:view which has no relation to CRM tasks", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CrmTasksPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:tasks:view" }),
    );
    expect(mockUsePageState).not.toHaveBeenCalledWith(
      expect.objectContaining({ permission: "directory:people:view" }),
    );
  });
});
