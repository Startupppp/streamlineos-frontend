import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyTimeView } from "./my-time-view";

const submitMutate = jest.fn();
const refetchEntries = jest.fn();

let entriesResult: Record<string, unknown>;

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useScope: jest.fn(() => "all"),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/timesheets-core", () => ({
  useCurrentPeriod: () => ({
    data: { period: { id: 7, status: "OPEN", periodStart: "2026-09-28", rejectionReason: null } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useTimesheetSettings: () => ({ data: { requiredFields: [], workWeekStart: 1 } }),
  usePeriodApproverPreview: () => ({ data: undefined, isLoading: false, error: null }),
  useSubmitPeriod: () => ({ mutate: submitMutate, isPending: false }),
  useRecallPeriod: () => ({ mutate: jest.fn(), isPending: false }),
  useTimesheetEntries: () => entriesResult,
  fetchTimesheetPeriodSummary: jest.fn(),
}));

jest.mock("@/components/ai", () => ({
  AiActionsMenu: () => <div data-testid="ai-actions" />,
}));
jest.mock("./week-grid", () => ({ WeekGrid: () => <div data-testid="week-grid" /> }));
jest.mock("./day-timeline", () => ({ DayTimeline: () => <div data-testid="day-timeline" /> }));
jest.mock("./timer-panel", () => ({ TimerPanel: () => <div data-testid="timer-panel" /> }));
jest.mock("./fill-from-clock", () => ({
  FillFromClockButton: () => <div data-testid="fill-from-clock" />,
  FillFromClockNotice: () => null,
}));

function loadedEntries() {
  return {
    data: {
      data: [{ id: 1, hours: "4", date: "2026-09-28", timesheetPeriodId: 7, voidedAt: null }],
      pagination: { hasMore: false },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchEntries,
  };
}

function failedEntries() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("boom"),
    refetch: refetchEntries,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  entriesResult = loadedEntries();
});

describe("FE-TS-005 — submitting a week is confirmed first", () => {
  it("does not submit on the first click, only after the dialog is confirmed", async () => {
    const user = userEvent.setup();
    render(<MyTimeView />);

    await user.click(screen.getByRole("button", { name: "Submit week" }));

    expect(submitMutate).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/submit this week for approval/i);
    expect(dialog).toHaveTextContent(/4\.0 hours/);

    await user.click(within(dialog).getByRole("button", { name: "Submit week" }));
    expect(submitMutate).toHaveBeenCalledTimes(1);
    expect(submitMutate).toHaveBeenCalledWith(7, expect.anything());
  });

  it("submits nothing when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    render(<MyTimeView />);

    await user.click(screen.getByRole("button", { name: "Submit week" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(submitMutate).not.toHaveBeenCalled();
  });
});

describe("FE-TS-014 — a failed entries read is not shown as an empty week", () => {
  it("names the failure and offers a retry", async () => {
    const user = userEvent.setup();
    entriesResult = failedEntries();
    render(<MyTimeView />);

    expect(
      screen.getByText(/couldn't load this week's entries/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetchEntries).toHaveBeenCalled();
  });

  it("will not let the week be submitted over hours it could not read", () => {
    entriesResult = failedEntries();
    render(<MyTimeView />);

    expect(screen.getByRole("button", { name: "Submit week" })).toBeDisabled();
  });
});
