import React from "react";
import { render, screen, act } from "@testing-library/react";
import { EpicsPage } from "./epics-page";

jest.mock("@/hooks/api/build", () => ({
  useProject: jest.fn(),
  useProjectBoardTickets: jest.fn(),
  useUpdateTicket: jest.fn(),
  useDeleteTicket: jest.fn(),
  useCreateTicket: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/features/build/shared/module-disabled-state", () => ({
  ModuleDisabledState: () => <div data-testid="module-disabled" />,
}));

jest.mock("@/features/build/shared/completed-status", () => ({
  getCompletedStatusNames: () => new Set<string>(),
}));

jest.mock("@/features/build/epics/create-epic-dialog", () => ({
  CreateEpicDialog: () => <div data-testid="create-epic-dialog" />,
}));

jest.mock("@/features/build/epics/epic-card", () => ({
  EpicCard: () => <div data-testid="epic-card" />,
}));

jest.mock("@/features/build/epics/epic-story-row", () => ({
  EpicStoryRow: () => <div data-testid="epic-story-row" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
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
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => <div data-testid="stat-card" />,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StatCardGridSkeleton: () => <div data-testid="stat-card-grid-skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_FILL_PANEL: "",
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import {
  useProject,
  useProjectBoardTickets,
  useUpdateTicket,
  useDeleteTicket,
  useCreateTicket,
} from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProject = useProject as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseUpdateTicket = useUpdateTicket as jest.Mock;
const mockUseDeleteTicket = useDeleteTicket as jest.Mock;
const mockUseCreateTicket = useCreateTicket as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all", "build:tickets:view": "all", "build:tickets:create": "all" }, modules: { BUILD: true } },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: { BUILD: true } },
  isLoading: false,
};

function disabledQueryResult() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  };
}

function makeMutationResult() {
  return { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue({
    data: { id: 1, key: "TEST", statuses: [], settings: { modules: {} } },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseProjectBoardTickets.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseUpdateTicket.mockReturnValue(makeMutationResult());
  mockUseDeleteTicket.mockReturnValue(makeMutationResult());
  mockUseCreateTicket.mockReturnValue(makeMutationResult());
});

const params = Promise.resolve({ projectId: "1" });

it("shows skeleton not empty state while access snapshot is still in flight because queries are disabled until snapshot lands", async () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("shows NoPermissionState not empty state when build:view is denied", async () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});
