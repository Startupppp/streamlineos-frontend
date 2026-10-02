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
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/storage/file-upload";
import Link from "next/link";

import { isWeekend } from "./leave-date-helpers";
import { leaveTypeOptionLabel } from "./leave-type-option-label";
import {
  LeaveBalancePreview,
  LeaveBalanceUnavailable,
  LeaveLimitError,
  LeaveOverlapBlocked,
  LeaveRequestHint,
} from "./leave-balance-preview";
import { LeaveHalfDayFields, LeavePriorityField } from "./leave-request-policy-fields";
import type { LeaveFormValues } from "./leave-request-schema";
import type { LeaveRequestValidation } from "./use-leave-request-validation";
import type { LeaveType, LeaveBalance } from "./components/leaves-shared";
import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";
import { ApprovalRoutePanel, summarizeApprovalRoute } from "@/components/shared/approval-route-panel";
import { useNoApproverFix } from "./no-approver-fix";

const FIELD_LABEL_CLASS =
  "text-xs font-semibold text-foreground/80 uppercase tracking-wider";

interface LeaveRequestFormFieldsProps {
  form: UseFormReturn<LeaveFormValues>;
  leaveTypes: LeaveType[];
  approvalRoute: ApprovalRoute | undefined;
  balances: LeaveBalance[];
  leaveStartBounds: { fromDate: Date; fromYear: number; toYear: number };
  leaveEndBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  onStartDateChange: (value: string) => void;
  onAttachmentUpload: (key: string) => void;
  validation: LeaveRequestValidation;
}

export function LeaveRequestFormFields({
  form,
  leaveTypes,
  approvalRoute,
  leaveStartBounds,
  leaveEndBounds,
  onStartDateChange,
  onAttachmentUpload,
  validation,
}: LeaveRequestFormFieldsProps) {
  const noApproverAction = useNoApproverFix(approvalRoute);

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="leaveTypeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={FIELD_LABEL_CLASS}>Leave Type</FormLabel>
            {leaveTypes.length === 0 ? (
              <div className="space-y-2 rounded-lg border border-dashed border-status-warning-rule bg-status-warning-surface px-3 py-3">
                <p className="text-sm font-medium text-foreground">
                  No leave types configured
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Set up leave types before employees can request leave.
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
                      {leaveTypeOptionLabel(t)}
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
        <p className={FIELD_LABEL_CLASS}>Date Range (IST)</p>
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

      {validation.overlapMessage ? (
        <LeaveOverlapBlocked message={validation.overlapMessage} />
      ) : null}

      <LeaveHalfDayFields form={form} />
      <LeavePriorityField form={form} />

      <ApprovalRoutePanel
        route={approvalRoute && summarizeApprovalRoute(approvalRoute)}
        isLoading={false}
        error={null}
        unownedAction={noApproverAction}
      />

      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={FIELD_LABEL_CLASS}>Reason</FormLabel>
            <FormControl>
              <Textarea
                placeholder="E.g. Family function, Doctor appointment..."
                className="min-h-[80px] resize-none text-sm"
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-1.5">
        <label className={`${FIELD_LABEL_CLASS} block`}>
          Attach Document{" "}
          <span className="font-normal normal-case tracking-normal text-muted-foreground">
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

      {validation.balancePreview ? (
        <LeaveBalancePreview
          preview={validation.balancePreview}
          requestedDays={validation.requestedDays}
        />
      ) : null}

      {validation.balanceUnavailableFor ? (
        <LeaveBalanceUnavailable typeName={validation.balanceUnavailableFor} />
      ) : null}

      {validation.lopHint ? <LeaveRequestHint message={validation.lopHint} /> : null}

      {validation.dayLimitError ? (
        <LeaveLimitError message={validation.dayLimitError} />
      ) : null}
    </div>
  );
}
