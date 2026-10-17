"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSavePlaybookEntry } from "@/hooks/api/crm/sales";
import type { PlaybookEntry } from "@/hooks/api/crm/sales-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { playbookEntrySchema, toPlaybookValues, type PlaybookEntryValues } from "./playbook-entry-schema";

interface PlaybookEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates. */
  entry: PlaybookEntry | null;
}

/** Three fields, but the body is long-form guidance, so it gets the sheet's height. */
export function PlaybookEntrySheet({ open, onOpenChange, entry }: PlaybookEntrySheetProps) {
  const save = useSavePlaybookEntry();
  const defaults = useMemo(() => toPlaybookValues(entry), [entry]);

  function handleSubmit(values: PlaybookEntryValues) {
    save.mutate(
      {
        ...(entry ? { entryId: entry.id } : {}),
        title: values.title,
        category: values.category || undefined,
        content: values.content,
      },
      {
        onSuccess: () => {
          toast.success(entry ? "Play saved" : "Play added");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormSheet<PlaybookEntryValues>
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? "Edit play" : "New play"}
      description="Guidance reps can follow: talk tracks, objection answers, qualification steps."
      resolver={zodResolver(playbookEntrySchema)}
      defaultValues={defaults}
      onSubmit={handleSubmit}
      isSubmitting={save.isPending}
      submitLabel={entry ? "Save" : "Add play"}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Discovery, Objections, Closing" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guidance</FormLabel>
                <FormControl>
                  <Textarea rows={10} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormSheet>
  );
}
