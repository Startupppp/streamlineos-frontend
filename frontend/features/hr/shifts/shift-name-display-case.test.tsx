/**
 * A shift template typed as "morning shift" must read "Morning Shift" wherever
 * it is shown, and a name the author capitalised deliberately must survive.
 *
 * Formatting is applied at the display boundary, not on write: the stored name
 * stays exactly what was typed, so existing rows read correctly with no
 * migration and no backfill, and the edit form still shows the real value.
 */
import { render, screen } from "@testing-library/react";
import { ShiftTemplatesTab } from "./shift-templates-tab";
import type { ShiftTemplate } from "@/hooks/api/hr/shifts";

const shifts: ShiftTemplate[] = [
  {
    id: 1,
    orgId: "org-1",
    name: "morning shift",
    type: "FIXED",
    startTime: "09:00:00",
    endTime: "18:00:00",
    breakMinutes: 60,
    isNightShift: false,
    gracePeriodMinutes: 15,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    orgId: "org-1",
    name: "2nd shift IST",
    type: "ROTATIONAL",
    startTime: "14:00:00",
    endTime: "23:00:00",
    breakMinutes: 30,
    isNightShift: false,
    gracePeriodMinutes: 10,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

jest.mock("@/hooks/api/hr/shifts", () => ({
  useHrShifts: () => ({ data: shifts, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useDeleteShift: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: React.ComponentProps<"div">) => <div {...rest}>{children}</div> },
}));

describe("shift template name display case", () => {
  it("title-cases an all-lowercase shift name", () => {
    render(<ShiftTemplatesTab canManage onEdit={jest.fn()} />);
    expect(screen.getByText("Morning Shift")).toBeInTheDocument();
  });

  it("leaves an initialism in the name alone", () => {
    render(<ShiftTemplatesTab canManage onEdit={jest.fn()} />);
    expect(screen.getByText("2nd Shift IST")).toBeInTheDocument();
  });

  it("uses the same formatted name in the manage controls", () => {
    render(<ShiftTemplatesTab canManage onEdit={jest.fn()} />);
    expect(screen.getByLabelText("Edit Morning Shift")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete Morning Shift")).toBeInTheDocument();
  });
});
