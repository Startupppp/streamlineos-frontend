"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  saveReportSchema,
  type SaveReportValues,
} from "./save-report-schema";

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when an already-saved report is being renamed or overwritten. */
  defaultValues: SaveReportValues;
  isExisting: boolean;
  isSubmitting: boolean;
  onSubmit: (values: SaveReportValues) => void;
}

export function SaveReportDialog({
  open,
  onOpenChange,
  defaultValues,
  isExisting,
  isSubmitting,
  onSubmit,
}: SaveReportDialogProps) {
  return (
    <EntityFormDialog<SaveReportValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isExisting ? "Save changes to this report" : "Save this report"}
      description={
        isExisting
          ? "Everyone who opens this report will get the version you save here."
          : "A saved report keeps the question, not the answer — it is re-run against current data every time somebody opens it."
      }
      resolver={zodResolver(saveReportSchema)}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitLabel={isExisting ? "Save changes" : "Save report"}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Pipeline by owner" autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What it answers (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="Open deals per owner, so the Monday review has one number to argue with."
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
