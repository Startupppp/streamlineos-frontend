"use client";

import { useCallback } from "react";
import { useForm, useFieldArray, type UseFormRegister, type UseFormWatch, type UseFormSetValue, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCreditNote } from "@/hooks/api/accounting/ar";
import { useCustomersOutstanding } from "@/hooks/api/accounting";
import { useInvoices } from "@/hooks/api/invoice";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

function toGstRate(value: number): 0 | 5 | 12 | 18 | 28 {
  if (value === 5) return 5;
  if (value === 12) return 12;
  if (value === 18) return 18;
  if (value === 28) return 28;
  return 0;
}

const creditNoteSchema = z.object({
  clientId: z.string().optional(),
  invoiceId: z.string().optional(),
  reason: z.string().optional(),
  currency: z.string().min(1, "Required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Required"),
        quantity: z.string().min(1, "Required"),
        rate: z.string().min(1, "Required"),
        gstRate: z.string().min(1, "Required"),
      }),
    )
    .min(1, "At least one item required"),
});

type CreditNoteFormValues = z.infer<typeof creditNoteSchema>;

interface CreditNoteItemRowProps {
  index: number;
  canRemove: boolean;
  register: UseFormRegister<CreditNoteFormValues>;
  watch: UseFormWatch<CreditNoteFormValues>;
  setValue: UseFormSetValue<CreditNoteFormValues>;
  errors: FieldErrors<CreditNoteFormValues>;
  onRemove: (index: number) => void;
}

function CreditNoteItemRow({
  index,
  canRemove,
  register,
  watch,
  setValue,
  errors,
  onRemove,
}: CreditNoteItemRowProps) {
  function handleRemove(): void {
    onRemove(index);
  }

  function handleGstRateChange(v: string): void {
    setValue(`items.${index}.gstRate`, v, { shouldValidate: true });
  }

  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Item {index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            aria-label="Remove item"
            onClick={handleRemove}
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Input
          className="text-sm"
          placeholder="Description"
          {...register(`items.${index}.description`)}
        />
        {errors.items?.[index]?.description && (
          <p className="text-xs text-destructive">
            {errors.items[index]?.description?.message}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-micro text-muted-foreground">Qty</Label>
          <Input
            type="number"
            className="text-sm"
            placeholder="1"
            {...register(`items.${index}.quantity`)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-micro text-muted-foreground">Rate</Label>
          <Input
            type="number"
            className="text-sm"
            placeholder="0.00"
            {...register(`items.${index}.rate`)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-micro text-muted-foreground">GST %</Label>
          <Select
            value={watch(`items.${index}.gstRate`)}
            onValueChange={handleGstRateChange}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["0", "5", "12", "18", "28"].map((r) => (
                <SelectItem key={r} value={r}>
                  {r}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

interface CreditNoteFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditNoteFormSheet({ open, onOpenChange }: CreditNoteFormSheetProps) {
  const createMutation = useCreateCreditNote();
  const customersQuery = useCustomersOutstanding();
  const invoicesQuery = useInvoices();
  const customersData = customersQuery.data;
  const invoicesData = invoicesQuery.data;

  const customerOptions: ComboboxOption[] = (customersData?.data ?? []).map((c) => ({
    value: String(c.clientId),
    label: c.clientName,
  }));

  const invoiceOptions: ComboboxOption[] = (invoicesData?.items ?? []).map((inv) => ({
    value: String(inv.id),
    label: `${inv.invoiceNumber}${inv.client ? ` — ${inv.client.name}` : ""}`,
  }));

  const form = useForm<CreditNoteFormValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      clientId: "",
      invoiceId: "",
      reason: "",
      currency: "INR",
      notes: "",
      items: [{ description: "", quantity: "1", rate: "", gstRate: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleSubmit = useCallback(
    (values: CreditNoteFormValues): void => {
      createMutation.mutate(
        {
          clientId: values.clientId ? Number(values.clientId) : undefined,
          invoiceId: values.invoiceId ? Number(values.invoiceId) : undefined,
          reason: values.reason || undefined,
          currency: values.currency,
          notes: values.notes || undefined,
          items: values.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            rate: Number(item.rate),
            gstRate: toGstRate(Number(item.gstRate)),
          })),
        },
        {
          onSuccess: () => {
            toast.success("Credit note created");
            onOpenChange(false);
            form.reset();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, onOpenChange, form],
  );

  function handleAddItem(): void {
    append({ description: "", quantity: "1", rate: "", gstRate: "0" });
  }

  function handleRemoveItem(index: number): void {
    remove(index);
  }

  function handleCancel(): void {
    onOpenChange(false);
    form.reset();
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Credit Note"
      footer={
        <>
          <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            className="flex-1"
            isPending={createMutation.isPending}
            loadingText="Creating…"
            onClick={form.handleSubmit(handleSubmit)}
          >
            Create Credit Note
          </LoadingButton>
        </>
      }
    >
      <div className="space-y-4 px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Customer <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Combobox
              options={customerOptions}
              value={form.watch("clientId") ?? ""}
              onChange={(v) => form.setValue("clientId", v, { shouldValidate: true })}
              placeholder="Select customer…"
              searchPlaceholder="Search customers…"
            />
            {customersQuery.isError && (
              <p className="text-xs text-destructive" role="alert">
                Couldn&apos;t load customers: {getErrorMessage(customersQuery.error)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Linked invoice <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Combobox
              options={invoiceOptions}
              value={form.watch("invoiceId") ?? ""}
              onChange={(v) => form.setValue("invoiceId", v, { shouldValidate: true })}
              placeholder="Select invoice…"
              searchPlaceholder="Search invoices…"
            />
            {invoicesQuery.isError && (
              <p className="text-xs text-destructive" role="alert">
                Couldn&apos;t load invoices: {getErrorMessage(invoicesQuery.error)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-xs font-medium">
              Currency
            </Label>
            <Select
              value={form.watch("currency")}
              onValueChange={(v) => form.setValue("currency", v, { shouldValidate: true })}
            >
              <SelectTrigger id="currency" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-medium">
              Reason
            </Label>
            <Input
              id="reason"
              className="text-sm"
              placeholder="e.g. Return, overcharge"
              {...form.register("reason")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Items
            </p>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAddItem}>
              <Plus className="size-3 mr-1" /> Add item
            </Button>
          </div>

          {form.formState.errors.items?.root && (
            <p className="text-xs text-destructive">{form.formState.errors.items.root.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
            <CreditNoteItemRow
              key={field.id}
              index={index}
              canRemove={fields.length > 1}
              register={form.register}
              watch={form.watch}
              setValue={form.setValue}
              errors={form.formState.errors}
              onRemove={handleRemoveItem}
            />
          ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-medium">
            Notes
          </Label>
          <Textarea
            id="notes"
            className="text-sm resize-none"
            rows={2}
            placeholder="Optional notes"
            {...form.register("notes")}
          />
        </div>
      </div>
    </AppSheet>
  );
}
