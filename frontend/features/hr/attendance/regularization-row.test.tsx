import { render, screen } from "@testing-library/react";
import { RegularizationRow } from "./regularization-row";
import type { AttendanceRegularization } from "@/hooks/api/hr/attendance";

const base: AttendanceRegularization = {
  id: 1,
  orgId: "org-1",
  userId: "u-2",
  attendanceDate: "2026-10-15",
  requestedCheckIn: "2026-10-15T03:30:00.000Z",
  requestedCheckOut: "2026-10-15T12:30:00.000Z",
  reason: "Forgot to punch",
  status: "PENDING",
  workflowInstanceId: null,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  createdAt: "2026-10-15T13:00:00.000Z",
  updatedAt: "2026-10-15T13:00:00.000Z",
  requesterName: "Amit Shah",
  originalCheckIn: "2026-10-15T04:15:00.000Z",
  originalCheckOut: "2026-10-15T12:30:00.000Z",
};

function renderRow(row: AttendanceRegularization) {
  render(
    <ul>
      <RegularizationRow row={row} canDecide isPending={false} orgTz="Asia/Kolkata" onApply={jest.fn()} onReject={jest.fn()} />
    </ul>,
  );
}

describe("RegularizationRow change line (HR-U-019)", () => {
  it("shows how far each punch moves", () => {
    renderRow(base);
    expect(screen.getByText("Change · In −45 min · Out —")).toBeInTheDocument();
  });

  it("omits the change line when there is no original punch to compare", () => {
    renderRow({ ...base, originalCheckIn: null, originalCheckOut: null });
    expect(screen.queryByText(/^Change/)).not.toBeInTheDocument();
  });

  it("shows the requester and both the original and requested punches to the approver", () => {
    renderRow(base);
    expect(screen.getByText("Amit Shah")).toBeInTheDocument();
    expect(screen.getByText(/^Original · In/)).toBeInTheDocument();
    expect(screen.getByText(/^Requested · In/)).toBeInTheDocument();
  });

  it("says there was no punch instead of hiding the original line", () => {
    renderRow({ ...base, originalCheckIn: null, originalCheckOut: null });
    expect(screen.getByText("Original · No punch recorded")).toBeInTheDocument();
  });
});
