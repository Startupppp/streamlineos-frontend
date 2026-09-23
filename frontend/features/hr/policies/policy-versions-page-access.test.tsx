"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseEntityVersions = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:policies:view": "all" }, modules: {} },
  isLoading: false,
};

const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function emptyQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
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

jest.mock("@/hooks/api/hr/settings-hub", () => ({
  useEntityVersions: () => mockUseEntityVersions(),
}));

jest.mock("@/hooks/api/hr/policies", () => ({
  useActivatePolicy: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children?: ReactNode; title?: string }) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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

import { PolicyVersionsPage } from "./policy-versions-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCan.mockReturnValue(false);
  mockUseEntityVersions.mockReturnValue(emptyQuery());
});

describe("PolicyVersionsPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);

    render(<PolicyVersionsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once hr:policies:view has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<PolicyVersionsPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the version history page normally when access is granted", () => {
    render(<PolicyVersionsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /version history/i })).toBeInTheDocument();
  });
});
