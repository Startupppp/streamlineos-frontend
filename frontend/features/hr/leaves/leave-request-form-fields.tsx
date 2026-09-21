"use client";

import { type UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/storage/file-upload";
import Link from "next/link";

import { isWeekend } from "./leave-date-helpers";
import { LeaveBalancePreview, LeaveLimitError } from "./leave-balance-preview";
import type { LeaveFormValues } from "./leave-request-schema";
import type { LeaveType, LeaveBalance } from "./components/leaves-shared";
import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";
import { ApprovalRoutePanel, summarizeApprovalRoute } from "@/components/shared/approval-route-panel";

interface LeaveRequestFormFieldsProps {
  form: UseFormReturn<LeaveFormValues>;
  leaveTypes: LeaveType[];
  approvalRoute: ApprovalRoute | undefined;
  balances: LeaveBalance[];
  leaveStartBounds: { fromDate: Date; fromYear: number; toYear: number };
  leaveEndBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  onStartDateChange: (value: string) => void;
  onAttachmentUpload: (key: string) => void;
  requestedDays: number;
  balancePreview: { available: number; after: number; typeName: string } | null;
  leaveDayLimitError: string | null;
}

export function LeaveRequestFormFields({
  form,
  leaveTypes,
  approvalRoute,
  leaveStartBounds,
  leaveEndBounds,
  onStartDateChange,
  onAttachmentUpload,
  requestedDays,
  balancePreview,
  leaveDayLimitError,
}: LeaveRequestFormFieldsProps) {
  const watchedHalfDay = form.watch("halfDay");

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="leaveTypeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Leave Type
            </FormLabel>
            {leaveTypes.length === 0 ? (
              <div className="space-y-2 rounded-lg border border-dashed border-status-warning-rule bg-status-warning-surface px-3 py-3">
                <p className="text-sm font-medium text-foreground">
                  No leave types configured
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Set up leave types (for example Casual, Sick, Unpaid) before
                  employees can request leave.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full sm:w-auto"
                  asChild
                >
                  <Link href="/hr/leave-policies">Configure leave types</Link>
                </Button>
              </div>
            ) : (
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent
                  position="popper"
                  className="z-[200] max-h-60 min-w-[var(--radix-select-trigger-width)]"
                >
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Date Range
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  From
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={onStartDateChange}
                    fromDate={leaveStartBounds.fromDate}
                    fromYear={leaveStartBounds.fromYear}
                    toYear={leaveStartBounds.toYear}
                    placeholder="Start date"
                    disabledDays={isWeekend}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  To
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    fromDate={leaveEndBounds.fromDate}
                    fromYear={leaveEndBounds.fromYear}
                    toYear={leaveEndBounds.toYear}
                    placeholder="End date"
                    disabledDays={isWeekend}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
        <FormField
          control={form.control}
          name="halfDay"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2.5">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-xs font-medium text-foreground !mt-0 cursor-pointer">
                Half Day Request
              </FormLabel>
            </FormItem>
          )}
        />

        {watchedHalfDay && (
          <FormField
            control={form.control}
            name="halfDayPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Period
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="AM">AM (Morning — first half)</SelectItem>
                    <SelectItem value="PM">PM (Afternoon — second half)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Priority
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="LOW">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-success-fill" />
                    Low
                  </span>
                </SelectItem>
                <SelectItem value="MEDIUM">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-warning-fill" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="HIGH">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-danger-fill" />
                    High
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <ApprovalRoutePanel route={approvalRoute && summarizeApprovalRoute(approvalRoute)} isLoading={false} error={null} />

      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Reason
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="E.g. Family function, Doctor appointment..."
                className="resize-none text-sm min-h-[80px]"
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">
          Attach Document{" "}
          <span className="normal-case font-normal text-muted-foreground tracking-normal">
            (Optional)
          </span>
        </label>
        <FileUpload
          folder="leave-attachments"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxSize={5 * 1024 * 1024}
          onUploadComplete={onAttachmentUpload}
        />
      </div>

      {balancePreview && (
        <LeaveBalancePreview preview={balancePreview} requestedDays={requestedDays} />
      )}

      {leaveDayLimitError && <LeaveLimitError message={leaveDayLimitError} />}
    </div>
  );
}
