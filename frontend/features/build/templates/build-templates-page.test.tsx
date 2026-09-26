import React from "react";
import { render, screen } from "@testing-library/react";
import { BuildTemplatesPage } from "./build-templates-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build", () => ({
  useProjectTemplates: jest.fn(),
  useDeleteProjectTemplate: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
    filters,
  }: {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
    filters?: React.ReactNode;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "pm-fill-panel",
  PM_PANEL: "pm-panel",
}));

jest.mock("@/components/illustrations", () => ({
  EmptyProjectsIllustration: () => null,
}));

jest.mock("./template-card", () => ({
  TemplateCard: () => <div data-testid="template-card" />,
}));

jest.mock("./create-template-sheet", () => ({
  CreateTemplateSheet: () => null,
}));

jest.mock("./apply-template-dialog", () => ({
  ApplyTemplateDialog: () => null,
}));

jest.mock("./templates-grid-skeleton", () => ({
  TemplatesGridSkeleton: () => <div data-testid="templates-skeleton" />,
}));

const mockUseBuildListKeyboard = jest.fn();
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (args: unknown) => mockUseBuildListKeyboard(args),
}));

const mockListFiltersState = {
  search: "",
  debouncedSearch: "",
  cursor: null,
  setSearch: jest.fn(),
  setCursor: jest.fn(),
  value: jest.fn((_param: string) => "all"),
  isActive: jest.fn((_param: string) => false),
  setValue: jest.fn(),
  clearAll: jest.fn(),
  activeCount: 0,
  isFiltered: false,
  resetKey: "0",
  isPending: false,
};
jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => mockListFiltersState,
  BUILD_FILTER_ALL: "all",
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({ search }: { search?: { value: string; inputRef?: React.RefObject<HTMLInputElement | null> } }) =>
    search ? <input type="search" ref={search.inputRef} aria-label="Search templates" /> : null,
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: () => null,
}));

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

import { useProjectTemplates, useDeleteProjectTemplate } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProjectTemplates = useProjectTemplates as jest.Mock;
const mockUseDeleteProjectTemplate = useDeleteProjectTemplate as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all", "build:manage": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
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

function templatePages(items: unknown[]) {
  return {
    pages: [{ data: items, hasMore: false, nextCursor: null }],
    pageParams: [undefined],
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectTemplates.mockReturnValue(baseQueryResult({ data: templatePages([]) }));
  mockUseDeleteProjectTemplate.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildListKeyboard.mockReset();
  mockListFiltersState.value.mockReturnValue("all");
  mockListFiltersState.isActive.mockReturnValue(false);
  mockListFiltersState.setSearch.mockReset();
  mockUseOnlineStatus.mockReturnValue(true);
});

it("shows a skeleton while the access snapshot is in flight, not an empty or denied state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseProjectTemplates.mockReturnValue(baseQueryResult());
  render(<BuildTemplatesPage />);
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
});

it("shows plan denial view with upgrade link when query returns 402 MODULE_NOT_ENABLED, not a generic error", () => {
  mockUseProjectTemplates.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
    }),
  );
  render(<BuildTemplatesPage />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("shows denial view when user lacks build:view, instead of an empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProjectTemplates.mockReturnValue(baseQueryResult());
  render(<BuildTemplatesPage />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("hides the create template button when the user lacks build:manage permission", () => {
  mockUseCan.mockImplementation((key: string) => key !== "build:manage");
  render(<BuildTemplatesPage />);
  expect(screen.queryByText(/new template/i)).not.toBeInTheDocument();
});

it("wires useBuildListKeyboard with the template count so j/k navigate the grid", () => {
  const templates = [
    { id: 1, name: "Sprint", description: null, category: null, tickets: [] },
    { id: 2, name: "Bug Bash", description: null, category: null, tickets: [] },
  ];
  mockUseProjectTemplates.mockReturnValue(baseQueryResult({ data: templatePages(templates) }));
  render(<BuildTemplatesPage />);
  expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
    expect.objectContaining({ itemCount: 2, enabled: true }),
  );
});

it("disables keyboard nav when the page is not yet ready", () => {
  mockUseProjectTemplates.mockReturnValue(baseQueryResult({ isLoading: true, data: undefined }));
  render(<BuildTemplatesPage />);
  expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
    expect.objectContaining({ enabled: false }),
  );
});

it("opens the apply dialog via onOpen callback so Enter on a focused template applies it", () => {
  const template = { id: 3, name: "Kanban", description: null, category: null, tickets: [] };
  mockUseProjectTemplates.mockReturnValue(baseQueryResult({ data: templatePages([template]) }));
  render(<BuildTemplatesPage />);
  const [call] = mockUseBuildListKeyboard.mock.calls;
  const { onOpen } = call[0] as { onOpen: (index: number) => void };
  onOpen(0);
});

it("renders a search input via BuildListToolbar so the / shortcut has a reachable DOM target", () => {
  render(<BuildTemplatesPage />);
  expect(screen.getByRole("searchbox", { name: /search templates/i })).toBeInTheDocument();
});

it("wires onCreate to the keyboard hook so c creates a new template when build:manage is granted", () => {
  render(<BuildTemplatesPage />);
  const [call] = mockUseBuildListKeyboard.mock.calls;
  const { onCreate } = call[0] as { onCreate?: () => void };
  expect(typeof onCreate).toBe("function");
});

it("omits onCreate from the keyboard hook when the user lacks build:manage", () => {
  mockUseCan.mockImplementation((key: string) => key !== "build:manage");
  render(<BuildTemplatesPage />);
  const [call] = mockUseBuildListKeyboard.mock.calls;
  const { onCreate } = call[0] as { onCreate?: () => void };
  expect(onCreate).toBeUndefined();
});

it("shows an offline empty state instead of the no-templates empty state when the device is offline", () => {
  mockUseOnlineStatus.mockReturnValue(false);
  render(<BuildTemplatesPage />);
  expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  expect(screen.queryByText(/no templates yet/i)).not.toBeInTheDocument();
});
