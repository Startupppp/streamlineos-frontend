"use client";

import { useState, useRef, useCallback } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  Loader2,
  CheckCircle2,
  Mail,
  CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { exportExpenses, emailExpenseReport, ExportFilters, ExportResult } from "@/server/actions/expense-export";
import { ExpenseFilters } from "@/server/actions/expense-query";
import ExcelJS from "exceljs";
import { formatCurrencyFull } from "@/lib/format-utils";

type PdfData = NonNullable<Extract<ExportResult, { format: "pdf" }>["data"]>;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "#fef3c7", color: "#92400e" },
  APPROVED: { bg: "#d1fae5", color: "#065f46" },
  PAID: { bg: "#dbeafe", color: "#1e40af" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b" },
};

const SUMMARY_BORDER_COLORS: Record<string, string> = {
  total: "#0066cc",
  pending: "#f59e0b",
  approved: "#10b981",
  paid: "#3b82f6",
  rejected: "#ef4444",
};

const formatInr = (amount: number) => formatCurrencyFull(amount);

const cellStyle: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
  fontSize: "12px",
};

const thStyle: React.CSSProperties = {
  ...cellStyle,
  background: "#f5f5f5",
  fontWeight: 600,
  borderBottom: "2px solid #ddd",
  textAlign: "left",
};

function SummaryCard({
  label,
  value,
  count,
  borderColor,
}: {
  label: string;
  value: string;
  count?: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        background: "#f8f9fa",
        padding: "20px",
        borderRadius: "8px",
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700 }}>{value}</div>
      {count && <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{count}</div>}
    </div>
  );
}

