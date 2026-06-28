import { serverApiClient } from "@/lib/api/server-client";
import type { ExportFilters, ExportExpense } from "./types";

interface BackendExportRow {
  expenseDate: string;
  category: string | null;
  amount: string;
  description: string | null;
  status: string | null;
  rejectionReason: string | null;
  userName: string | null;
  userEmail: string | null;
}

const VALID_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED", "PAID"]);

export async function fetchExpensesForExport(
  filters: ExportFilters
): Promise<ExportExpense[]> {
  const params: Record<string, unknown> = {};

  if (filters.month && !filters.startDate && !filters.endDate) {
    const [year, month] = filters.month.split("-");
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    params.startDate = `${year}-${month}-01`;
    params.endDate = `${year}-${month}-${lastDay.toString().padStart(2, "0")}`;
  } else {
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
  }

  if (filters.status) {
    const candidate = Array.isArray(filters.status)
      ? filters.status.find((s) => s !== "all" && VALID_STATUSES.has(s))
      : filters.status !== "all" && VALID_STATUSES.has(filters.status)
        ? filters.status
        : undefined;
    if (candidate) params.status = candidate;
  }

  const rows = await serverApiClient.get<BackendExportRow[]>(
    "/hr/expenses/export-data",
    params
  );

  return rows.map((r) => ({
    id: 0,
    expenseDate: r.expenseDate,
    category: r.category ?? "",
    description: r.description,
    merchant: null,
    amount: r.amount,
    status: r.status,
    paymentMethod: null,
    userName: r.userName ?? "Unknown",
    userEmail: r.userEmail ?? "",
    approverName: null,
    approvedAt: null,
    rejectionReason: r.rejectionReason,
    paidAt: null,
    transactionRef: null,
  }));
}

export function fetchExportStats(expenseList: ExportExpense[]) {
  let totalAmount = 0;
  let pendingAmount = 0;
  let approvedAmount = 0;
  let paidAmount = 0;
  let rejectedAmount = 0;

  for (const e of expenseList) {
    const amount = parseFloat(e.amount) || 0;
    totalAmount += amount;
    if (e.status === "PENDING") pendingAmount += amount;
    else if (e.status === "APPROVED") approvedAmount += amount;
    else if (e.status === "PAID") paidAmount += amount;
    else if (e.status === "REJECTED") rejectedAmount += amount;
  }

  return {
    totalAmount,
    pendingAmount,
    approvedAmount,
    paidAmount,
    rejectedAmount,
    totalCount: expenseList.length,
  };
}
