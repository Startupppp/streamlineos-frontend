"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAccount, useUpdateAccount } from "@/hooks/api/accounting";
import type { AccountTreeNode } from "@/hooks/api/accounting/core";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;

function isAccountType(value: string): value is AccountValues["accountType"] {
  return (ACCOUNT_TYPES as ReadonlyArray<string>).includes(value);
}

const accountSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(120),
  accountType: z.enum(ACCOUNT_TYPES),
  description: z.string().max(500).optional(),
});

type AccountValues = z.infer<typeof accountSchema>;

const DEFAULT_VALUES: AccountValues = {
  code: "",
  name: "",
  accountType: "EXPENSE",
  description: "",
};

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAccount?: AccountTreeNode | null;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  editAccount,
}: CreateAccountDialogProps) {
  const create = useCreateAccount();
  const update = useUpdateAccount(editAccount?.id ?? 0);
  const isEditMode = !!editAccount;

  const defaultValues: AccountValues = isEditMode
    ? {
        code: editAccount.code,
        name: editAccount.name,
        accountType: isAccountType(editAccount.accountType) ? editAccount.accountType : "ASSET",
        description: editAccount.description ?? "",
      }
    : DEFAULT_VALUES;

  async function handleSubmit(values: AccountValues): Promise<void> {
    try {
      if (isEditMode) {
        await update.mutateAsync({
          name: values.name,
          description: values.description ? values.description : undefined,
        });
        toast.success("Account updated");
      } else {
        await create.mutateAsync({
          code: values.code,
          name: values.name,
          accountType: values.accountType,
          description: values.description ? values.description : undefined,
        });
        toast.success("Account created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const isPending = isEditMode ? update.isPending : create.isPending;

  return (
    <EntityFormDialog<AccountValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit account" : "New account"}
      resolver={zodResolver(accountSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={isEditMode ? "Save changes" : "Create account"}
      resetOnOpen
    >
      {(form) => (
        <>
          {!isEditMode && (
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. 6000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {isEditMode && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Code</p>
              <p className="text-sm text-foreground font-mono">{editAccount.code}</p>
            </div>
          )}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Office Supplies" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isEditMode && (
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ASSET">Asset</SelectItem>
                      <SelectItem value="LIABILITY">Liability</SelectItem>
                      <SelectItem value="EQUITY">Equity</SelectItem>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {isEditMode && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
              <p className="text-sm text-foreground">{editAccount.accountType}</p>
            </div>
          )}
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
        </>
      )}
    </EntityFormDialog>
  );
}
