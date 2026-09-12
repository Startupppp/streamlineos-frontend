"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { EntityFormDialog } from "@/components/shared";
import { DatePicker } from "@/components/ui/date-picker";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreditNoteFromInvoice } from "@/hooks/api/accounting/ar";

const creditNoteFromInvoiceSchema = z.object({
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  reference: z.string().trim().max(255),
  memo: z.string().trim().max(4000),
});

type CreditNoteFromInvoiceValues = z.infer<typeof creditNoteFromInvoiceSchema>;

interface CreditNoteFromInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string | null;
}

export function CreditNoteFromInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
}: CreditNoteFromInvoiceDialogProps) {
  const router = useRouter();
  const createCreditNote = useCreditNoteFromInvoice();

  function handleSubmit(values: CreditNoteFromInvoiceValues): void {
    createCreditNote.mutate(
      {
        invoiceId,
        input: {
          issueDate: values.issueDate,
          reference: values.reference.length > 0 ? values.reference : null,
          memo: values.memo.length > 0 ? values.memo : null,
        },
      },
      {
        onSuccess: (created) => {
          toast.success("Draft credit note created");
          onOpenChange(false);
          router.push(`/accounting/credit-notes/${created.id}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<CreditNoteFromInvoiceValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Issue a credit note"
      description={`We copy every line from ${invoiceNumber ?? "this invoice"} into a draft credit note. Trim it before you post it if you are only crediting part of the invoice.`}
      resolver={zodResolver(creditNoteFromInvoiceSchema)}
      defaultValues={{
        issueDate: new Date().toISOString().slice(0, 10),
        reference: invoiceNumber ?? "",
        memo: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={createCreditNote.isPending}
      submitLabel="Create draft"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    dateFormat="dd MMM yyyy"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Invoice being credited" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Why</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Goods returned in March" />
                </FormControl>
                <FormDescription>Shown to the customer on the credit note.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
