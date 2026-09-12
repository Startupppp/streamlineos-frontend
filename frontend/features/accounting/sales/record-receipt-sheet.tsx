"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateArReceipt } from "@/hooks/api/accounting/ar";
import { PartyPicker } from "../parties/party-picker";
import {
  DEPOSIT_ACCOUNT_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  emptyReceiptForm,
  receiptFormSchema,
  toCreateReceiptInput,
  type ReceiptFormValues,
} from "./receipt-schema";

interface RecordReceiptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseCurrency: string;
  partyId?: string;
}

export function RecordReceiptSheet({
  open,
  onOpenChange,
  baseCurrency,
  partyId,
}: RecordReceiptSheetProps) {
  const createReceipt = useCreateArReceipt();

  function handleSubmit(values: ReceiptFormValues): void {
    createReceipt.mutate(toCreateReceiptInput(values), {
      onSuccess: () => {
        toast.success("Money in recorded");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormSheet<ReceiptFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Record money in"
      description="Recording it posts it straight away — the cash either arrived or it did not."
      resolver={zodResolver(receiptFormSchema)}
      defaultValues={emptyReceiptForm(baseCurrency, partyId)}
      onSubmit={handleSubmit}
      isSubmitting={createReceipt.isPending}
      submitLabel="Record it"
      resetOnOpen
      className="sm:max-w-lg"
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="partyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Who paid</FormLabel>
                <FormControl>
                  <PartyPicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How much</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="text-right font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={3} className="uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="receiptDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When it arrived</FormLabel>
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
              name="depositAccountTag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where it landed</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {DEPOSIT_ACCOUNT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How they paid</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="UTR or cheque number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="autoAllocateFifo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border border-border/70 px-3 py-2">
                <div className="space-y-0.5">
                  <FormLabel>Settle their oldest invoices first</FormLabel>
                  <FormDescription>
                    Turn off to hold it as an advance and apply it yourself.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="Anything worth remembering" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