function ExpensePdfContent({ data }: { data: PdfData }) {
  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "40px",
        color: "#1a1a1a",
        width: "800px",
        background: "#ffffff",
      }}
    >
      <div style={{ borderBottom: "2px solid #333", paddingBottom: "20px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>{data.title}</h1>
        <p style={{ color: "#666", fontSize: "14px" }}>Generated on {data.generatedAt}</p>
      </div>

      <div
        style={{
          background: "#f5f5f5",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "30px",
          fontSize: "13px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {[
            { label: "Period", value: data.filters.period },
            { label: "Status", value: data.filters.status },
            { label: "Category", value: data.filters.category },
            { label: "Total Records", value: String(data.summary.totalCount) },
          ].map((f) => (
            <div key={f.label}>
              <div style={{ color: "#666", marginBottom: "2px" }}>{f.label}</div>
              <div style={{ fontWeight: 600 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        <SummaryCard
          label="Total Amount"
          value={formatInr(data.summary.totalAmount)}
          count={`${data.summary.totalCount} expenses`}
          borderColor={SUMMARY_BORDER_COLORS.total}
        />
        <SummaryCard
          label="Pending Approval"
          value={formatInr(data.summary.pendingAmount)}
          borderColor={SUMMARY_BORDER_COLORS.pending}
        />
        <SummaryCard
          label="Approved"
          value={formatInr(data.summary.approvedAmount)}
          borderColor={SUMMARY_BORDER_COLORS.approved}
        />
        <SummaryCard
          label="Paid"
          value={formatInr(data.summary.paidAmount)}
          borderColor={SUMMARY_BORDER_COLORS.paid}
        />
        <SummaryCard
          label="Rejected"
          value={formatInr(data.summary.rejectedAmount)}
          borderColor={SUMMARY_BORDER_COLORS.rejected}
        />
      </div>

      {data.byCategory.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "15px",
              paddingBottom: "8px",
              borderBottom: "1px solid #ddd",
            }}
          >
            Expenses by Category
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Category</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Count</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={thStyle}>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((cat) => (
                <tr key={cat.category}>
                  <td style={cellStyle}>{cat.category}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{cat.count}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatInr(cat.amount)}</td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          height: "8px",
                          width: `${cat.percentage}%`,
                          background: "#0066cc",
                          borderRadius: "4px",
                        }}
                      />
                      <span>{cat.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginBottom: "30px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            marginBottom: "15px",
            paddingBottom: "8px",
            borderBottom: "1px solid #ddd",
          }}
        >
          Expense Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Merchant</th>
              <th style={thStyle}>Employee</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.map((exp, idx) => {
              const statusColor = STATUS_COLORS[exp.status] ?? STATUS_COLORS.PENDING;
              return (
                <tr key={idx} style={idx % 2 === 1 ? { background: "#fafafa" } : undefined}>
                  <td style={cellStyle}>{exp.date}</td>
                  <td style={cellStyle}>{exp.category}</td>
                  <td style={cellStyle}>{exp.description}</td>
                  <td style={cellStyle}>{exp.merchant}</td>
                  <td style={cellStyle}>{exp.employee}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatInr(exp.amount)}</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: statusColor.bg,
                        color: statusColor.color,
                      }}
                    >
                      {exp.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #ddd",
          fontSize: "11px",
          color: "#888",
          textAlign: "center",
        }}
      >
        <p>This report was generated automatically. For questions, please contact your administrator.</p>
      </div>
    </div>
  );
}

interface ExpenseExportDialogProps {
  filters: ExpenseFilters;
  trigger?: React.ReactNode;
  categories?: { id: number; name: string }[];
  paymentMethods?: string[];
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
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cheque", "Other"];

export function ExpenseExportDialog({
  filters,
  trigger,
  categories = [],
  paymentMethods = PAYMENT_METHODS,
}: ExpenseExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailTarget, setEmailTarget] = useState<"CEO" | "HR" | "BOTH">("BOTH");
  const [exportComplete, setExportComplete] = useState(false);
  const [dateFrom, setDateFrom] = useState(filters.startDate || "");
  const [dateTo, setDateTo] = useState(filters.endDate || "");
  const [exportCategory, setExportCategory] = useState("all");
  const [exportPayment, setExportPayment] = useState("all");
  const [exportStatus, setExportStatus] = useState(
    filters.status && filters.status !== "all" ? String(filters.status) : "all"
  );

  const exportFilters: ExportFilters = {
    startDate: dateFrom || filters.startDate,
    endDate: dateTo || filters.endDate,
    month: filters.month,
    categoryId: filters.categoryId,
    category: exportCategory !== "all" ? exportCategory : filters.category,
    status: exportStatus !== "all" ? exportStatus : filters.status,
    userId: filters.userId,
    paymentMethod: exportPayment !== "all" ? exportPayment : filters.paymentMethod,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    search: filters.search,
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const result = await emailExpenseReport(exportFilters, emailTarget);
      const targetLabel = emailTarget === "BOTH" ? "CEO & HR" : emailTarget;
      if (result.success) {
        toast.success(`Expense report emailed to ${targetLabel} successfully!`);
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
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
          await downloadXLSX(result.data, result.filename);
          break;
        case "pdf":
          await downloadPDF(result.data, result.filename);
          break;
      }

      setExportComplete(true);
      toast.success("Export downloaded successfully!");
      setTimeout(() => {
        setOpen(false);
        setExportComplete(false);
      }, 1500);
    } catch (error) {
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

  const downloadXLSX = async (
    data: NonNullable<Extract<ExportResult, { format: "xlsx" }>["data"]>,
    filename: string
  ) => {
    const workbook = new ExcelJS.Workbook();
    data.sheets.forEach((sheet) => {
      const ws = workbook.addWorksheet(sheet.name);
      const colWidths = sheet.data[0]?.map((_, colIndex) => {
        const maxLength = Math.max(
          ...sheet.data.map((row) => String(row[colIndex] || "").length)
        );
        return Math.min(Math.max(maxLength, 10), 50);
      }) || [];
      ws.columns = colWidths.map((w) => ({ width: w }));
      for (const row of sheet.data) {
        ws.addRow(row);
      }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<PdfData | null>(null);

  const downloadPDF = useCallback(
    async (data: PdfData, filename: string) => {
      // Start loading dynamic imports in parallel with rendering
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      // Set data to trigger render of ExpensePdfContent
      setPdfData(data);

      // Wait for React to render and populate the ref, polling with a timeout
      const container = await new Promise<HTMLDivElement>((resolve, reject) => {
        let elapsed = 0;
        const interval = 50;
        const maxWait = 3000;
        const check = () => {
          if (pdfRef.current) {
            resolve(pdfRef.current);
            return;
          }
          elapsed += interval;
          if (elapsed >= maxWait) {
            reject(new Error("PDF content failed to render in time"));
            return;
          }
          setTimeout(check, interval);
        };
        // Use requestAnimationFrame for the first check to ensure paint
        requestAnimationFrame(() => setTimeout(check, interval));
      });

      try {
        const canvas = await html2canvas(container, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true,
          foreignObjectRendering: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true,
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(filename);
      } finally {
        setPdfData(null);
      }
    },
    [],
  );

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Expenses
          </SheetTitle>
          <SheetDescription>
            Export your filtered expenses to your preferred format.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs text-primary hover:underline"
              >
                Clear dates
              </button>
            )}
          </div>

          {/* Category, Status, Payment Method Filters */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
              <Select value={exportStatus} onValueChange={setExportStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
              <Select value={exportCategory} onValueChange={setExportCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Payment</Label>
              <Select value={exportPayment} onValueChange={setExportPayment}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v: string) => setFormat(v as ExportFormat)}
              className="grid gap-3"
            >
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    format === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Include Header</Label>
                <p className="text-xs text-muted-foreground">
                  Add title, date, and filter information
                </p>
              </div>
              <Switch
                checked={includeHeader}
                onCheckedChange={setIncludeHeader}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Include Totals</Label>
                <p className="text-xs text-muted-foreground">
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
            <div className="p-4 bg-muted/30 rounded-lg border text-sm">
              <p className="font-medium text-sm mb-2">Applied Filters:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
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
                  <li>Search: &ldquo;{exportFilters.search}&rdquo;</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-6 mt-2 border-t">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || exportComplete || isSendingEmail}
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
          </div>
          <div className="flex items-center gap-2">
            <Select value={emailTarget} onValueChange={(v) => setEmailTarget(v as "CEO" | "HR" | "BOTH")}>
              <SelectTrigger className="h-9 w-[130px] text-xs shrink-0">
                <Mail className="h-3.5 w-3.5 mr-1.5 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CEO">CEO Only</SelectItem>
                <SelectItem value="HR">HR Only</SelectItem>
                <SelectItem value="BOTH">CEO & HR</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleSendEmail}
              disabled={isSendingEmail || isExporting}
              className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>

    </Sheet>
    {pdfData && (
      <div
        ref={pdfRef}
        style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}
        aria-hidden="true"
      >
        <ExpensePdfContent data={pdfData} />
      </div>
    )}
    </>
  );
}
