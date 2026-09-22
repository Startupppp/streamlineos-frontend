"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseHrForms = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:forms:view": "all" }, modules: {} },
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

jest.mock("@/features/hr/forms/hooks/use-hr-forms", () => ({
  useHrForms: () => mockUseHrForms(),
  useCreateHrForm: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

jest.mock("@/features/hr/forms/components/forms-data-table", () => ({
  FormsDataTable: () => <div data-testid="forms-data-table" />,
}));

jest.mock("@/features/hr/forms/components/form-builder", () => ({
  FormBuilder: () => null,
}));

jest.mock("@/components/ui/cursor-page-controls", () => ({
  CursorPageControls: () => null,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

import { HrFormsSettingsPage } from "./hr-forms-settings-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCan.mockReturnValue(false);
  mockUseHrForms.mockReturnValue(emptyQuery());
});

describe("HrFormsSettingsPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);

    render(<HrFormsSettingsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once hr:forms:view has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<HrFormsSettingsPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the HR Forms page normally when access is granted", () => {
    render(<HrFormsSettingsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /hr forms/i })).toBeInTheDocument();
  });

  it("hides the New Form button when hr:forms:manage is not granted", () => {
    render(<HrFormsSettingsPage />);

    expect(screen.queryByText(/new form/i)).toBeNull();
  });

  it("shows the New Form button when hr:forms:manage is granted", () => {
    mockUseCan.mockImplementation((key: string) => key === "hr:forms:manage");

    render(<HrFormsSettingsPage />);

    expect(screen.getByText(/new form/i)).toBeInTheDocument();
  });
});
