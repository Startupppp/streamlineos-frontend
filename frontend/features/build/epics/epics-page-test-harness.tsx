import React from "react";

jest.mock("@/hooks/api/build/projects", () => ({ useProject: jest.fn(), useProjectLabels: jest.fn(() => ({ data: [] })) }));
jest.mock("@/hooks/api/build/ticket-queries", () => ({ useProjectBoardTickets: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-update-mutation", () => ({ useUpdateTicket: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-create-rank-mutations", () => ({
  useDeleteTicket: jest.fn(),
  useCreateTicket: jest.fn(),
}));

jest.mock("@/hooks/api/build/ticket-bulk-update-mutation", () => ({
  useBulkUpdateTickets: jest.fn(),
}));

jest.mock("@/hooks/api/build/ticket-import-export", () => ({
  useExportTickets: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/build/cycles", () => ({
  useCycles: jest.fn(),
}));
jest.mock("@/hooks/api/build/epics", () => ({
  useEpicPage: jest.fn(),
}));
jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: jest.fn(),
  BUILD_FILTER_ALL: "all",
}));

let capturedToolbarFilters: { id: string }[] | undefined;

export function readCapturedToolbarFilters() {
  return capturedToolbarFilters;
}

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({ filters }: { filters?: { id: string }[] }) => {
    capturedToolbarFilters = filters;
    return <div data-testid="build-list-toolbar" />;
  },
}));

jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: ({ selectedCount }: { selectedCount: number }) => (
    <div data-testid="bulk-action-bar">{selectedCount}</div>
  ),
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

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/features/build/epics/epic-card", () => ({
  EpicCard: ({
    dependencyCount,
    onLinkStory,
  }: {
    dependencyCount?: number;
    onLinkStory: (storyId: number, epicId: number) => void;
  }) => (
    <div data-testid="epic-card" data-dependency-count={dependencyCount ?? ""}>
      <button type="button" data-testid="link-story-btn" onClick={() => onLinkStory(31, 11)}>
        Link story
      </button>
    </div>
  ),
}));

jest.mock("@/features/build/epics/epic-story-row", () => ({
  EpicStoryRow: () => <div data-testid="epic-story-row" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, filters }: { children: React.ReactNode; title?: string; filters?: React.ReactNode }) => (
    <div>{title ? <h1>{title}</h1> : null}{filters}{children}</div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({
    description,
    error,
    onRetry,
  }: {
    description?: string;
    error?: unknown;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-state">
      {description}
      <span data-testid="error-reference">
        {jest.requireActual("@/lib/api-envelope").getCorrelationId(error) ?? ""}
      </span>
      <button type="button" data-testid="error-retry" onClick={onRetry}>
        Try again
      </button>
    </div>
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
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
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

import { useProject, useProjectBoardTickets, useUpdateTicket, useDeleteTicket, useCreateTicket, useBulkUpdateTickets, useCycles } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useEpicPage } from "@/hooks/api/build/epics";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

export const mockUseProject = jest.mocked(useProject);
export const mockUseProjectBoardTickets = jest.mocked(useProjectBoardTickets);
export const mockUseUpdateTicket = jest.mocked(useUpdateTicket);
export const mockUseDeleteTicket = jest.mocked(useDeleteTicket);
export const mockUseCreateTicket = jest.mocked(useCreateTicket);
export const mockUseBulkUpdateTickets = jest.mocked(useBulkUpdateTickets);
export const mockUseCycles = jest.mocked(useCycles);
export const mockUseCan = jest.mocked(useCan);
export const mockUseAccess = jest.mocked(useAccess);
export const mockUseBuildListKeyboard = jest.mocked(useBuildListKeyboard);
export const mockUseBuildListFilters = jest.mocked(useBuildListFilters);
export const mockUseEpicPage = jest.mocked(useEpicPage);
export const mockUseOnlineStatus = jest.mocked(useOnlineStatus);

export {
  pendingQuery,
  successfulQuery,
  failedQuery,
  disabledQueryResult,
  ACCESS_LOADING,
  ACCESS_GRANTED,
  ACCESS_DENIED,
  boardQueryResult,
  makeMutationResult,
  type MutationParts,
} from "./epics-query-builders";

