import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import { TicketDetailPage } from "./ticket-detail-page";

const mockRetryByKey = jest.fn();
const mockRetryTicket = jest.fn();
const mockNotFound = jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
let mockByKeyError: Error | null = null;
let mockByKeyTicket: { id: number } | undefined = { id: 1 };
let mockTicketError: Error | null = null;
let mockCanViewAccess: "loading" | "granted" | "denied" = "granted";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => mockNotFound(),
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
jest.mock("@/hooks/api", () => ({
  useProject: () => ({ data: { key: "TEST" }, isLoading: false }),
}));
jest.mock("@/hooks/api/build", () => ({
  useTicketByKey: () => ({
    data: mockByKeyError ? undefined : mockByKeyTicket,
    error: mockByKeyError,
    isLoading: false,
    refetch: mockRetryByKey,
  }),
  useEpics: jest.fn(),
  useModules: jest.fn(),
  useCycles: jest.fn(),
}));
jest.mock("@/hooks/api/build/ticket-queries", () => ({ useProjectBoardTickets: jest.fn() }));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => mockCanViewAccess,
}));
jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => false }));
jest.mock("./use-ticket-detail", () => ({
  useTicketDetail: () => ({
    ticket: undefined,
    isLoading: false,
    ticketError: mockTicketError,
    refetchTicket: mockRetryTicket,
  }),
}));
jest.mock("./ticket-detail-main-section", () => ({ TicketDetailMainSection: () => null }));
jest.mock("./ticket-detail-right-panel", () => ({ TicketDetailRightPanel: () => null }));
jest.mock("./ticket-detail-actions", () => ({
  TicketDetailActions: () => null,
  TicketDetailDeleteDialog: () => null,
  TicketDetailDeleteMenuItem: () => null,
}));
jest.mock("./ticket-parent-control", () => ({ TicketParentControl: () => null }));

beforeEach(() => {
  mockByKeyError = null;
  mockByKeyTicket = { id: 1 };
  mockTicketError = null;
  mockCanViewAccess = "granted";
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
