"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EntityFormDialog } from "@/components/shared";
import { useUpdateAccount } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Account } from "@/types/accounting";
import { editAccountSchema, type EditAccountValues } from "./edit-account-schema";

interface EditAccountDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: EditAccountDialogProps) {
  const update = useUpdateAccount(account.id);

  const defaultValues: EditAccountValues = {
    name: account.name,
    description: account.description ?? "",
    isActive: account.isActive,
  };

  async function handleSubmit(values: EditAccountValues): Promise<void> {
    try {
      await update.mutateAsync({
        name: values.name,
        description: values.description ? values.description : undefined,
        isActive: values.isActive,
      });
      toast.success("Account updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <EntityFormDialog<EditAccountValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Edit account"
      resolver={zodResolver(editAccountSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={update.isPending}
      submitLabel="Save changes"
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
                  <Input {...field} placeholder="Account name" />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                    placeholder="Optional notes about this account"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <FormLabel className="text-sm font-medium">Active</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inactive accounts are hidden from transaction forms.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
