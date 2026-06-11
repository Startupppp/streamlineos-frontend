"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone } from "lucide-react";
import { EntityFormDialog } from "@/components/shared";
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
import { useCompleteTask, useUpdateTask, type Task } from "@/lib/api/hooks/tasks";
import { toast } from "sonner";

const CALL_OUTCOMES = [
  { value: "REACHED", label: "Reached — spoke with contact" },
  { value: "VOICEMAIL", label: "Left voicemail" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "BUSY", label: "Line busy" },
  { value: "WRONG_NUMBER", label: "Wrong number" },
  { value: "CALLBACK_REQUESTED", label: "Callback requested" },
] as const;

const OUTCOME_VALUES = CALL_OUTCOMES.map((o) => o.value) as [
  (typeof CALL_OUTCOMES)[number]["value"],
  ...(typeof CALL_OUTCOMES)[number]["value"][],
];

const callLogSchema = z.object({
  outcome: z.enum(OUTCOME_VALUES),
  notes: z.string().optional(),
});

type CallLogValues = z.infer<typeof callLogSchema>;

interface CallLogDialogProps {
  task: Task;
  onClose: () => void;
}

export function CallLogDialog({ task, onClose }: CallLogDialogProps) {
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();

  const isPending = updateTask.isPending || completeTask.isPending;

  const handleSubmit = (data: CallLogValues) => {
    const outcomeLabel =
      CALL_OUTCOMES.find((o) => o.value === data.outcome)?.label ?? data.outcome;
    const callNotes = `[Call Log] Outcome: ${outcomeLabel}${
      data.notes && data.notes.trim() ? `\n${data.notes.trim()}` : ""
    }`;

    updateTask.mutate(
      { taskId: task.id, data: { notes: callNotes } },
      {
        onSuccess: () => {
          completeTask.mutate(
            { taskId: task.id },
            {
              onSuccess: () => {
                toast.success("Call logged and task completed");
                onClose();
              },
              onError: () => toast.error("Failed to complete task"),
            },
          );
        },
        onError: () => toast.error("Failed to save call log"),
      },
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <EntityFormDialog<CallLogValues>
      open
      onOpenChange={handleOpenChange}
      title={`Log call — ${task.title}`}
      resolver={zodResolver(callLogSchema)}
      defaultValues={{
        outcome: "REACHED",
        notes: task.notes ?? "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel="Log & complete"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="outcome"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  Call outcome
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CALL_OUTCOMES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What was discussed? Any follow-up actions?"
                    rows={3}
                    {...field}
                  />
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
