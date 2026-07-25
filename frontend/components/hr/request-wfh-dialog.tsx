"use client";

import { ReactNode, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Home } from "lucide-react";
import { format, addDays } from "date-fns";
import { useCreateWfhRequest, useHrLeaveContext } from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { EntityFormSheet } from "@/components/shared";
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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const WFH_REASON_MAX_LENGTH = 1000;

const wfhFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reason: z
    .string()
    .max(WFH_REASON_MAX_LENGTH, `Reason must be ${WFH_REASON_MAX_LENGTH} characters or fewer`)
    .optional(),
  approverId: z.string().min(1, "Approver is required"),
});

type WfhFormValues = z.infer<typeof wfhFormSchema>;

interface RequestWfhDialogProps {
  trigger?: ReactNode;
}

export function RequestWfhDialog({ trigger }: RequestWfhDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const createWfhRequest = useCreateWfhRequest();
  const { data: leaveContext } = useHrLeaveContext();
  const approvers = leaveContext?.approvers ?? [];

  const handleOpen = () => setOpen(true);

  const handleSubmit = (data: WfhFormValues) => {
    const [yr, mo, dy] = data.date.split("-").map(Number);
    const selectedDate = new Date(yr, mo - 1, dy);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate <= today) {
      toast.error("WFH date must be a future date");
      return;
    }
    createWfhRequest.mutate(
      {
        date: new Date(data.date),
        reason: data.reason || undefined,
        approverId: data.approverId,
      },
      {
        onSuccess: () => {
          toast.success("Work from home request submitted");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} role="button" tabIndex={0}>
          {trigger}
        </span>
      ) : (
        <Button variant="outline" onClick={handleOpen}>
          <Home className="mr-2 h-4 w-4" />
          Request WFH
        </Button>
      )}
      <EntityFormSheet<WfhFormValues>
        open={open}
        onOpenChange={setOpen}
        title="Work from home request"
        description="Request to work from home for a specific date."
        resolver={zodResolver(wfhFormSchema)}
        defaultValues={{
          date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
          reason: "",
          approverId: approvers.length === 1 ? approvers[0].id : "",
        }}
        onSubmit={handleSubmit}
        isSubmitting={createWfhRequest.isPending}
        submitLabel="Submit request"
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                    Date
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={addDays(new Date(), 1)}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="approverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Approver</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={approvers.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            approvers.length === 0
                              ? "No approver available"
                              : "Select approver"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approvers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ||
                            `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
                            u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {approvers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No HR or CEO role is assigned in this organization yet, so a WFH
                      request has no one to approve it.
                    </p>
                  ) : (
                    <FormMessage />
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-baseline justify-between">
                    <FormLabel>Reason (optional)</FormLabel>
                    <span className="text-xs text-muted-foreground">
                      {field.value?.length ?? 0} / {WFH_REASON_MAX_LENGTH}
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Internet maintenance at home..."
                      className="resize-none w-full"
                      rows={3}
                      maxLength={WFH_REASON_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormSheet>
    </>
  );
}
