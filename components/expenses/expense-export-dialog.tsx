"use client";

import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { exportExpenses, ExportFilters, ExportResult } from "@/server/actions/expense-export";
import { ExpenseFilters } from "@/server/actions/expense-query";
import * as XLSX from "xlsx";

interface ExpenseExportDialogProps {
  filters: ExpenseFilters;
  trigger?: React.ReactNode;
}

type ExportFormat = "csv" | "xlsx" | "pdf";

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    value: "csv",
    label: "CSV",
    description: "Comma-separated values, compatible with Excel and Google Sheets",
    icon: File,
  },
  {
    value: "xlsx",
    label: "Excel (XLSX)",
    description: "Microsoft Excel format with multiple sheets and formatting",
    icon: FileSpreadsheet,
  },
  {
    value: "pdf",
    label: "PDF Report",
    description: "Formatted report with summary, charts, and detailed expenses",
    icon: FileText,
  },
];

export function ExpenseExportDialog({
  filters,
  trigger,
}: ExpenseExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const exportFilters: ExportFilters = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    month: filters.month,
    categoryId: filters.categoryId,
    category: filters.category,
    status: filters.status,
    userId: filters.userId,
    paymentMethod: filters.paymentMethod,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    search: filters.search,
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);

    try {
      const result = await exportExpenses({
        format,
        filters: exportFilters,
        includeHeader,
        includeTotals,
        title: "Expense Report",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      switch (result.format) {
        case "csv":
          downloadCSV(result.data, result.filename);
          break;
        case "xlsx":
          downloadXLSX(result.data, result.filename);
          break;
        case "pdf":
          downloadPDF(result.data, result.filename);
          break;
      }

      setExportComplete(true);
      toast.success("Export downloaded successfully!");
      setTimeout(() => {
        setOpen(false);
        setExportComplete(false);
      }, 1500);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export expenses");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadXLSX = (
    data: NonNullable<Extract<ExportResult, { format: "xlsx" }>["data"]>,
    filename: string
  ) => {
    const workbook = XLSX.utils.book_new();
    data.sheets.forEach((sheet) => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
      const colWidths = sheet.data[0]?.map((_, colIndex) => {
        const maxLength = Math.max(
          ...sheet.data.map((row) => String(row[colIndex] || "").length)
        );
        return { wch: Math.min(Math.max(maxLength, 10), 50) };
      });
      worksheet["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    XLSX.writeFile(workbook, filename);
  };

  const downloadPDF = (
    data: NonNullable<Extract<ExportResult, { format: "pdf" }>["data"]>,
    filename: string
  ) => {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1a1a1a;
          }
          .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 { font-size: 28px; margin-bottom: 8px; }
          .header p { color: #666; font-size: 14px; }
          .filters {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            font-size: 13px;
          }
          .filters-grid { display: flex; flex-wrap: wrap; gap: 20px; }
          .filter-item { }
          .filter-label { color: #666; margin-bottom: 2px; }
          .filter-value { font-weight: 600; }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #0066cc;
          }
          .summary-card.pending { border-color: #f59e0b; }
          .summary-card.approved { border-color: #10b981; }
          .summary-card.paid { border-color: #3b82f6; }
          .summary-card.rejected { border-color: #ef4444; }
          .summary-label { font-size: 12px; color: #666; margin-bottom: 4px; }
          .summary-value { font-size: 22px; font-weight: 700; }
          .summary-count { font-size: 12px; color: #888; margin-top: 4px; }
          .section { margin-bottom: 30px; }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ddd;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #f5f5f5;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #eee;
          }
          tr:nth-child(even) { background: #fafafa; }
          .text-right { text-align: right; }
          .status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
          }
          .status.PENDING { background: #fef3c7; color: #92400e; }
          .status.APPROVED { background: #d1fae5; color: #065f46; }
          .status.PAID { background: #dbeafe; color: #1e40af; }
          .status.REJECTED { background: #fee2e2; color: #991b1b; }
          .category-bar {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .bar {
            height: 8px;
            background: #0066cc;
            border-radius: 4px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #888;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.title}</h1>
          <p>Generated on ${data.generatedAt}</p>
        </div>

        <div class="filters">
          <div class="filters-grid">
            <div class="filter-item">
              <div class="filter-label">Period</div>
              <div class="filter-value">${data.filters.period}</div>
            </div>
            <div class="filter-item">
              <div class="filter-label">Status</div>
              <div class="filter-value">${data.filters.status}</div>
            </div>
            <div class="filter-item">
              <div class="filter-label">Category</div>
              <div class="filter-value">${data.filters.category}</div>
            </div>
            <div class="filter-item">
              <div class="filter-label">Total Records</div>
              <div class="filter-value">${data.summary.totalCount}</div>
            </div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="summary-label">Total Amount</div>
            <div class="summary-value">${formatCurrency(data.summary.totalAmount)}</div>
            <div class="summary-count">${data.summary.totalCount} expenses</div>
          </div>
          <div class="summary-card pending">
            <div class="summary-label">Pending Approval</div>
            <div class="summary-value">${formatCurrency(data.summary.pendingAmount)}</div>
          </div>
          <div class="summary-card approved">
            <div class="summary-label">Approved</div>
            <div class="summary-value">${formatCurrency(data.summary.approvedAmount)}</div>
          </div>
          <div class="summary-card paid">
            <div class="summary-label">Paid</div>
            <div class="summary-value">${formatCurrency(data.summary.paidAmount)}</div>
          </div>
          <div class="summary-card rejected">
            <div class="summary-label">Rejected</div>
            <div class="summary-value">${formatCurrency(data.summary.rejectedAmount)}</div>
          </div>
        </div>

        ${data.byCategory.length > 0 ? `
        <div class="section">
          <div class="section-title">Expenses by Category</div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th class="text-right">Count</th>
                <th class="text-right">Amount</th>
                <th>Distribution</th>
              </tr>
            </thead>
            <tbody>
              ${data.byCategory.map(cat => `
                <tr>
                  <td>${cat.category}</td>
                  <td class="text-right">${cat.count}</td>
                  <td class="text-right">${formatCurrency(cat.amount)}</td>
                  <td>
                    <div class="category-bar">
                      <div class="bar" style="width: ${cat.percentage}%"></div>
                      <span>${cat.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section page-break">
          <div class="section-title">Expense Details</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Merchant</th>
                <th>Employee</th>
                <th class="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.expenses.map(exp => `
                <tr>
                  <td>${exp.date}</td>
                  <td>${exp.category}</td>
                  <td>${exp.description}</td>
                  <td>${exp.merchant}</td>
                  <td>${exp.employee}</td>
                  <td class="text-right">${formatCurrency(exp.amount)}</td>
                  <td><span class="status ${exp.status}">${exp.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>This report was generated automatically. For questions, please contact your administrator.</p>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Expenses</DialogTitle>
          <DialogDescription>
            Export your filtered expenses to your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v: string) => setFormat(v as ExportFormat)}
              className="grid gap-3"
            >
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    format === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Header</Label>
                <p className="text-sm text-muted-foreground">
                  Add title, date, and filter information
                </p>
              </div>
              <Switch
                checked={includeHeader}
                onCheckedChange={setIncludeHeader}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Totals</Label>
                <p className="text-sm text-muted-foreground">
                  Add summary totals at the end
                </p>
              </div>
              <Switch
                checked={includeTotals}
                onCheckedChange={setIncludeTotals}
              />
            </div>
          </div>

          
          {Object.values(exportFilters).some((v) => v !== undefined && v !== "") && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-1">Applied Filters:</p>
              <ul className="text-muted-foreground space-y-1">
                {exportFilters.startDate && (
                  <li>
                    Date: {exportFilters.startDate}
                    {exportFilters.endDate && ` to ${exportFilters.endDate}`}
                  </li>
                )}
                {exportFilters.status && exportFilters.status !== "all" && (
                  <li>Status: {exportFilters.status}</li>
                )}
                {exportFilters.category && (
                  <li>Category: {exportFilters.category}</li>
                )}
                {exportFilters.paymentMethod && (
                  <li>Payment: {exportFilters.paymentMethod}</li>
                )}
                {exportFilters.search && (
                  <li>Search: "{exportFilters.search}"</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || exportComplete}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : exportComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Done!
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
