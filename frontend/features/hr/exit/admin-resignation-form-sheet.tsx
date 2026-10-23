"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HrSheet } from "@/components/shared/hr-sheet";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";
import { useAdminRecordResignation } from "@/hooks/api/hr/exit";
import { getErrorMessage } from "@/lib/get-error-message";
import { RESIGNATION_REASONS } from "@/lib/constants/hr-separation";
import { adminResignationFormSchema, type AdminResignationFormValues } from "./admin-resignation-form-schema";

const NOTICE_PERIOD_DAYS = 60;

interface AdminResignationFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminResignationFormSheet({ open, onOpenChange }: AdminResignationFormSheetProps) {
  const adminRecord = useAdminRecordResignation();

  const form = useForm<AdminResignationFormValues>({
    resolver: zodResolver(adminResignationFormSchema),
    defaultValues: {
      targetUserId: "",
      reasonCategory: undefined,
      reason: "",
      lastWorkingDate: format(addDays(new Date(), NOTICE_PERIOD_DAYS), "yyyy-MM-dd"),
      willingForExitInterview: false,
      companyFeedback: "",
    },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) form.reset();
      onOpenChange(next);
    },
    [form, onOpenChange],
  );

  const handleSubmit = form.handleSubmit((values) => {
    adminRecord.mutate(
      {
        targetUserId: values.targetUserId,
        reason: values.reason,
        reasonCategory: values.reasonCategory,
        lastWorkingDate: values.lastWorkingDate,
        noticePeriodDays: NOTICE_PERIOD_DAYS,
        willingForExitInterview: values.willingForExitInterview,
        companyFeedback: values.companyFeedback || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Resignation recorded");
          onOpenChange(false);
          form.reset();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  });

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Record Resignation"
      description="Record a resignation on behalf of an employee"
      onSubmit={handleSubmit}
      submitLabel={
        <span className="flex items-center gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Record Resignation
        </span>
      }
      isPending={adminRecord.isPending}
      isDirty={form.formState.isDirty}
      onDiscard={form.reset}
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="targetUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee</FormLabel>
              <FormControl>
                <EmployeePicker
                  value={field.value || undefined}
                  onChange={field.onChange}
                  placeholder="Select employee…"
                  ariaLabel="Select employee"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reasonCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason Category</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-label="Reason Category">
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {RESIGNATION_REASONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Detailed Reason <span className="text-destructive" aria-hidden="true">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Please describe the reason for leaving…"
                  rows={4}
                  maxLength={2000}
                  className="resize-none w-full"
                  aria-describedby="admin-resignation-reason-hint"
                />
              </FormControl>
              <p id="admin-resignation-reason-hint" className="text-dense text-muted-foreground text-right">{field.value.length} / 2000 (min 50)</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastWorkingDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Working Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  dateFormat="dd MMM yyyy"
                  ariaLabel="Last Working Date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="willingForExitInterview"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <FormLabel className="text-sm font-semibold text-foreground">Willing for Exit Interview?</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Willing for exit interview"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyFeedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Company Feedback{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Any feedback about the employee's experience…"
                  rows={3}
                  maxLength={1000}
                  className="resize-none w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </HrSheet>
  );
}
