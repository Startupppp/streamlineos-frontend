"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
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
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { useCreateTransfer } from "@/hooks/api/accounting/banking";
import type { BankAccount } from "@/hooks/api/accounting/banking";
import { getErrorMessage } from "@/lib/get-error-message";

const schema = z
  .object({
    fromBankAccountId: z.string().min(1, "Required"),
    toBankAccountId: z.string().min(1, "Required"),
    amount: z
      .string()
      .min(1, "Required")
      .refine(
        (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
        { message: "Must be a positive number" },
      ),
    transferDate: z.string().min(1, "Required"),
    reference: z.string(),
    description: z.string(),
  })
  .refine((v) => v.fromBankAccountId !== v.toBankAccountId, {
    message: "Source and destination must be different",
    path: ["toBankAccountId"],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BankAccount[];
}

export function NewTransferDialog({ open, onOpenChange, accounts }: Props) {
  const createTransfer = useCreateTransfer();

  const today = new Date().toISOString().split("T")[0] ?? "";

  function handleSubmit(values: FormValues) {
    createTransfer.mutate(
      {
        fromBankAccountId: parseInt(values.fromBankAccountId, 10),
        toBankAccountId: parseInt(values.toBankAccountId, 10),
        amount: values.amount,
        transferDate: values.transferDate,
        reference: values.reference || undefined,
        description: values.description || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <EntityFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New Transfer"
      description="Record a fund movement between two accounts."
      resolver={zodResolver(schema)}
      defaultValues={{
        fromBankAccountId: "",
        toBankAccountId: "",
        amount: "",
        transferDate: today,
        reference: "",
        description: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={createTransfer.isPending}
      submitLabel="Create Transfer"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="fromBankAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Account <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
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
            name="toBankAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Account <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transferDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. TXN-001" {...field} />
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
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Add a note…" {...field} />
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
