"use client";

import { useCallback } from "react";
import { AlertCircle, CalendarIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExpenseExportOptionsProps {
  dateFrom: string;
  dateTo: string;
  dateFromError: string | null;
  dateToError: string | null;
  exportStatus: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onStatusChange: (status: string) => void;
}

export function ExpenseExportOptions({
  dateFrom,
  dateTo,
  dateFromError,
  dateToError,
  exportStatus,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
}: ExpenseExportOptionsProps) {
  const handleClearDates = useCallback(() => {
    onDateFromChange("");
    onDateToChange("");
  }, [onDateFromChange, onDateToChange]);

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
          <button
            type="button"
            onClick={handleClearDates}
            className="text-xs text-primary hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

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
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
