import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectBoardTickets } from "@/hooks/api/build";
import { TicketRelations } from "./ticket-relations";

let mockCanUpdate = true;
let mockPageStateResolution: { kind: string; error?: unknown } = { kind: "ready" };
let mockRelationsResult: {
  data: unknown[];
  isLoading: boolean;
  isError?: boolean;
  error?: Error;
  refetch?: () => void;
} = { data: [], isLoading: false, refetch: jest.fn() };

jest.mock("@/hooks/api/build", () => ({
  useTicketRelations: () => mockRelationsResult,
  useProjectBoardTickets: jest.fn(() => ({ data: [] })),
  useAddTicketRelation: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveTicketRelation: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/hooks/api", () => ({
  useProject: () => ({ data: { key: "BLD", statuses: [] } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanUpdate,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageStateResolution,
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

jest.mock("./subtask-row", () => ({ SubtaskRow: () => null }));

const mockUseProjectBoardTickets = jest.mocked(useProjectBoardTickets);

beforeEach(() => {
  jest.clearAllMocks();
  mockCanUpdate = true;
  mockPageStateResolution = { kind: "ready" };
  mockRelationsResult = { data: [], isLoading: false, refetch: jest.fn() };
});

it("does not render an empty relation state while the page-state resolution is not ready", () => {
  mockPageStateResolution = { kind: "loading" };

  render(<TicketRelations ticketId={10} projectId={42} />);

  expect(screen.queryByText("No relations yet.")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
});

it("does not render an empty relation state when the viewer is denied", () => {
  mockPageStateResolution = { kind: "denied", permission: "build:tickets:view" };

  render(<TicketRelations ticketId={10} projectId={42} />);

  expect(screen.queryByText("No relations yet.")).not.toBeInTheDocument();
});

it("does not load or offer relation mutations to a read-only member", () => {
  mockCanUpdate = false;

  render(<TicketRelations ticketId={10} projectId={42} />);

  expect(mockUseProjectBoardTickets).toHaveBeenLastCalledWith(0);
  expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
});

it("loads relation candidates only after the picker opens", () => {
  render(<TicketRelations ticketId={10} projectId={42} />);

  expect(mockUseProjectBoardTickets).toHaveBeenLastCalledWith(0);

  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(mockUseProjectBoardTickets).toHaveBeenLastCalledWith(42);
});

it("shows a retry instead of a false empty state when the relations read fails, so a denied or transient error never reads as 'no relations'", () => {
  const refetch = jest.fn();
  mockPageStateResolution = { kind: "error", error: new Error("Not a project member.") };
  mockRelationsResult = {
    data: [],
    isLoading: false,
    isError: true,
    error: new Error("Not a project member."),
    refetch,
  };

  render(<TicketRelations ticketId={10} projectId={42} />);

  expect(screen.queryByText("No relations yet.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});
