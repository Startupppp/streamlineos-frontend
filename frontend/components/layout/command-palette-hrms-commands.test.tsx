import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { Command, CommandList } from "@/components/ui/command";
import { useCan } from "@/hooks/api/access";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
} from "@/hooks/api/hr/attendance";
import { usePayrollRuns } from "@/hooks/api/payroll/runs";
import { useHrmsCommands } from "./command-palette-hrms-commands";
import { CommandPaletteActionsGroup } from "./command-palette-actions-group";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));
jest.mock("@/hooks/api/hr/attendance", () => ({
  useHrAttendanceStatus: jest.fn(),
  useHrCheckIn: jest.fn(),
  useHrCheckOut: jest.fn(),
}));
jest.mock("@/hooks/api/payroll/runs", () => ({
  usePayrollRuns: jest.fn(),
}));

const mockedCan = useCan as jest.Mock;
const checkInMutate = jest.fn();
const checkOutMutate = jest.fn();

function grant(keys: string[]) {
  mockedCan.mockImplementation((key: string) => keys.includes(key));
}

function availableLabels(keys: string[], onSelect = jest.fn()) {
  grant(keys);
  const { result } = renderHook(() => useHrmsCommands(onSelect));
  return result.current.filter((command) => command.isAvailable).map((c) => c.label);
}

beforeEach(() => {
  (useHrAttendanceStatus as jest.Mock).mockReturnValue({ data: { status: "NOT_CHECKED_IN" } });
  (useHrCheckIn as jest.Mock).mockReturnValue({ mutate: checkInMutate });
  (useHrCheckOut as jest.Mock).mockReturnValue({ mutate: checkOutMutate });
  (usePayrollRuns as jest.Mock).mockReturnValue({
    data: {
      data: [
        { id: 12, month: "2026-10", status: "DRAFT" },
        { id: 11, month: "2026-09", status: "PAID" },
      ],
    },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("P2-003 — palette actions are permission-filtered", () => {
  it("offers nothing to an actor with no HRMS permission", () => {
    expect(availableLabels([])).toEqual([]);
  });

  it("offers an employee only their own self-service actions", () => {
    expect(availableLabels(["self:leaves", "self:attendance"])).toEqual([
      "Request leave",
      "Check in",
    ]);
  });

  it("hides Check in until today's attendance status is known", () => {
    (useHrAttendanceStatus as jest.Mock).mockReturnValue({ data: undefined });
    expect(availableLabels(["self:attendance"])).toEqual([]);
  });

  it("offers Check out to someone already clocked in", () => {
    (useHrAttendanceStatus as jest.Mock).mockReturnValue({ data: { status: "PRESENT" } });
    expect(availableLabels(["self:attendance"])).toEqual(["Check out"]);
  });

  it("gates each admin action on its own catalog key", () => {
    expect(availableLabels(["payroll:salaries:update"])).toEqual(["Add salary"]);
    expect(availableLabels(["hr:exit:create"])).toEqual(["Start exit"]);
    expect(availableLabels(["payroll:payslips:manage"])).toEqual([
      "Release payslips · 2026-09",
    ]);
  });

  it("hides Release payslips when no run is PAID", () => {
    (usePayrollRuns as jest.Mock).mockReturnValue({
      data: { data: [{ id: 12, month: "2026-10", status: "DRAFT" }] },
    });
    expect(availableLabels(["payroll:payslips:manage"])).toEqual([]);
  });

  it("navigates instead of mutating for leave, payslips and exit", () => {
    const onSelect = jest.fn();
    grant(["self:leaves", "payroll:payslips:manage", "hr:exit:create"]);
    const { result } = renderHook(() => useHrmsCommands(onSelect));

    for (const id of ["hrms-request-leave", "hrms-release-payslips", "hrms-start-exit"])
      void result.current.find((c) => c.id === id)?.execute();

    expect(onSelect.mock.calls).toEqual([
      ["/me/time-off?create=1"],
      ["/payroll/runs/11"],
      ["/hr/exit"],
    ]);
  });
});

describe("P2-003 — check-in needs an explicit confirm inside the palette", () => {
  it("arms on the first Enter and mutates only on the second", () => {
    grant(["self:attendance"]);
    const onConfirmed = jest.fn();
    const { result } = renderHook(() => useHrmsCommands(jest.fn()));
    const commands = result.current.filter((c) => c.isAvailable);

    render(
      <Command>
        <CommandList>
          <CommandPaletteActionsGroup commands={commands} onConfirmed={onConfirmed} />
        </CommandList>
      </Command>,
    );

    fireEvent.click(screen.getByText("Check in"));
    expect(checkInMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Press Enter again to confirm")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Check in"));
    expect(checkInMutate).toHaveBeenCalledTimes(1);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("finds Request leave by a Hindi synonym", () => {
    grant(["self:leaves"]);
    const { result } = renderHook(() => useHrmsCommands(jest.fn()));
    const leave = result.current.find((c) => c.id === "hrms-request-leave");
    expect(leave?.keywords).toEqual(expect.arrayContaining(["छुट्टी", "time off", "leave"]));
  });
});
