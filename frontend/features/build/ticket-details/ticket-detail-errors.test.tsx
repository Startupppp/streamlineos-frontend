import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import { TicketDetailPage } from "./ticket-detail-page";

const mockRetryByKey = jest.fn();
const mockRetryTicket = jest.fn();
const mockNotFound = jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
let mockByKeyError: Error | null = null;
let mockByKeyPending = false;
let mockByKeyTicket: { id: number } | undefined = { id: 1 };
let mockTicketError: Error | null = null;
let mockCanViewAccess: "loading" | "granted" | "denied" = "granted";
let mockCanUpdateResult = true;
let mockCanAssignResult = true;
let mockCanDeleteResult = true;
let mockIsOnline = true;
let mockIsMobile = false;
let mockResolvedTicket:
  | { id: number; ticketNumber: number; title: string; version?: number; rank?: string }
  | undefined;
let mockRightPanelOpen = false;
let mockTicketUpdatedAt: number | undefined;
let mockOfflineDraftFields: string[] = [];
let mockMainSectionCanUpdate: boolean | undefined;
let mockPanelCanUpdate: boolean | undefined;
let mockPanelCanAssign: boolean | undefined;
let mockTicketActionsCalled = false;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => mockNotFound(),
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    actions,
    subtitle,
  }: {
    children: ReactNode;
    actions?: ReactNode;
    subtitle?: ReactNode;
  }) => (
    <main>
      {actions}
      <p data-testid="page-subtitle">{subtitle}</p>
      {children}
    </main>
  ),
}));
jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: { key: "TEST" }, isLoading: false }),
}));
jest.mock("@/hooks/api/build/tickets", () => ({
  useTicketByKey: () => ({
    data: mockByKeyError ? undefined : mockByKeyTicket,
    error: mockByKeyError,
    isLoading: false,
    isPending: mockByKeyPending,
    refetch: mockRetryByKey,
  }),
}));
jest.mock("@/hooks/api/build/epics", () => ({
  useEpics: jest.fn(),
}));
jest.mock("@/hooks/api/build/modules", () => ({
  useModules: jest.fn(),
}));
jest.mock("@/hooks/api/build/cycles", () => ({
  useCycles: jest.fn(),
  useCyclePage: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, error: null })),
}));
jest.mock("@/hooks/api/build/ticket-queries", () => ({ useProjectBoardTickets: jest.fn() }));
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => {
    if (key === "build:tickets:update") return mockCanUpdateResult;
    if (key === "build:tickets:assign") return mockCanAssignResult;
    if (key === "build:tickets:delete") return mockCanDeleteResult;
    return true;
  },
  useCanState: () => mockCanViewAccess,
}));
jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile }));
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));
jest.mock("./use-ticket-detail", () => ({
  useTicketDetail: () => ({
    ticket: mockResolvedTicket,
    isLoading: false,
    ticketError: mockTicketError,
    refetchTicket: mockRetryTicket,
    ticketUpdatedAt: mockTicketUpdatedAt,
    offlineDraftFields: mockOfflineDraftFields,
    subtasks: [],
    members: [],
    statuses: [],
    saving: false,
    localTitle: mockResolvedTicket?.title ?? "",
    handleTitleChange: jest.fn(),
    commitTitle: jest.fn(() => null),
    revertTitle: jest.fn(),
    handleDescriptionEditorChange: jest.fn(),
    autoSave: jest.fn(),
    handleDelete: jest.fn(),
    isDeleting: false,
  }),
}));
jest.mock("./ticket-detail-main-section", () => ({
  TicketDetailMainSection: ({ canUpdate }: { canUpdate: boolean }) => {
    mockMainSectionCanUpdate = canUpdate;
    return null;
  },
}));
jest.mock("./ticket-detail-right-panel", () => ({
  TicketDetailRightPanel: ({ open, canUpdate, canAssign }: { open: boolean; canUpdate: boolean; canAssign: boolean }) => {
    mockRightPanelOpen = open;
    mockPanelCanUpdate = canUpdate;
    mockPanelCanAssign = canAssign;
    return open ? <div role="dialog" aria-label="Ticket properties" /> : null;
  },
}));
jest.mock("./ticket-detail-actions", () => ({
  TicketDetailActions: () => { mockTicketActionsCalled = true; return null; },
  TicketDetailDeleteDialog: () => null,
  TicketDetailDeleteMenuItem: () => null,
}));
jest.mock("./ticket-parent-control", () => ({ TicketParentControl: () => null }));

