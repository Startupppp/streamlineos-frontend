"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const logActivitySchema = z.object({
  notes: z.string().min(1, "Details are required"),
});

type LogActivityValues = z.infer<typeof logActivitySchema>;

interface LogActivityDialogProps {
  open: boolean;
  actionLabel: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}

export function LogActivityDialog({
  open,
  actionLabel,
  isPending,
  onClose,
  onSubmit,
}: LogActivityDialogProps) {
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) onClose();
    },
    [onClose],
  );

  const handleSubmit = useCallback(
    (data: LogActivityValues) => {
      onSubmit(data.notes.trim());
    },
    [onSubmit],
  );

  return (
    <EntityFormDialog<LogActivityValues>
      open={open}
      onOpenChange={handleOpenChange}
      title={actionLabel}
      resolver={zodResolver(logActivitySchema)}
      defaultValues={{ notes: "" }}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      resetOnOpen
      submitLabel="Log activity"
    >
      {(form) => (
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={`Enter ${actionLabel.toLowerCase()} details...`}
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}
