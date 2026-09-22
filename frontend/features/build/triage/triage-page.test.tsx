import React from "react";
import { render, screen } from "@testing-library/react";
import { TriagePage } from "./triage-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api", () => ({
  useProject: jest.fn(),
  useTickets: jest.fn(),
  useUpdateTicket: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
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

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-item" className={className} />
  ),
}));

jest.mock("./triage-row", () => ({
  TriageRow: () => <div data-testid="triage-row" />,
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: jest.fn(() => "/build/1/tickets/1"),
}));

import { useProject, useTickets, useUpdateTicket } from "@/hooks/api";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProject = useProject as jest.Mock;
const mockUseTickets = useTickets as jest.Mock;
const mockUseUpdateTicket = useUpdateTicket as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseTicketsResult(overrides = {}) {
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
  mockUseProject.mockReturnValue({ data: { key: "PROJ" } });
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [], pagination: { hasMore: false } } }),
  );
  mockUseUpdateTicket.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("shows a skeleton while the access snapshot is in flight, not an empty or denied state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseTickets.mockReturnValue(baseTicketsResult());
  render(<TriagePage projectId={1} />);
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/nothing to triage/i)).not.toBeInTheDocument();
});

it("shows the plan denial view with upgrade link when tickets query returns 402 MODULE_NOT_ENABLED, not a generic error", () => {
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseTickets.mockReturnValue(
    baseTicketsResult({
      isError: true,
      error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
    }),
  );
  render(<TriagePage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("shows the denial view, not an empty submissions list, when the user lacks build:tickets:view", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseTickets.mockReturnValue(baseTicketsResult());
  render(<TriagePage projectId={1} />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByText(/nothing to triage/i)).not.toBeInTheDocument();
});
