import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import { TicketDetailPage } from "./ticket-detail-page";

const mockRetryByKey = jest.fn();
const mockRetryTicket = jest.fn();
const mockNotFound = jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
let mockByKeyError: Error | null = null;
let mockTicketError: Error | null = null;

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
    data: mockByKeyError ? undefined : { id: 1 },
    error: mockByKeyError,
    isLoading: false,
    refetch: mockRetryByKey,
  }),
  useEpics: jest.fn(),
  useModules: jest.fn(),
  useCycles: jest.fn(),
}));
jest.mock("@/hooks/api/build/ticket-queries", () => ({ useProjectBoardTickets: jest.fn() }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
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
  mockTicketError = null;
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
