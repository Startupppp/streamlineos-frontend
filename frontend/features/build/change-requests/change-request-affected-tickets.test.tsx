import { fireEvent, render, screen } from "@testing-library/react";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { ChangeRequestAffectedTickets } from "./change-request-affected-tickets";

let mockCanManage = true;
let mockAccessState = "allowed";
let mockAffectedTicketsResult: {
  data: { data: unknown[]; pagination: { hasMore: boolean } } | undefined;
  isLoading: boolean;
  isError?: boolean;
  error?: Error;
  refetch?: () => void;
} = { data: { data: [], pagination: { hasMore: false } }, isLoading: false };

const mockLinkMutate = jest.fn();
const mockUnlinkMutate = jest.fn();

jest.mock("@/hooks/api/build/change-request-affected-items", () => ({
  useChangeRequestAffectedTickets: () => mockAffectedTicketsResult,
  useLinkAffectedTicket: () => ({ mutate: mockLinkMutate, isPending: false }),
  useUnlinkAffectedTicket: () => ({ mutate: mockUnlinkMutate }),
}));

jest.mock("@/hooks/api/build/ticket-search", () => ({
  useTicketSearch: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api", () => ({
  useProject: () => ({ data: { key: "CR", statuses: [] } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
  useCanState: () => mockAccessState,
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (value: string) => value,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/responsive-popover", () => ({
  ResponsivePopover: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange: (open: boolean) => void;
  }) => <div onClick={() => onOpenChange(true)}>{children}</div>,
  ResponsivePopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
  ResponsivePopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

const mockUseTicketSearch = jest.mocked(useTicketSearch);

beforeEach(() => {
  jest.clearAllMocks();
  mockCanManage = true;
  mockAccessState = "allowed";
  mockAffectedTicketsResult = { data: { data: [], pagination: { hasMore: false } }, isLoading: false };
});

it("does not offer the link control to a user without manage permission", () => {
  mockCanManage = false;

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  expect(screen.queryByRole("button", { name: "Link" })).not.toBeInTheDocument();
});

it("shows an empty state when no tickets are linked", () => {
  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  expect(screen.getByText("No affected tickets yet.")).toBeInTheDocument();
});

it("renders nothing while the access snapshot is still loading, so the empty state is never shown as a false negative", () => {
  mockAccessState = "loading";

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  expect(screen.queryByText("No affected tickets yet.")).not.toBeInTheDocument();
});

it("renders nothing when the viewer is denied change-request view, rather than an empty state", () => {
  mockAccessState = "denied";

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  expect(screen.queryByText("No affected tickets yet.")).not.toBeInTheDocument();
});

it("renders a linked ticket with its ticket key and title", () => {
  mockAffectedTicketsResult = {
    data: {
      data: [
        {
          id: 5,
          orgId: "org-1",
          changeRequestId: 7,
          ticketId: 55,
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: "user-1",
          ticket: { id: 55, title: "Fix the widget", ticketNumber: 3, status: "TODO", priority: "MEDIUM", type: "BUG" },
        },
      ],
      pagination: { hasMore: false },
    },
    isLoading: false,
  };

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  expect(screen.getByText("Fix the widget")).toBeInTheDocument();
  expect(screen.getByText("#3")).toBeInTheDocument();
});

it("unlinks a ticket via its remove button", () => {
  mockAffectedTicketsResult = {
    data: {
      data: [
        {
          id: 5,
          orgId: "org-1",
          changeRequestId: 7,
          ticketId: 55,
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: "user-1",
          ticket: { id: 55, title: "Fix the widget", ticketNumber: 3, status: "TODO", priority: "MEDIUM", type: "BUG" },
        },
      ],
      pagination: { hasMore: false },
    },
    isLoading: false,
  };

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  fireEvent.click(screen.getByRole("button", { name: "Unlink ticket" }));

  expect(mockUnlinkMutate).toHaveBeenCalledTimes(1);
  expect(mockUnlinkMutate).toHaveBeenCalledWith(5, expect.anything());
});

it("does not render an unlink control for a read-only member (positive counterpart of the permission gate)", () => {
  mockCanManage = false;
  mockAffectedTicketsResult = {
    data: {
      data: [
        {
          id: 5,
          orgId: "org-1",
          changeRequestId: 7,
          ticketId: 55,
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: "user-1",
          ticket: { id: 55, title: "Fix the widget", ticketNumber: 3, status: "TODO", priority: "MEDIUM", type: "BUG" },
        },
      ],
      pagination: { hasMore: false },
    },
    isLoading: false,
  };

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  expect(screen.getByText("Fix the widget")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Unlink ticket" })).not.toBeInTheDocument();
});

it("links a ticket selected from the search picker", () => {
  mockUseTicketSearch.mockReturnValue({
    data: [
      { id: 90, title: "New ticket", ticketNumber: 9, status: "TODO", priority: "LOW", projectId: 1, projectKey: "CR", projectName: "Project" },
    ],
  } as ReturnType<typeof useTicketSearch>);

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  fireEvent.click(screen.getByRole("button", { name: "Link" }));
  fireEvent.click(screen.getByText("New ticket"));

  expect(mockLinkMutate).toHaveBeenCalledTimes(1);
  expect(mockLinkMutate).toHaveBeenCalledWith({ ticketId: 90 }, expect.anything());
});

it("filters out a candidate that is already linked", () => {
  mockAffectedTicketsResult = {
    data: {
      data: [
        {
          id: 5,
          orgId: "org-1",
          changeRequestId: 7,
          ticketId: 90,
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: "user-1",
          ticket: { id: 90, title: "Already linked", ticketNumber: 9, status: "TODO", priority: "LOW", type: "TASK" },
        },
      ],
      pagination: { hasMore: false },
    },
    isLoading: false,
  };
  mockUseTicketSearch.mockReturnValue({
    data: [
      { id: 90, title: "Already linked", ticketNumber: 9, status: "TODO", priority: "LOW", projectId: 1, projectKey: "CR", projectName: "Project" },
    ],
  } as ReturnType<typeof useTicketSearch>);

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  fireEvent.click(screen.getByRole("button", { name: "Link" }));
  fireEvent.change(screen.getByPlaceholderText("Search tickets…"), { target: { value: "linked" } });

  expect(screen.getByText("No tickets found.")).toBeInTheDocument();
});

it("shows an inline retry instead of a false empty state when the affected-tickets read fails", () => {
  const refetch = jest.fn();
  mockAffectedTicketsResult = {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("Not a project member."),
    refetch,
  };

  render(<ChangeRequestAffectedTickets projectId={1} changeRequestId={7} />);

  expect(screen.getByText("Couldn't load affected tickets")).toBeInTheDocument();
  expect(screen.queryByText("No affected tickets yet.")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});
