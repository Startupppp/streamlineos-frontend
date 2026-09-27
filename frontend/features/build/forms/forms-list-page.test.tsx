import React from "react";
import { render, screen } from "@testing-library/react";
import { FormsListPage } from "./forms-list-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/1/forms",
}));

jest.mock("@/hooks/api/build/forms", () => ({
  useForms: jest.fn(),
  useCreateForm: jest.fn(),
  useFormSubmissions: jest.fn(),
  useUpdateSubmission: jest.fn(),
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
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table" data-rows={data.length} />
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => <div data-testid="no-permission" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    actions,
  }: {
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {children}
    </div>
  ),
}));

jest.mock("./forms-table-columns", () => ({
  FORMS_TABLE_HEADERS: ["Name", "Type", "Submissions", "Status"],
  buildFormsColumns: jest.fn(() => []),
  FormMobileCard: () => null,
}));

jest.mock("./field-type-meta", () => ({
  FORM_TYPE_LABELS: { intake: "Intake", feedback: "Feedback", survey: "Survey" },
  FORM_TYPES: ["intake", "feedback", "survey"],
}));

import { useForms, useCreateForm } from "@/hooks/api/build/forms";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseForms = useForms as jest.Mock;
const mockUseCreateForm = useCreateForm as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:forms:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQueryResult(overrides: Record<string, unknown> = {}) {
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

function formsPages(rows: unknown[]) {
  return { pages: [{ data: rows }] };
}

function defaultFilters(overrides: Record<string, unknown> = {}) {
  return {
    value: jest.fn(() => "all"),
    isActive: jest.fn(() => false),
    setValue: jest.fn(),
    clearAll: jest.fn(),
    isFiltered: false,
    resetKey: "0",
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    ...overrides,
  };
}

const formRow = {
  id: 1,
  projectId: 1,
  name: "Bug Report Form",
  type: "intake",
  isActive: true,
  fields: [],
  createdAt: "2026-09-01T00:00:00Z",
  submissionCount: 0,
};

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseForms.mockReturnValue(baseQueryResult({ data: formsPages([]) }));
  mockUseCreateForm.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
});

it("shows loading skeleton while access is loading and not error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseForms.mockReturnValue(baseQueryResult());
  render(<FormsListPage projectId={1} />);
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows NoPermissionState when build:forms:view is denied and not the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseForms.mockReturnValue(baseQueryResult());
  render(<FormsListPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and not the skeleton", () => {
  mockUseForms.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network error") }),
  );
  render(<FormsListPage projectId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path from the backend rather than a generic error state (FE-41)", () => {
  mockUseForms.mockReturnValue(
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
  render(<FormsListPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when rows are present and not the empty state", () => {
  mockUseForms.mockReturnValue(
    baseQueryResult({ data: formsPages([formRow]) }),
  );
  render(<FormsListPage projectId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows 'No forms yet' empty state when there are no rows and no active filter", () => {
  render(<FormsListPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No forms yet");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows 'No forms match your filters' when filters are active and no rows match", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  render(<FormsListPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No forms match your filters");
  expect(screen.queryByText("No forms yet")).not.toBeInTheDocument();
});
