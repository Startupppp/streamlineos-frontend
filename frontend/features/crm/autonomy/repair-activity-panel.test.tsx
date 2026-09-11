import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AutonomyRepair, RepairMeasure } from "@/types/crm/autonomy";
import { RepairActivityPanel } from "./repair-activity-panel";

const mockMeasure = jest.fn();
const mockRepairs = jest.fn();
const mockRevert = jest.fn();
const mockCan = jest.fn();

jest.mock("@/hooks/api/crm/autonomy", () => ({
  useRepairMeasure: () => mockMeasure(),
  useRepairs: () => mockRepairs(),
  useRevertRepair: () => mockRevert(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan() }));

const repair = (over: Partial<AutonomyRepair> = {}): AutonomyRepair => ({
  autonomyRepairId: "r-1",
  autonomousDecisionId: "d-1",
  repairClass: "phone.non-ascii-characters",
  findingId: null,
  partyId: "p-1",
  partyName: "Acme Ltd",
  field: "phone",
  previousValue: "07700 900461",
  repairedValue: "+44 7700 900461",
  appliedAt: "2026-09-01T10:00:00.000Z",
  revertedAt: null,
  revertedByUserId: null,
  revertedReason: null,
  ...over,
});

const measure = (over: Partial<RepairMeasure> = {}): RepairMeasure => ({
  windowDays: 30,
  resolution: { automated: 8, manual: 2, automatedShare: 0.8 },
  repairs: { byClass: [], applied: 8, reverted: 1 },
  remaining: { total: 12, weighted: 30, byProducer: [], oldestOpenAgeDays: 9 },
  ...over,
});

/**
 * CRM-P1-05. The policies panel has always let an organisation grant the loop
 * permission to edit customer records. Nothing let it read what was then
 * changed, measure whether that was any good, or put one back — the API for all
 * three existed and no screen called it.
 */
describe("RepairActivityPanel", () => {
  beforeEach(() => {
    mockCan.mockReturnValue(true);
    mockRevert.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      variables: undefined,
    });
    mockMeasure.mockReturnValue({ data: measure(), isLoading: false });
    mockRepairs.mockReturnValue({ data: { items: [repair()], nextCursor: null }, isLoading: false });
  });

  it("shows both values, so a change is reviewable", () => {
    /**
     * "It repaired the phone number" is not reviewable. "It changed 07700
     * 900461 to +44 7700 900461" is.
     */
    render(<RepairActivityPanel />);
    expect(screen.getByText(/07700 900461 → \+44 7700 900461/)).toBeInTheDocument();
  });

  it("reads an empty window as no evidence, not as no automation", () => {
    /**
     * The backend returns automatedShare: null when nothing was decided. 0%
     * would state the opposite of what is known.
     */
    mockMeasure.mockReturnValue({
      data: measure({ resolution: { automated: 0, manual: 0, automatedShare: null } }),
      isLoading: false,
    });

    render(<RepairActivityPanel />);
    expect(screen.getByText(/nothing was decided in this window/i)).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("shows what is still open beside the share it cleared", () => {
    /**
     * The ratio alone is gameable: a loop repairing every trivial finding and
     * leaving every hard one shows a rising share while the queue gets harder.
     */
    render(<RepairActivityPanel />);
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Still open")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("counts what a person put back, which is the correction rate", () => {
    render(<RepairActivityPanel />);
    expect(screen.getByText("Put back by a person")).toBeInTheDocument();
  });

  it("puts one back", async () => {
    const mutate = jest.fn();
    mockRevert.mockReturnValue({ mutate, isPending: false, isError: false, variables: undefined });

    render(<RepairActivityPanel />);
    await userEvent.click(screen.getByRole("button", { name: /put back/i }));

    expect(mutate).toHaveBeenCalledWith({ repairId: "r-1" });
  });

  it("offers no undo on a repair already put back", () => {
    mockRepairs.mockReturnValue({
      data: { items: [repair({ revertedAt: "2026-09-02T10:00:00.000Z" })], nextCursor: null },
      isLoading: false,
    });

    render(<RepairActivityPanel />);
    expect(screen.queryByRole("button", { name: /put back/i })).not.toBeInTheDocument();
  });

  it("does not offer undo to somebody without the reverse key", () => {
    /** Undoing what the system did is deliberately its own authority. */
    mockCan.mockReturnValue(false);
    render(<RepairActivityPanel />);
    expect(screen.queryByRole("button", { name: /put back/i })).not.toBeInTheDocument();
  });

  it("says an empty list means nothing was repaired, not nothing was wrong", () => {
    mockRepairs.mockReturnValue({ data: { items: [], nextCursor: null }, isLoading: false });
    render(<RepairActivityPanel />);
    expect(screen.getByText(/not that there was nothing to fix/i)).toBeInTheDocument();
  });
});