beforeEach(() => {
  mockByKeyError = null;
  mockByKeyPending = false;
  mockByKeyTicket = { id: 1 };
  mockTicketError = null;
  mockCanViewAccess = "granted";
  mockCanUpdateResult = true;
  mockCanAssignResult = true;
  mockCanDeleteResult = true;
  mockIsOnline = true;
  mockIsMobile = false;
  mockResolvedTicket = undefined;
  mockTicketUpdatedAt = undefined;
  mockOfflineDraftFields = [];
  mockRightPanelOpen = false;
  mockMainSectionCanUpdate = undefined;
  mockPanelCanUpdate = undefined;
  mockPanelCanAssign = undefined;
  mockTicketActionsCalled = false;
  jest.clearAllMocks();
});

it("offers retry for a network failure while resolving a ticket key", () => {
  mockByKeyError = new TypeError("Failed to fetch");
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load ticket");
  fireEvent.click(screen.getByRole("button", { name: /try again/i }));
  expect(mockRetryByKey).toHaveBeenCalledTimes(1);
  expect(mockNotFound).not.toHaveBeenCalled();
});

it("keeps an unresolved pending key read loading until a versioned ticket resolves", () => {
  mockByKeyPending = true;
  mockByKeyTicket = undefined;
  const view = render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockNotFound).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  mockByKeyPending = false;
  mockByKeyTicket = { id: 1 };
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Resolved ticket", version: 3 };
  view.rerender(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByTestId("page-subtitle")).toHaveTextContent("TEST-1");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("preserves not-found for a settled missing key read", () => {
  mockByKeyTicket = undefined;
  expect(() => render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />)).toThrow("NEXT_NOT_FOUND");
});

it("keeps access loading ahead of a pending missing key read", () => {
  mockCanViewAccess = "loading";
  mockByKeyPending = true;
  mockByKeyTicket = undefined;
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockNotFound).not.toHaveBeenCalled();
  expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
});

it("offers retry for a failed ticket detail read after its key was resolved", () => {
  mockTicketError = new ApiError("Internal server error", 500);
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load ticket");
  expect(screen.queryByText("Ticket not found")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /try again/i }));
  expect(mockRetryTicket).toHaveBeenCalledTimes(1);
});

it("preserves the real not-found response", () => {
  mockByKeyError = new ApiError("Ticket not found", 404, "PROJECTS_TICKET_NOT_FOUND");
  expect(() => render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />)).toThrow("NEXT_NOT_FOUND");
});

it("shows NoPermissionState when build:tickets:view is denied, not a 404", () => {
  mockCanViewAccess = "denied";
  mockByKeyPending = true;
  mockByKeyTicket = undefined;
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  expect(mockNotFound).not.toHaveBeenCalled();
});

it("shows a plan-required state for a 402 MODULE_NOT_ENABLED on ticket key lookup, not a generic error", () => {
  mockByKeyError = new ApiError("Module not enabled", 402, "MODULE_NOT_ENABLED", {
    moduleKey: "BUILD",
    reason: "not-in-plan",
    upgradePath: "/settings/billing",
  });
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.queryByText("Couldn't load ticket")).not.toBeInTheDocument();
  expect(mockNotFound).not.toHaveBeenCalled();
});

it("exposes the request id of a failed key lookup so a person can quote it to support", () => {
  mockByKeyError = new ApiError("Internal server error", 500, "INTERNAL", {
    correlationId: "req-key-8821",
  });
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByRole("alert")).toHaveTextContent("req-key-8821");
});

it("exposes the request id of a failed detail read so a person can quote it to support", () => {
  mockTicketError = new ApiError("Internal server error", 500, "INTERNAL", {
    correlationId: "req-detail-4417",
  });
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByRole("alert")).toHaveTextContent("req-detail-4417");
});

