"use server";

import { logger } from "@/lib/logger";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import { isAuthError } from "@/lib/auth-types";
import { getTodayString } from "@/lib/date-utils";
import { serverApiClient } from "@/lib/api/server-client";
import {
  buildExportConditions,
  fetchExpensesForExport,
  fetchExportStats,
} from "./query";
import { generateCSVContent } from "./csv-export";
import { generateXLSXData, generatePDFData } from "./data-generators";
import type { ExportOptions, ExportResult, ExportFilters } from "./types";

export async function exportExpenses(
  options: ExportOptions,
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
      userId,
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
  sendTo: "CEO" | "HR" | "BOTH" = "BOTH",
): Promise<{ success: boolean; error?: string }> {
  try {
    await serverApiClient.post<{ success: boolean }>(
      "/hr/expenses/email-report",
      { filters, sendTo },
    );
    return { success: true };
  } catch (error) {
    logger.error("Failed to email expense report", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
