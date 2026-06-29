"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { useCreateAccount } from "@/hooks/api/accounting";

const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
] as const;

const createAccountSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(120),
  accountType: z.enum(ACCOUNT_TYPES),
  description: z.string().max(500).optional(),
});

type CreateAccountValues = z.infer<typeof createAccountSchema>;

const DEFAULT_VALUES: CreateAccountValues = {
  code: "",
  name: "",
  accountType: "EXPENSE",
  description: "",
};

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
}: CreateAccountDialogProps) {
  const create = useCreateAccount();

  async function handleSubmit(values: CreateAccountValues): Promise<void> {
    try {
      await create.mutateAsync({
        code: values.code,
        name: values.name,
        accountType: values.accountType,
        description: values.description ? values.description : undefined,
      });
      toast.success("Account created");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create account";
      toast.error(message);
    }
  }

  return (
    <EntityFormDialog<CreateAccountValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New account"
      resolver={zodResolver(createAccountSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={create.isPending}
      submitLabel="Create account"
      resetOnOpen
    >
      {(form) => (
        <>
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
