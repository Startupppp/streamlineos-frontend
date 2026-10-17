import { fireEvent, render, screen } from "@testing-library/react";
import { CyclesTab } from "./cycles-tab";

const mutateAsync = jest.fn().mockResolvedValue({});
const mockUseFeedbackCycles = jest.fn();
const mockUseUpdateFeedbackCycleStatus = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useFeedbackCycles: () => mockUseFeedbackCycles(),
  useCreateFeedbackCycle: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateFeedbackCycleStatus: () => mockUseUpdateFeedbackCycleStatus(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

function cycle(id: number, status: string) {
  return {
    id,
    name: `Cycle ${id}`,
    type: "360",
    status,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    isAnonymous: true,
    questions: [],
  };
}

function renderTab(isPending: boolean, variables?: { cycleId: number }) {
  mockUseFeedbackCycles.mockReturnValue({
    data: [cycle(1, "DRAFT"), cycle(2, "ACTIVE")],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseUpdateFeedbackCycleStatus.mockReturnValue({
    mutateAsync,
    isPending,
    variables,
  });
  render(<CyclesTab />);
}

function activate(): HTMLElement {
  return screen.getByRole("button", { name: /activate cycle/i });
}

function close(): HTMLElement {
  return screen.getByRole("button", { name: /close cycle/i });
}

beforeEach(() => {
  jest.clearAllMocks();
  mutateAsync.mockResolvedValue({});
});

describe("BUG-013 feedback cycle status controls respect the in-flight mutation", () => {
  it("enables both Activate and Close while nothing is in flight, so the negatives below are not passing on controls that never render", () => {
    renderTab(false);

    expect(activate()).toBeEnabled();
    expect(close()).toBeEnabled();
  });

  it("transitions a DRAFT cycle to ACTIVE on a first click", () => {
    renderTab(false);
    fireEvent.click(activate());

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync.mock.calls[0][0]).toEqual({ cycleId: 1, status: "ACTIVE" });
  });

  it("disables Activate while a status update is in flight, so a double-click cannot fire two transitions", () => {
    renderTab(true, { cycleId: 1 });

    expect(activate()).toBeDisabled();
  });

  it("fires no second transition from clicking the disabled Activate twice", () => {
    renderTab(true, { cycleId: 1 });
    fireEvent.click(activate());
    fireEvent.click(activate());

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("disables Close cycle while a status update is in flight, so the confirm cannot be opened over a transition already running", () => {
    renderTab(true, { cycleId: 1 });

    expect(close()).toBeDisabled();
  });

  it("opens no close confirm from clicking the disabled Close cycle", () => {
    renderTab(true, { cycleId: 1 });
    fireEvent.click(close());

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("opens the close confirm when nothing is in flight, so the negative above is not the only reachable branch", () => {
    renderTab(false);
    fireEvent.click(close());

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("spins only the row whose cycle is updating, so a second row is not reported as transitioning", () => {
    renderTab(true, { cycleId: 99 });

    expect(activate()).not.toHaveAttribute("aria-busy");
    expect(activate()).toBeDisabled();
  });
});
