import { format } from "date-fns";
import { toast } from "sonner";
import type { WorkLogFilterEmployee } from "./work-log-filter-actions";

interface WorkLogExportEntry {
  date: string;
  description?: string | null;
  workLink?: string | null;
  status?: string | null;
  ticket?: { id: number; title: string; ticketNumber: number; project?: { id: number; name: string; key: string } | null } | null;
}

interface LeaveRequest {
  status: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  leaveType?: { name: string } | null;
}

export async function exportWorkLogsToXlsx({
  days,
  logs,
  leaveRequests,
  selectedUserId,
  allEmployees,
  quarter,
  year,
  filterDay,
}: {
  days: Date[];
  logs: WorkLogExportEntry[] | undefined;
  leaveRequests: LeaveRequest[];
  selectedUserId: string | undefined;
  allEmployees: WorkLogFilterEmployee[];
  quarter: number;
  year: number;
  filterDay: (date: Date) => boolean;
}): Promise<void> {
  const getLeaveForDate = (dateStr: string): LeaveRequest | undefined =>
    leaveRequests.find((r) => r.startDate <= dateStr && r.endDate >= dateStr);

  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Work Logs");

    const selectedEmp = selectedUserId
      ? allEmployees.find((e) => e.id === selectedUserId)
      : null;
    const employeeName = selectedEmp
      ? `${selectedEmp.firstName ?? ""} ${selectedEmp.lastName ?? ""}`.trim()
      : "My";

    sheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Day", key: "day", width: 12 },
      { header: "Hours", key: "hours", width: 8 },
      { header: "Description", key: "description", width: 50 },
      { header: "Status", key: "status", width: 14 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

    const filteredDays = days.filter(filterDay);
    for (const date of filteredDays) {
      const dateStr = format(date, "yyyy-MM-dd");
      const log = logs?.find((l) => l.date === dateStr);
      const leave = getLeaveForDate(dateStr);
      const row = sheet.addRow({
        date: format(date, "dd MMM yyyy"),
        day: format(date, "EEEE"),
        hours: log?.ticket ? "" : log?.description ? "8" : leave ? "" : "",
        description: leave
          ? `On Leave — ${leave.leaveType?.name ?? "Leave"}${leave.reason ? `: ${leave.reason}` : ""}`
          : log?.description || "",
        status: leave
          ? "ON LEAVE"
          : log?.status === "PENDING"
            ? "LOGGED"
            : log?.status || (log?.description ? "LOGGED" : ""),
      });
      if (leave) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF3CD" },
        };
        row.font = { color: { argb: "FF856404" } };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-logs-${employeeName}-Q${quarter}-${year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Work logs exported successfully");
  } catch {
    toast.error("Failed to export work logs");
  }
}
