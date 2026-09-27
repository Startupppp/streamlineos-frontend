import { render, screen } from "@testing-library/react";
import { TicketActivityLog } from "./ticket-activity-log";

jest.mock("@/components/illustrations", () => ({
  EmptyActivityIllustration: () => null,
}));

jest.mock("@/lib/date-utils", () => ({
  formatRelativeTime: () => "just now",
}));

const mockUseTicketActivity = jest.fn();
jest.mock("@/hooks/api/build/ticket-activity", () => ({
  useTicketActivity: (...args: unknown[]) => mockUseTicketActivity(...args),
}));

function makeEntry(action: string, label: string) {
  return {
    id: 1,
    action,
    label,
    fromValue: null,
    toValue: null,
    createdAt: "2026-09-27T10:00:00.000Z",
    user: { id: "u1", name: "Alice", image: null },
  };
}

function mockWithEntries(entries: ReturnType<typeof makeEntry>[]) {
  mockUseTicketActivity.mockReturnValue({
    data: entries,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

it("renders the activity feed when an entry carries an action absent from the display set", () => {
  mockWithEntries([makeEntry("module_linked", "linked a module")]);
  render(<TicketActivityLog projectId={1} ticketId={1} />);
  expect(screen.getByText("linked a module")).toBeInTheDocument();
});

it("shows the action string as fallback label when the server sends an empty label for an unknown action", () => {
  mockWithEntries([makeEntry("future_action_v2", "")]);
  render(<TicketActivityLog projectId={1} ticketId={1} />);
  expect(screen.getByText("future_action_v2")).toBeInTheDocument();
});

it("renders the server label for a known action", () => {
  mockWithEntries([makeEntry("created", "created this ticket")]);
  render(<TicketActivityLog projectId={1} ticketId={1} />);
  expect(screen.getByText("created this ticket")).toBeInTheDocument();
});

it("does not show an error state when the only entry has an unknown action", () => {
  mockWithEntries([makeEntry("unknown_action_type", "did something")]);
  render(<TicketActivityLog projectId={1} ticketId={1} />);
  expect(screen.queryByText("Could not load activity history.")).not.toBeInTheDocument();
  expect(screen.getByText("did something")).toBeInTheDocument();
});
