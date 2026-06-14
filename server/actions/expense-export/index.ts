"use server";

import { db } from "@/lib/db";
import { getSessionAbility } from "@/lib/abilities-server";
import { logger } from "@/lib/logger";
import { organizations, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import { isAuthError } from "@/lib/auth-types";
import { getTodayString } from "@/lib/date-utils";
import { sendMonthlyExpenseReportEmail } from "@/lib/email";
import type { MonthlyExpenseReportRow } from "@/lib/email-templates";
import { formatCurrencyFull } from "@/lib/format-utils";
import { buildExportConditions, fetchExpensesForExport, fetchExportStats } from "./query";
import { generateCSVContent } from "./csv-export";
import { generateXLSXData, generatePDFData } from "./data-generators";
import type { ExportOptions, ExportResult, ExportFilters } from "./types";

export async function exportExpenses(
  options: ExportOptions
): Promise<ExportResult> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { success: false, error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;

  try {
    const conditions = buildExportConditions(
      options.filters,
      orgId,
      isAdmin,
      userId
    );

    const [expenseList, stats] = await Promise.all([
      fetchExpensesForExport(conditions),
      fetchExportStats(conditions),
    ]);

    const dateStr = getTodayString();

    switch (options.format) {
      case "csv": {
        const csvContent = generateCSVContent(expenseList, options, stats);
        return {
          success: true,
          format: "csv",
          data: csvContent,
          filename: `expense-report-${dateStr}.csv`,
          mimeType: "text/csv",
        };
      }

      case "xlsx": {
        const xlsxData = generateXLSXData(expenseList, options, stats);
        return {
          success: true,
          format: "xlsx",
          data: xlsxData,
          filename: `expense-report-${dateStr}.xlsx`,
        };
      }

      case "pdf": {
        const pdfData = generatePDFData(expenseList, options, stats);
        return {
          success: true,
          format: "pdf",
          data: pdfData,
          filename: `expense-report-${dateStr}.pdf`,
        };
      }

      default:
        return { success: false, error: "Invalid export format" };
    }
  } catch (error) {
    logger.error("Expense export failed", error);
    return { success: false, error: "Failed to generate export" };
  }
}

export async function emailExpenseReport(
  filters: ExportFilters,
  sendTo: "CEO" | "HR" | "BOTH" = "BOTH"
): Promise<{ success: boolean; error?: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) return { success: false, error: authResult.error };

  const { isAdmin, userId, orgId } = authResult;
  if (!isAdmin) return { success: false, error: "Only HR and CEO can send expense reports" };

  try {
    const conditions = buildExportConditions(filters, orgId, isAdmin, userId);
    const [expenseList, stats] = await Promise.all([
      fetchExpensesForExport(conditions),
      fetchExportStats(conditions),
    ]);

    if (expenseList.length === 0) return { success: false, error: "No expenses found for the selected filters" };

    const adminMembers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.orgId, orgId),
      ),
      with: { user: true },
    });

    const recipientEmails = adminMembers
      .filter((m) => {
        if (sendTo === "CEO") return m.role === "CEO";
        if (sendTo === "HR") return m.role === "HR";
        return m.role === "CEO" || m.role === "HR";
      })
      .map((m) => m.user?.email)
      .filter((e): e is string => !!e);

    if (recipientEmails.length === 0) return { success: false, error: "No CEO/HR email addresses found" };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    const periodLabel = filters.startDate && filters.endDate
      ? `${filters.startDate} to ${filters.endDate}`
      : filters.startDate
        ? `From ${filters.startDate}`
        : "All Time";

    const rows: MonthlyExpenseReportRow[] = expenseList.map((e) => ({
      employeeName: e.userName,
      category: e.category,
      amount: formatCurrencyFull(e.amount),
      currency: "INR",
      date: e.expenseDate,
      status: e.status || "PENDING",
      description: e.description || "-",
    }));

    const summary = {
      totalAmount: formatCurrencyFull(stats?.totalAmount || 0),
      totalCount: Number(stats?.totalCount) || 0,
      pendingCount: expenseList.filter((e) => e.status === "PENDING").length,
      approvedCount: expenseList.filter((e) => e.status === "APPROVED").length,
      paidCount: expenseList.filter((e) => e.status === "PAID").length,
      rejectedCount: expenseList.filter((e) => e.status === "REJECTED").length,
    };

    await sendMonthlyExpenseReportEmail(
      periodLabel,
      org?.name || "StreamlineOS",
      rows,
      summary,
      recipientEmails,
    );

    return { success: true };
  } catch (error) {
    logger.error("Failed to email expense report", error);
    return { success: false, error: "Failed to send email" };
  }
}
