"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseWorkforceCostSummary = jest.fn();
const mockUseCostByDepartment = jest.fn();
const mockUseCostByLocation = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:analytics:read": "all" }, modules: {} },
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

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => false,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/hr/enterprise-comp", () => ({
  useWorkforceCostSummary: () => mockUseWorkforceCostSummary(),
  useCostByDepartment: () => mockUseCostByDepartment(),
  useCostByLocation: () => mockUseCostByLocation(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children?: ReactNode; title?: string }) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label }: { label: string }) => <div data-testid="stat-card">{label}</div>,
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-card-skeleton" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { WorkforceCostPage } from "./workforce-cost-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseWorkforceCostSummary.mockReturnValue(emptyQuery());
  mockUseCostByDepartment.mockReturnValue(emptyQuery());
  mockUseCostByLocation.mockReturnValue(emptyQuery());
});

describe("WorkforceCostPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);

    render(<WorkforceCostPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once hr:analytics:read has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<WorkforceCostPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the workforce costing page normally when access is granted", () => {
    render(<WorkforceCostPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /workforce costing/i })).toBeInTheDocument();
  });
});
