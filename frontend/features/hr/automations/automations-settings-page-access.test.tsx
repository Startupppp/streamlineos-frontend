"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseHrAutomations = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:automations:view": "all" }, modules: {} },
  isLoading: false,
};

const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

const fakeRule = {
  id: 1,
  orgId: "org1",
  name: "Onboarding welcome",
  description: null,
  triggerEvent: "employee.created",
  conditions: [],
  actions: [],
  isEnabled: true,
  runCount: 0,
  lastRunAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

function loadedQuery() {
  return {
    data: [fakeRule],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function emptyQuery() {
  return {
    data: [],
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

jest.mock("@/hooks/api/hr/hr-automations", () => ({
  useHrAutomations: () => mockUseHrAutomations(),
  useHrAutomationEvents: () => ({ data: undefined }),
  useToggleHrAutomation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteHrAutomation: () => ({ mutate: jest.fn(), isPending: false }),
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

jest.mock("@/features/hr/automations/automation-rule-card", () => ({
  AutomationRuleCard: ({ rule }: { rule: { name: string } }) => (
    <div data-testid="automation-rule-card">{rule.name}</div>
  ),
}));

jest.mock("@/features/hr/automations/automation-upsert-sheet", () => ({
  AutomationUpsertSheet: () => null,
}));

jest.mock("@/features/hr/automations/automation-runs-sheet", () => ({
  AutomationRunsSheet: () => null,
}));

jest.mock("@/features/hr/automations/automation-test-dialog", () => ({
  AutomationTestDialog: () => null,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => <input aria-label="search" />,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void; icon?: unknown; size?: string; iconSize?: number }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { AutomationsSettingsPage } from "./automations-settings-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCan.mockReturnValue(false);
  mockUseHrAutomations.mockReturnValue(loadedQuery());
});

describe("AutomationsSettingsPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);
    mockUseHrAutomations.mockReturnValue(emptyQuery());

    render(<AutomationsSettingsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once hr:automations:view has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);
    mockUseHrAutomations.mockReturnValue(emptyQuery());

    render(<AutomationsSettingsPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the automations page normally when access is granted", () => {
    mockUseHrAutomations.mockReturnValue(emptyQuery());

    render(<AutomationsSettingsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /hr automations/i })).toBeInTheDocument();
  });

  it("hides the Create automation button when hr:automations:manage is not granted", () => {
    render(<AutomationsSettingsPage />);

    expect(screen.queryByText(/create automation/i)).toBeNull();
  });

  it("shows the Create automation button only when hr:automations:manage is granted", () => {
    mockUseCan.mockImplementation((key: string) => key === "hr:automations:manage");

    render(<AutomationsSettingsPage />);

    expect(screen.getByText(/create automation/i)).toBeInTheDocument();
  });
});
