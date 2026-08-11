"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { callLogSchema, type CallLogFormValues } from "./call-log-dialog-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { useCreateTask } from "@/hooks/api/tasks";
import type { TaskEntityType } from "@/hooks/api/tasks";

const DIRECTION_LABELS: Record<CallLogFormValues["direction"], string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
};

const OUTCOME_LABELS: Record<CallLogFormValues["outcome"], string> = {
  CONNECTED: "Connected",
  NO_ANSWER: "No Answer",
  VOICEMAIL: "Voicemail",
  BUSY: "Busy",
  WRONG_NUMBER: "Wrong Number",
};

function formatNotes(values: CallLogFormValues): string {
  const parts: string[] = [
    `Direction: ${DIRECTION_LABELS[values.direction]}`,
    `Outcome: ${OUTCOME_LABELS[values.outcome]}`,
  ];
  if (values.durationMinutes) parts.push(`Duration: ${values.durationMinutes} min`);
  if (values.calledAt) parts.push(`Called at: ${values.calledAt}`);
  if (values.notes) parts.push(`\nNotes:\n${values.notes}`);
  return parts.join("\n");
}

interface CallLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: TaskEntityType;
  entityId: number;
}

export function CallLogDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
}: CallLogDialogProps) {
  const createTask = useCreateTask();

  const defaultCalledAt = new Date().toISOString().slice(0, 16);

  const handleSubmit = useCallback(
    (values: CallLogFormValues) => {
      createTask.mutate(
        {
          title: `Call: ${DIRECTION_LABELS[values.direction]} – ${OUTCOME_LABELS[values.outcome]}`,
          type: "CALL",
          notes: formatNotes(values),
          entityType,
          entityId,
        },
        {
          onSuccess: () => {
            toast.success("Call logged");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [createTask, entityType, entityId, onOpenChange]
  );

  return (
    <EntityFormDialog<CallLogFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Log Call"
      description="Record details of a completed or attempted call."
      resolver={zodResolver(callLogSchema)}
      defaultValues={{
        direction: "OUTBOUND",
        outcome: "CONNECTED",
        durationMinutes: "",
        notes: "",
        calledAt: defaultCalledAt,
      }}
      onSubmit={handleSubmit}
      isSubmitting={createTask.isPending}
      submitLabel="Log Call"
      resetOnOpen
    >
      {(form) => (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OUTBOUND">Outbound</SelectItem>
                      <SelectItem value="INBOUND">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CONNECTED">Connected</SelectItem>
                      <SelectItem value="NO_ANSWER">No Answer</SelectItem>
                      <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
                      <SelectItem value="BUSY">Busy</SelectItem>
                      <SelectItem value="WRONG_NUMBER">Wrong Number</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (min)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} placeholder="e.g. 5" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="calledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Called At</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="What was discussed?" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
