"use client";

import { useCallback } from "react";
import { AlertCircle, CalendarIcon, File, FileSpreadsheet, FileText } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Employee } from "@/types/hr";
import type { ExpenseFilters } from "@/types/hr/expenses";

export type ExpenseExportFormat = "csv" | "xlsx" | "pdf";

function isExpenseExportFormat(value: string): value is ExpenseExportFormat {
  return value === "csv" || value === "xlsx" || value === "pdf";
}

const FORMAT_OPTIONS: {
  value: ExpenseExportFormat;
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

interface ExpenseExportOptionsProps {
  dateFrom: string;
  dateTo: string;
  dateFromError: string | null;
  dateToError: string | null;
  exportStatus: string;
  exportCategory: string;
  exportPayment: string;
  exportUserId: string;
  format: ExpenseExportFormat;
  includeHeader: boolean;
  includeTotals: boolean;
  categories: Array<{ id: number; name: string }>;
  paymentMethods: string[];
  employees: Employee[];
  exportFilters: ExpenseFilters;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onPaymentChange: (paymentMethod: string) => void;
  onUserChange: (userId: string) => void;
  onFormatChange: (format: ExpenseExportFormat) => void;
  onIncludeHeaderChange: (include: boolean) => void;
  onIncludeTotalsChange: (include: boolean) => void;
}

export function ExpenseExportOptions({
  dateFrom,
  dateTo,
  dateFromError,
  dateToError,
  exportStatus,
  exportCategory,
  exportPayment,
  exportUserId,
  format,
  includeHeader,
  includeTotals,
  categories,
  paymentMethods,
  employees,
  exportFilters,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
  onCategoryChange,
  onPaymentChange,
  onUserChange,
  onFormatChange,
  onIncludeHeaderChange,
  onIncludeTotalsChange,
}: ExpenseExportOptionsProps) {
  const handleClearDates = useCallback(() => {
    onDateFromChange("");
    onDateToChange("");
  }, [onDateFromChange, onDateToChange]);
  const handleFormatChange = useCallback(
    (nextFormat: string) => {
      if (isExpenseExportFormat(nextFormat)) onFormatChange(nextFormat);
    },
    [onFormatChange],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          Date Range
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="expense-date-from"
              className="block text-xs text-muted-foreground"
            >
              From
            </Label>
            <DatePicker
              id="expense-date-from"
              value={dateFrom}
              onChange={onDateFromChange}
              placeholder="From date"
              toDate={new Date()}
            />
            {dateFromError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dateFromError}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="expense-date-to"
              className="block text-xs text-muted-foreground"
            >
              To
            </Label>
            <DatePicker
              id="expense-date-to"
              value={dateTo}
              onChange={onDateToChange}
              placeholder="To date"
              toDate={new Date()}
            />
            {dateToError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dateToError}
              </p>
            )}
          </div>
        </div>
        {(dateFrom || dateTo) && !dateFromError && !dateToError && (
          <button onClick={handleClearDates} className="text-xs text-primary hover:underline">
            Clear dates
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label
            id="expense-export-status-label"
            className="mb-1 block text-xs text-muted-foreground"
          >
            Status
          </Label>
          <Select value={exportStatus} onValueChange={onStatusChange}>
            <SelectTrigger aria-labelledby="expense-export-status-label">
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
          <Label
            id="expense-export-category-label"
            className="mb-1 block text-xs text-muted-foreground"
          >
            Category
          </Label>
          <Select value={exportCategory} onValueChange={onCategoryChange}>
            <SelectTrigger aria-labelledby="expense-export-category-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label
            id="expense-export-payment-label"
            className="mb-1 block text-xs text-muted-foreground"
          >
            Payment
          </Label>
          <Select value={exportPayment} onValueChange={onPaymentChange}>
            <SelectTrigger aria-labelledby="expense-export-payment-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {paymentMethods.map((paymentMethod) => (
                <SelectItem key={paymentMethod} value={paymentMethod}>
                  {paymentMethod}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {employees.length > 0 && (
        <div>
          <Label
            id="expense-export-user-label"
            className="mb-1 block text-xs text-muted-foreground"
          >
            Spent By
          </Label>
          <Select value={exportUserId} onValueChange={onUserChange}>
            <SelectTrigger aria-labelledby="expense-export-user-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees
                .filter((employee) => employee.isActive)
                .map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {[employee.firstName, employee.lastName].filter(Boolean).join(" ") ||
                      employee.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        <Label id="expense-export-format-label" className="text-sm font-medium">
          Export Format
        </Label>
        <RadioGroup
          value={format}
          onValueChange={handleFormatChange}
          className="grid gap-3"
          aria-labelledby="expense-export-format-label"
        >
          {FORMAT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                format === option.value
                  ? "border-brand-core bg-primary/5"
                  : "border-border"
              }`}
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div className="space-y-0.5">
            <Label id="expense-include-header-label" className="text-sm font-medium">
              Include Header
            </Label>
            <p className="text-xs text-muted-foreground">Add title, date, and filter information</p>
          </div>
          <Switch
            checked={includeHeader}
            onCheckedChange={onIncludeHeaderChange}
            aria-labelledby="expense-include-header-label"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div className="space-y-0.5">
            <Label id="expense-include-totals-label" className="text-sm font-medium">
              Include Totals
            </Label>
            <p className="text-xs text-muted-foreground">Add summary totals at the end</p>
          </div>
          <Switch
            checked={includeTotals}
            onCheckedChange={onIncludeTotalsChange}
            aria-labelledby="expense-include-totals-label"
          />
        </div>
      </div>

      {Object.values(exportFilters).some(
        (filterValue) => filterValue !== undefined && filterValue !== "",
      ) && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="mb-2 text-sm font-medium">Applied Filters:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {exportFilters.startDate && (
              <li>
                Date: {exportFilters.startDate}
                {exportFilters.endDate && ` to ${exportFilters.endDate}`}
              </li>
            )}
            {exportFilters.status && exportFilters.status !== "all" && (
              <li>Status: {exportFilters.status}</li>
            )}
            {exportFilters.category && <li>Category: {exportFilters.category}</li>}
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
  );
}
