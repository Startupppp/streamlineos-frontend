import { render, screen } from "@testing-library/react";
import type { CommitmentReference } from "@/hooks/api/calendar-commitment-schema";
import { CommitmentRadarSheet } from "./commitment-radar-sheet";

const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/calendar-commitments", () => ({
  useCalendarCommitmentChain: () => ({ isLoading: true, isError: false, data: undefined, refetch: jest.fn() }),
  useCreateCalendarCommitmentEdge: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useRemoveCalendarCommitmentEdge: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));

const root: CommitmentReference = { source: "build", type: "ticket", recordId: "42" };

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
});

it("keeps the commitment chain in a nested desktop sheet", () => {
  render(<CommitmentRadarSheet root={root} open onClose={jest.fn()} />);

  const sheet = screen.getByRole("dialog", { name: "Commitment radar" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(sheet).toHaveClass("data-[state=open]:slide-in-from-right");
  expect(sheet).toHaveClass("z-[110]");
  expect(screen.getByText("Loading commitment chain")).toBeInTheDocument();
});

it("opens the commitment chain from the bottom on mobile", () => {
  mockIsMobile.mockReturnValue(true);
  render(<CommitmentRadarSheet root={root} open onClose={jest.fn()} />);

  expect(screen.getByRole("dialog", { name: "Commitment radar" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
});
