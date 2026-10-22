"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCloseLifecycle } from "@/hooks/api/crm/lifecycle";
import { getErrorMessage } from "@/lib/get-error-message";
import { closeSchema, toCloseInput, type CloseFormValues } from "./lifecycle-action-schema";

interface CloseLifecycleDialogProps {
  customerLifecycleId: string;
  onOpenChange: (open: boolean) => void;
}

const CLOSE_DEFAULTS: CloseFormValues = { status: "churned", reason: "" };

export function CloseLifecycleDialog({ customerLifecycleId, onOpenChange }: CloseLifecycleDialogProps) {
  const close = useCloseLifecycle();
  const handleSubmit = (values: CloseFormValues) => {
    close.mutate(toCloseInput(customerLifecycleId, values), {
      onSuccess: () => {
        toast.success("Contract closed");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <EntityFormDialog<CloseFormValues>
      open
      onOpenChange={onOpenChange}
      title="Close contract"
      description="Ending a contract cannot be undone. A returning customer comes back through a new won deal."
      resolver={zodResolver(closeSchema)}
      defaultValues={CLOSE_DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={close.isPending}
      submitLabel="Close contract"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ending</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="Ending">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value="churned">Churned</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <FormLabel>Reason</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
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
