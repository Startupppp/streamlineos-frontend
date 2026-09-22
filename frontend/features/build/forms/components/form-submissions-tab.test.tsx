import React from "react";
import { render, screen } from "@testing-library/react";
import { FormSubmissionsTab } from "./form-submissions-tab";

jest.mock("@/hooks/api/build", () => ({
  useFormSubmissions: jest.fn(),
  useUpdateSubmission: jest.fn(),
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

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
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

jest.mock("@/components/ui/dialog", () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useFormSubmissions, useUpdateSubmission } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseFormSubmissions = useFormSubmissions as jest.Mock;
const mockUseUpdateSubmission = useUpdateSubmission as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:forms:view": "all", "build:forms:manage": "all" }, modules: {} },
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
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseFormSubmissions.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseUpdateSubmission.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("shows a loading skeleton while the access snapshot is in flight, not an error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseFormSubmissions.mockReturnValue(baseQueryResult());
  render(<FormSubmissionsTab projectId={1} formId={1} />);
  expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});
