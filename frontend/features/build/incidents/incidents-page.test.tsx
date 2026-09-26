import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";

const mockUseIncidents = jest.fn();
const mockUseDeleteIncident = jest.fn();
const mockUseOrgMembers = jest.fn();
const mockUseCan = jest.fn();
const mockUseAccess = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/1/incidents",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/build/incidents", () => ({
  useIncidents: (...args: unknown[]) => mockUseIncidents(...args),
  useDeleteIncident: () => mockUseDeleteIncident(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: (...args: unknown[]) => mockUseOrgMembers(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: (props: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => <div data-testid="stat-card" />,
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

const mockIncidentSheet = jest.fn((_props: { open: boolean }) => null);
jest.mock("./incident-sheet", () => ({
  IncidentSheet: (props: { open: boolean }) => { mockIncidentSheet(props); return null; },
}));

jest.mock("./sla", () => ({
  getSlaState: () => ({ label: "Met", responseBreached: false, resolutionBreached: false }),
}));

import { IncidentsPage } from "./incidents-page";

const mockReplace = jest.fn();
const mockRouterPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockRouterPush, refresh: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockRouterPush.mockClear();
  mockSearchParams = new URLSearchParams();
});


const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:incidents:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQuery(overrides = {}) {
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
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseIncidents.mockReturnValue(baseQuery({ data: [] }));
  mockUseOrgMembers.mockReturnValue(baseQuery({ data: { data: [], total: 0 } }));
  mockUseDeleteIncident.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("renders NoPermissionState when build:incidents:view is denied instead of the no-incidents empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseIncidents.mockReturnValue(baseQuery());
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows loading state while the access snapshot is still in flight rather than a false denial", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseIncidents.mockReturnValue(baseQuery());
  render(<IncidentsPage projectId={1} />);
  expect(screen.queryByText(/access restricted/i)).toBeNull();
  expect(screen.queryByTestId("empty-state")).toBeNull();
});

it("renders the upgrade path the backend sent with a 402 rather than a generic failure", () => {
  const err = new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
    moduleKey: "build",
    reason: "not-in-plan",
    upgradePath: "/settings/billing",
  });
  mockUseIncidents.mockReturnValue(baseQuery({ isError: true, error: err }));
  render(<IncidentsPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("discloses the server's hard 100-row cap instead of presenting a truncated list as complete", () => {
  const hundredIncidents = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    incidentNumber: i + 1,
    title: `Incident ${i + 1}`,
    severity: "low",
    status: "detected",
    ownerId: null,
    detectedAt: null,
  }));
  mockUseIncidents.mockReturnValue(baseQuery({ data: hundredIncidents }));
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByText(/most recent 100 incidents/i)).toBeInTheDocument();
});

it("does not show the cap disclosure when the list is well under the cap", () => {
  mockUseIncidents.mockReturnValue(baseQuery({ data: [{ id: 1, incidentNumber: 1, title: "Incident 1", severity: "low", status: "detected", ownerId: null, detectedAt: null }] }));
  render(<IncidentsPage projectId={1} />);
  expect(screen.queryByText(/most recent 100 incidents/i)).not.toBeInTheDocument();
});

it("pressing j then Enter navigates to the first incident's detail page so keyboard users can open it without a mouse", () => {
  const incident = { id: 55, incidentNumber: 2, title: "API down", severity: "high", status: "investigating", ownerId: null, detectedAt: null };
  mockUseIncidents.mockReturnValue(baseQuery({ data: [incident] }));
  render(<IncidentsPage projectId={1} />);
  fireEvent.keyDown(document, { key: "j" });
  fireEvent.keyDown(document, { key: "Enter" });
  expect(mockRouterPush).toHaveBeenCalledWith("/build/1/incidents/55");
});

it("pressing c opens the create incident sheet when build:incidents:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  mockUseIncidents.mockReturnValue(baseQuery({ data: [] }));
  render(<IncidentsPage projectId={1} />);
  fireEvent.keyDown(document, { key: "c" });
  const lastCall = mockIncidentSheet.mock.calls[mockIncidentSheet.mock.calls.length - 1];
  expect(lastCall[0].open).toBe(true);
});

it("pressing c does not open the sheet if build:incidents:manage is not granted", () => {
  mockUseCan.mockReturnValue(false);
  mockUseIncidents.mockReturnValue(baseQuery({ data: [] }));
  render(<IncidentsPage projectId={1} />);
  mockIncidentSheet.mockClear();
  fireEvent.keyDown(document, { key: "c" });
  const openCalls = mockIncidentSheet.mock.calls.filter((call) => call[0].open === true);
  expect(openCalls).toHaveLength(0);
});

it("pressing e on the focused incident opens the edit sheet for that incident", () => {
  const incident = { id: 77, incidentNumber: 3, title: "DB failure", severity: "critical", status: "detected", ownerId: null, detectedAt: null };
  mockUseIncidents.mockReturnValue(baseQuery({ data: [incident] }));
  render(<IncidentsPage projectId={1} />);
  fireEvent.keyDown(document, { key: "j" });
  mockIncidentSheet.mockClear();
  fireEvent.keyDown(document, { key: "e" });
  const lastCall = mockIncidentSheet.mock.calls[mockIncidentSheet.mock.calls.length - 1];
  expect(lastCall[0].open).toBe(true);
});
