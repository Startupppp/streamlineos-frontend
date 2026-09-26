import { fireEvent, render, screen } from "@testing-library/react";
import { WatcherList } from "./watcher-list";

let mockCanUpdate = true;
let mockPageStateResolution: { kind: string; error?: unknown } = { kind: "ready" };
let mockWatchersResult: {
  data: { userId: string; user?: { name?: string | null; image?: string | null } }[];
  isLoading: boolean;
  isError?: boolean;
  error?: Error;
  refetch?: () => void;
} = { data: [], isLoading: false, refetch: jest.fn() };

const mockToggleMutate = jest.fn();
const mockAddMutate = jest.fn();

jest.mock("@/hooks/api/build", () => ({
  useWatchers: () => mockWatchersResult,
  useToggleWatch: () => ({ mutate: mockToggleMutate, isPending: false }),
  useAddWatcher: () => ({ mutate: mockAddMutate }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanUpdate,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageStateResolution,
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => null,
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div title={title}>{children}</div>
  ),
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanUpdate = true;
  mockPageStateResolution = { kind: "ready" };
  mockWatchersResult = { data: [], isLoading: false, refetch: jest.fn() };
});

it("does not show the empty watcher message while the request is loading", () => {
  mockPageStateResolution = { kind: "loading" };

  render(<WatcherList projectId={1} ticketId={5} />);

  expect(screen.queryByText("No one is watching this ticket yet.")).not.toBeInTheDocument();
});

it("shows a retry button instead of empty watcher text when the watchers fetch fails", () => {
  const refetch = jest.fn();
  mockPageStateResolution = { kind: "error", error: new Error("Fetch failed") };
  mockWatchersResult = {
    data: [],
    isLoading: false,
    isError: true,
    error: new Error("Fetch failed"),
    refetch,
  };

  render(<WatcherList projectId={1} ticketId={5} />);

  expect(screen.queryByText("No one is watching this ticket yet.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("shows the empty state message when nobody is watching", () => {
  render(<WatcherList projectId={1} ticketId={5} />);

  expect(screen.getByText("No one is watching this ticket yet.")).toBeInTheDocument();
});

it("hides the watch toggle when the user cannot update", () => {
  mockCanUpdate = false;

  render(<WatcherList projectId={1} ticketId={5} />);

  expect(screen.queryByRole("button", { name: /watch/i })).not.toBeInTheDocument();
});

it("shows Unwatch when the current user is already watching the ticket (positive gate counterpart)", () => {
  mockWatchersResult = {
    data: [{ userId: "user-1", user: { name: "Alice" } }],
    isLoading: false,
    refetch: jest.fn(),
  };

  render(<WatcherList projectId={1} ticketId={5} />);

  expect(screen.getByRole("button", { name: /unwatch/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^watch$/i })).not.toBeInTheDocument();
});
