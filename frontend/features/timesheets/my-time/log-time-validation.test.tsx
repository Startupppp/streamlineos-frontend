import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogTimeSheet } from "./log-time-sheet";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

const createMutate = jest.fn();
const updateMutate = jest.fn();

jest.mock("@/hooks/api/timesheets-core", () => ({
  useCreateTimesheetEntry: () => ({ mutate: createMutate, isPending: false }),
  useUpdateTimesheetEntry: () => ({ mutate: updateMutate, isPending: false }),
  useTimesheetSettings: () => ({ data: { requiredFields: [] } }),
}));

jest.mock("@/hooks/api/timesheets-core/ai", () => ({
  describeTimesheetEntry: jest.fn(),
}));

jest.mock("./project-ticket-select", () => ({
  ProjectTicketSelect: () => <div data-testid="project-ticket-select" />,
}));

function renderSheet() {
  return render(
    <LogTimeSheet open onOpenChange={jest.fn()} defaultDate="2026-09-30" />,
  );
}

async function submitWithHours(typed: string) {
  const user = userEvent.setup();
  renderSheet();
  const hours = screen.getByRole("spinbutton", { name: /hours/i });
  await user.clear(hours);
  if (typed) await user.type(hours, typed);
  await user.click(screen.getByRole("button", { name: "Log time" }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the Log time drawer refuses an impossible number of hours in view of the user", () => {
  it.each([
    ["", /hours is required/i],
    ["-1", /positive number/i],
    ["0", /more than 0/i],
    ["25", /cannot exceed 24/i],
  ])("shows a visible message for %p and sends nothing", async (typed, message) => {
    await submitWithHours(typed);

    expect(await screen.findByText(message)).toBeVisible();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("still accepts a plausible value", async () => {
    await submitWithHours("7.5");

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ hours: 7.5, date: "2026-09-30" }),
      expect.anything(),
    );
  });
});
