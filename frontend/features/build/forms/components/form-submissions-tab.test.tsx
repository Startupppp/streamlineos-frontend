import React from "react";
import { render, screen } from "@testing-library/react";
import { FormSubmissionsTab } from "./form-submissions-tab";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build/forms", () => ({
  useFormSubmissions: jest.fn(),
  useUpdateSubmission: jest.fn(),
  useCreateForm: jest.fn(),
  useForms: jest.fn(),
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

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/forms/1",
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table" data-rows={data.length} />
  ),
  DataTableSkeleton: () => <div data-testid="table-skeleton" />,
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

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => <div data-testid="no-permission" />,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/features/build/shared/build-mobile-card", () => ({
  BuildMobileCard: () => null,
}));

import { useFormSubmissions, useUpdateSubmission } from "@/hooks/api/build/forms";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseFormSubmissions = useFormSubmissions as jest.Mock;
const mockUseUpdateSubmission = useUpdateSubmission as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:forms:manage": "all" }, modules: {} },
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

function submissionPages(rows: unknown[]) {
  return { pages: [{ data: rows, pagination: { limit: 25, hasMore: false, nextCursor: null } }] };
}

const submissionRow = {
  id: 1,
  formId: 1,
  submittedByName: "Alice",
  status: "submitted" as const,
  convertedTicketId: null,
  values: { name: "Alice" },
  createdAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseFormSubmissions.mockReturnValue(baseQueryResult({ data: submissionPages([]) }));
  mockUseUpdateSubmission.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("shows a loading skeleton while the access snapshot is in flight, not an error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseFormSubmissions.mockReturnValue(baseQueryResult());
  render(<FormSubmissionsTab projectId={1} formId={1} />);
  expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows NoPermissionState when build:forms:manage is denied and not the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseFormSubmissions.mockReturnValue(baseQueryResult());
  render(<FormSubmissionsTab projectId={1} formId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and not the skeleton", () => {
  mockUseFormSubmissions.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network error") }),
  );
  render(<FormSubmissionsTab projectId={1} formId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path from the backend rather than a generic error state (FE-41)", () => {
  mockUseFormSubmissions.mockReturnValue(
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
  render(<FormSubmissionsTab projectId={1} formId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when submissions are present and not the empty state", () => {
  mockUseFormSubmissions.mockReturnValue(
    baseQueryResult({ data: submissionPages([submissionRow]) }),
  );
  render(<FormSubmissionsTab projectId={1} formId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows 'No submissions yet' empty state when there are no submissions", () => {
  render(<FormSubmissionsTab projectId={1} formId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No submissions yet");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});
