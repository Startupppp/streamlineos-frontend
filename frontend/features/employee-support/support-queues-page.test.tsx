import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { HelpdeskTicket } from "@/hooks/api/hr/helpdesk-schema";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseSupportQueueTickets = jest.fn();
const mockUseSupportQueues = jest.fn();
const mockSearchParams = { current: new URLSearchParams() };

function ticket(overrides: Partial<HelpdeskTicket> = {}): HelpdeskTicket {
  return {
    id: 1,
    orgId: "org1",
    userId: "u2",
    userMembershipId: 2,
    title: "VPN keeps dropping",
    description: null,
    category: "it_access",
    queue: "IT",
    priority: "HIGH",
    status: "TODO",
    assigneeId: null,
    assigneeMembershipId: null,
    assigneeName: null,
    isConfidential: false,
    firstResponseDueAt: "2026-09-21T13:00:00.000Z",
    firstRespondedAt: null,
    slaDueAt: "2026-09-22T09:00:00.000Z",
    escalatedAt: null,
    escalationLevel: 0,
    resolvedAt: null,
    resolution: null,
    createdAt: "2026-09-21T09:00:00.000Z",
    updatedAt: "2026-09-21T09:00:00.000Z",
    authorName: "Priya",
    authorImage: null,
    ...overrides,
  };
}

function queryOf(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:helpdesk:view": "all" }, modules: { hr: true } },
  isLoading: false,
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => mockSearchParams.current,
  usePathname: () => "/hr/helpdesk",
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: (key: string) => mockUseCan(key),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/hr/helpdesk", () => ({
  useSupportQueueTickets: () => mockUseSupportQueueTickets(),
  useSupportQueues: () => mockUseSupportQueues(),
  useSupportQueueTicket: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useAddSupportQueueComment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateSupportQueueTicket: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("./support-queue-settings-sheet", () => ({
  SupportQueueSettingsSheet: () => <div data-testid="queue-settings" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, filters, actions }: { children?: ReactNode; title?: string; filters?: ReactNode; actions?: ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      <div data-testid="actions">{actions}</div>
      <div data-testid="filters">{filters}</div>
      {children}
    </div>
  ),
}));

import { SupportQueuesPage } from "./support-queues-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams.current = new URLSearchParams();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCan.mockImplementation((key: string) => key === "hr:helpdesk:queue-it");
  mockUseSupportQueues.mockReturnValue(queryOf({ data: [], isSuccess: true }));
  mockUseSupportQueueTickets.mockReturnValue(queryOf({ isLoading: true }));
});

describe("SupportQueuesPage — one company-wide surface, HR as one queue", () => {
  it("renders the five queue tabs and marks the queues the agent is not a member of as read only", () => {
    render(<SupportQueuesPage />);

    const tabs = within(screen.getByRole("tablist", { name: /support queues/i })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "HRread only",
      "IT",
      "Financeread only",
      "Adminread only",
      "Legalread only",
    ]);
  });

  it("defaults to the first queue the agent is a member of when the URL names none", () => {
    render(<SupportQueuesPage />);

    expect(screen.getByRole("tab", { name: /^IT$/ })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps HR as the default tab for an HR queue member", () => {
    mockUseCan.mockImplementation((key: string) => key === "hr:helpdesk:queue-hr" || key === "hr:helpdesk:queue-it");

    render(<SupportQueuesPage />);

    expect(screen.getByRole("tab", { name: /^HR/ })).toHaveAttribute("aria-selected", "true");
  });

  it("shows open and overdue counts on the tabs of member queues only", () => {
    mockUseSupportQueues.mockReturnValue(
      queryOf({
        isSuccess: true,
        data: [
          { queue: "IT", label: "IT", isMember: true, source: "default", firstResponseHours: 4, resolutionHours: 24, escalationUserId: null, escalationName: null, openCount: 7, overdueCount: 2 },
          { queue: "HR", label: "HR", isMember: false, source: "default", firstResponseHours: 8, resolutionHours: 72, escalationUserId: null, escalationName: null, openCount: null, overdueCount: null },
        ],
      }),
    );

    render(<SupportQueuesPage />);

    const itTab = screen.getByRole("tab", { name: /^IT/ });
    expect(itTab).toHaveTextContent("7");
    expect(within(itTab).getByLabelText("2 overdue")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^HR/ })).not.toHaveTextContent(/\d/);
  });

  it("keeps the page title with typed column headers while the queue loads", () => {
    render(<SupportQueuesPage />);

    expect(screen.getByRole("heading", { name: /employee support/i })).toBeInTheDocument();
    for (const header of ["Request", "Requester", "Category", "Status", "Priority", "SLA", "Assignee", "Created"])
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    expect(screen.queryByText(/column 1/i)).toBeNull();
  });

  it("renders the confidential badge and the SLA markers on the rows", () => {
    mockUseSupportQueueTickets.mockReturnValue(
      queryOf({
        isSuccess: true,
        data: {
          data: [
            ticket({ id: 1, title: "Payslip mismatch", queue: "HR", isConfidential: true, slaDueAt: "2999-01-01T00:00:00.000Z", firstRespondedAt: "2026-09-21T10:00:00.000Z" }),
            ticket({ id: 2, title: "Laptop dead", slaDueAt: "2000-01-01T00:00:00.000Z" }),
            ticket({ id: 3, title: "Badge access", escalatedAt: "2026-09-21T12:00:00.000Z", escalationLevel: 1 }),
          ],
          pagination: { limit: 25, hasMore: false, nextCursor: null },
        },
      }),
    );

    render(<SupportQueuesPage />);

    const confidentialRow = screen.getByText("Payslip mismatch").closest("tr");
    expect(confidentialRow).not.toBeNull();
    expect(within(confidentialRow ?? document.body).getByText("Confidential")).toBeInTheDocument();
    expect(screen.getByText("Laptop dead").closest("tr")).toHaveTextContent("Overdue");
    expect(screen.getByText("Badge access").closest("tr")).toHaveTextContent("Escalated");
    expect(screen.getAllByText("Confidential")).toHaveLength(1);
  });

  it("shows an explicit empty state for a queue with nothing in it", () => {
    mockUseSupportQueueTickets.mockReturnValue(
      queryOf({ isSuccess: true, data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } } }),
    );

    render(<SupportQueuesPage />);

    expect(screen.getByText("No IT requests")).toBeInTheDocument();
  });

  it("shows the error state with a retry when the queue read fails", () => {
    const refetch = jest.fn();
    mockUseSupportQueueTickets.mockReturnValue(queryOf({ isError: true, error: new Error("boom"), refetch }));

    render(<SupportQueuesPage />);

    expect(screen.getByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("does not claim denial while the access snapshot is still loading", () => {
    mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });

    render(<SupportQueuesPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows the no-permission state once hr:helpdesk:view has said no", () => {
    mockUseAccess.mockReturnValue({ data: { isOrgOwner: false, scopes: {}, modules: { hr: true } }, isLoading: false });

    render(<SupportQueuesPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("offers queue settings only to the support administrator", () => {
    render(<SupportQueuesPage />);
    expect(screen.queryByRole("button", { name: /queue settings/i })).toBeNull();

    mockUseCan.mockImplementation((key: string) => key === "hr:helpdesk:manage");
    render(<SupportQueuesPage />);
    expect(screen.getByRole("button", { name: /queue settings/i })).toBeInTheDocument();
  });
});
