"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseHrTemplates = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:templates:view": "all" }, modules: {} },
  isLoading: false,
};

const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function emptyQuery() {
  return {
    data: { data: [], pagination: { hasMore: false, nextCursor: undefined } },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  };
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/hr/hr-templates", () => ({
  useHrTemplates: () => mockUseHrTemplates(),
  useSeedHrTemplateDefaults: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, actions }: { children?: ReactNode; title?: string; actions?: ReactNode }) => (
    <div>
      {title && <h1>{title}</h1>}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
}));

jest.mock("@/components/ui/cursor-page-controls", () => ({
  CursorPageControls: () => null,
}));

jest.mock("@/features/hr/templates/template-upsert-sheet", () => ({
  TemplateUpsertSheet: () => null,
}));

jest.mock("@/features/hr/templates/template-lifecycle-actions", () => ({
  TemplateLifecycleActions: () => null,
}));

jest.mock("@/features/hr/templates/template-preview-dialog", () => ({
  TemplatePreviewDialog: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => <input aria-label="search" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

import { TemplatesSettingsPage } from "./templates-settings-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCan.mockReturnValue(false);
  mockUseHrTemplates.mockReturnValue(emptyQuery());
});

describe("TemplatesSettingsPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);

    render(<TemplatesSettingsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once hr:templates:view has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<TemplatesSettingsPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the templates page normally when access is granted", () => {
    render(<TemplatesSettingsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /hr templates/i })).toBeInTheDocument();
  });

  it("hides the Create template button when hr:templates:manage is not granted", () => {
    render(<TemplatesSettingsPage />);

    expect(screen.queryByText(/create template/i)).toBeNull();
  });

  it("shows the Create template button when hr:templates:manage is granted", () => {
    mockUseCan.mockImplementation((key: string) => key === "hr:templates:manage");

    render(<TemplatesSettingsPage />);

    expect(screen.getByText(/create template/i)).toBeInTheDocument();
  });
});
