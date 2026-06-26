"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EntityFormSheet } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUpdateTimeEntry } from "@/lib/api/hooks/projects";

interface EditTimeEntryDialogProps {
  entry: {
    id: number;
    description: string | null;
    hours: string;
    status: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hours: z.number().min(0, "Hours must be 0 or greater"),
});

type EditTimeEntryValues = z.infer<typeof formSchema>;

export function EditTimeEntryDialog({
  entry,
  open,
  onOpenChange,
}: EditTimeEntryDialogProps) {
  const mutation = useUpdateTimeEntry();

  const handleSubmit = (values: EditTimeEntryValues) => {
    mutation.mutate(
      {
        entryId: entry.id,
        description: values.description,
        hours: values.hours,
      },
      {
        onSuccess: () => {
          toast.success("Time entry updated successfully");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error((err as Error).message || "Failed to update time entry");
        },
      },
    );
  };

  const defaultValues: EditTimeEntryValues = {
    description: entry.description ?? "",
    hours: parseFloat(entry.hours) || 0,
  };

  return (
    <EntityFormSheet<EditTimeEntryValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Edit time entry"
      description="Update the description or hours for this time entry."
      resolver={zodResolver(formSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      resetOnOpen
      submitLabel="Update"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What did you work on?"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="0"
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
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