it("shows no reference line for an error that carries no request id, so the failure reads cleanly", () => {
  mockByKeyError = new TypeError("Failed to fetch");
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByRole("alert")).not.toHaveTextContent("Reference");
});

it("refuses to render an editable issue whose version token is missing, rather than saving without it", () => {
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Tokenless ticket" };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByRole("alert")).toHaveTextContent("without the version token");
  expect(mockNotFound).not.toHaveBeenCalled();
});

it("renders the issue once the version token is present, proving the token guard is not always on", () => {
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("keeps mobile ticket properties closed until the user opens them", () => {
  mockIsMobile = true;
  mockResolvedTicket = {
    id: 1,
    ticketNumber: 1,
    title: "Mobile ticket",
    version: 1,
  };

  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);

  expect(mockRightPanelOpen).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Expand details panel" }));
  expect(mockRightPanelOpen).toBe(true);
  expect(screen.getByRole("dialog", { name: "Ticket properties" })).toBeInTheDocument();
});

it("passes canUpdate=false to main section and right panel when build:tickets:update is denied", () => {
  mockCanUpdateResult = false;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockMainSectionCanUpdate).toBe(false);
  expect(mockPanelCanUpdate).toBe(false);
});

it("passes canUpdate=true to main section and right panel when build:tickets:update is granted", () => {
  mockCanUpdateResult = true;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockMainSectionCanUpdate).toBe(true);
  expect(mockPanelCanUpdate).toBe(true);
});

it("passes canAssign=false to the right panel when build:tickets:assign is denied", () => {
  mockCanAssignResult = false;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockPanelCanAssign).toBe(false);
});

it("passes canAssign=true to the right panel when build:tickets:assign is granted", () => {
  mockCanAssignResult = true;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockPanelCanAssign).toBe(true);
});

it("hides the delete action when build:tickets:delete is denied", () => {
  mockCanDeleteResult = false;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockTicketActionsCalled).toBe(false);
});

it("shows the delete action when build:tickets:delete is granted", () => {
  mockCanDeleteResult = true;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(mockTicketActionsCalled).toBe(true);
});

it("shows an offline notice when the user loses network connectivity", () => {
  mockIsOnline = false;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
});

it("hides the offline notice when the user is online", () => {
  mockIsOnline = true;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
});

it("dates the offline notice from the read's own timestamp, because an undated stale record cannot be judged", () => {
  mockIsOnline = false;
  mockTicketUpdatedAt = Date.now() - 5 * 60 * 1000;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByTestId("offline-freshness")).toHaveTextContent(/last updated .*5 minutes ago/i);
});

it("omits the freshness line when the record has never resolved, so it cannot claim a load that did not happen", () => {
  mockIsOnline = false;
  mockTicketUpdatedAt = 0;
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  expect(screen.queryByTestId("offline-freshness")).not.toBeInTheDocument();
});

it("renders the issue key in the header, because the key is the core identity field a reader cites", () => {
  mockResolvedTicket = { id: 1, ticketNumber: 7, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-7" />);
  expect(screen.getByTestId("page-subtitle")).toHaveTextContent("TEST-7");
});

it("counts the edits held back while offline, so a kept draft is visible rather than silently lost", () => {
  mockIsOnline = false;
  mockOfflineDraftFields = ["title", "priority"];
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByTestId("offline-draft-count")).toHaveTextContent("2 unsent changes");
});

it("shows no unsent-change count while offline with nothing held back, so the notice never overstates", () => {
  mockIsOnline = false;
  mockOfflineDraftFields = [];
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Versioned ticket", version: 3 };
  render(<TicketDetailPage projectId={9} ticketKey="TEST-1" />);
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  expect(screen.queryByTestId("offline-draft-count")).not.toBeInTheDocument();
});

it("404s when the URL project-key prefix does not match the project", () => {
  mockByKeyTicket = { id: 1 };
  mockResolvedTicket = { id: 1, ticketNumber: 1, title: "Wrong key ticket", version: 3 };
  expect(() => render(<TicketDetailPage projectId={9} ticketKey="NOPE-1" />)).toThrow("NEXT_NOT_FOUND");
  expect(mockNotFound).toHaveBeenCalled();
});
