import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectBoardTickets } from "@/hooks/api/build";
import { TicketRelations } from "./ticket-relations";

let mockCanUpdate = true;

jest.mock("@/hooks/api/build", () => ({
  useTicketRelations: () => ({ data: [], isLoading: false }),
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
