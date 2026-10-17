import ExcelJS from "exceljs";

import {
  buildLeaveExportBlob,
  leaveExportViewFor,
} from "@/features/hr/leaves/leave-export";
import type { LeaveRequest } from "@/features/hr/leaves/components/leaves-types";

/**
 * V-048. The export behaviour is right — it exports the tab in front of you,
 * always writes a header row, toasts the count and never fails silently — but
 * only its wiring was covered. These read the workbook back, so a column that
 * silently stopped being written would be caught.
 */
function request(
  id: number,
  status: string,
  overrides: Partial<LeaveRequest> = {},
): LeaveRequest {
  return {
    id,
    startDate: "2026-10-05",
    endDate: "2026-10-06",
    status,
    priority: "MEDIUM",
    reason: "Family commitment",
    createdAt: "2026-09-15T00:00:00.000Z",
    leaveType: { name: "Casual Leave" },
    approver: null,
    user: {
      id: `usr-${id}`,
      name: `QA Person${id}`,
      firstName: "QA",
      lastName: `Person${id}`,
      email: `person${id}@example.test`,
      image: null,
    },
    ...overrides,
  } as LeaveRequest;
}

async function readBack(blob: Blob) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  const sheet = workbook.worksheets[0];
  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values = row.values as unknown[];
    rows.push(values.slice(1).map((v) => String(v ?? "")));
  });
  return { sheet, rows };
}

describe("buildLeaveExportBlob", () => {
  it("serialises pending, approved and rejected rows with their status", async () => {
    const view = leaveExportViewFor(
      "my-leaves",
      [request(1, "PENDING"), request(2, "APPROVED"), request(3, "REJECTED")],
      [],
    );

    const { sheet, rows } = await readBack(await buildLeaveExportBlob(view));

    expect(sheet.name).toBe("Leave Requests");
    expect(rows).toHaveLength(4); // header + three rows
    expect(rows[0]).toEqual([
      "Type",
      "From",
      "To",
      "Priority",
      "Status",
      "Reason",
      "Requested On",
    ]);
    expect(rows.slice(1).map((r) => r[4])).toEqual([
      "PENDING",
      "APPROVED",
      "REJECTED",
    ]);
    expect(rows[1][1]).toBe("2026-10-05");
  });

  it("a team export prefixes the employee column", async () => {
    const view = leaveExportViewFor(
      "approvals",
      [],
      [request(7, "PENDING"), request(8, "APPROVED")],
    );

    const { sheet, rows } = await readBack(await buildLeaveExportBlob(view));

    expect(sheet.name).toBe("Team Leave Requests");
    expect(rows[0][0]).toBe("Employee");
    expect(rows[0]).toHaveLength(8);
    expect(rows[1][0]).toBe("QA Person7");
    expect(rows[2][0]).toBe("QA Person8");
    // The personal export must NOT carry it, or the two column sets have drifted.
    const mine = await readBack(
      await buildLeaveExportBlob(leaveExportViewFor("my-leaves", [request(1, "PENDING")], [])),
    );
    expect(mine.rows[0][0]).toBe("Type");
  });

  it("writes a header row even when nothing matched the view", async () => {
    const { rows } = await readBack(
      await buildLeaveExportBlob(leaveExportViewFor("my-leaves", [], [])),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe("Type");
  });
});
