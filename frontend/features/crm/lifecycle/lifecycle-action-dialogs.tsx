"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  FormControl,
  FormDescription,
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
import {
  useRecordLifecycleSignal,
  useRenewLifecycle,
} from "@/hooks/api/crm/lifecycle";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  SIGNAL_KINDS,
  SIGNAL_KIND_LABEL,
  recordSignalSchema,
  renewSchema,
  toRenewInput,
  toSignalInput,
  type RecordSignalFormValues,
  type RenewFormValues,
} from "./lifecycle-action-schema";
import { CloseLifecycleDialog } from "./close-lifecycle-dialog";

export type LifecycleAction = "signal" | "renew" | "close";

interface LifecycleActionDialogProps {
  action: LifecycleAction | null;
  customerLifecycleId: string;
  currency: string;
  onOpenChange: (open: boolean) => void;
}

/** Whichever of the three writes is open; one mounted at a time. */
export function LifecycleActionDialog({
  action,
  customerLifecycleId,
  currency,
  onOpenChange,
}: LifecycleActionDialogProps) {
  if (action === "signal")
    return <RecordSignalDialog customerLifecycleId={customerLifecycleId} onOpenChange={onOpenChange} />;
  if (action === "renew")
    return (
      <RenewDialog
        customerLifecycleId={customerLifecycleId}
        currency={currency}
        onOpenChange={onOpenChange}
      />
    );
  if (action === "close")
    return <CloseLifecycleDialog customerLifecycleId={customerLifecycleId} onOpenChange={onOpenChange} />;
  return null;
}

interface DialogProps {
  customerLifecycleId: string;
  onOpenChange: (open: boolean) => void;
}

const SIGNAL_DEFAULTS: RecordSignalFormValues = { kind: "note", impact: "", note: "" };

function RecordSignalDialog({ customerLifecycleId, onOpenChange }: DialogProps) {
  const record = useRecordLifecycleSignal();
  const handleSubmit = (values: RecordSignalFormValues) => {
    record.mutate(toSignalInput(customerLifecycleId, values), {
      onSuccess: ({ data }) => {
        toast.success(`Signal recorded — risk is now ${data.riskScore}`);
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <EntityFormDialog<RecordSignalFormValues>
      open
      onOpenChange={onOpenChange}
      title="Record a signal"
      description="Evidence that moves this contract's risk score, in either direction."
      resolver={zodResolver(recordSignalSchema)}
      defaultValues={SIGNAL_DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={record.isPending}
      submitLabel="Record signal"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kind</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="Signal kind">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {SIGNAL_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {SIGNAL_KIND_LABEL[kind]}
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
            name="impact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Impact</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" placeholder="Kind's default" />
                </FormControl>
                <FormDescription>-100 to 100. Positive raises the risk. Leave blank for the kind&apos;s default.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
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

const RENEW_DEFAULTS: RenewFormValues = { termMonths: "", contractValue: "", startedOn: "", note: "" };

function RenewDialog({ customerLifecycleId, currency, onOpenChange }: DialogProps & { currency: string }) {
  const renew = useRenewLifecycle();
  const handleSubmit = (values: RenewFormValues) => {
    renew.mutate(toRenewInput(customerLifecycleId, values, currency), {
      onSuccess: () => {
        toast.success("Contract renewed");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <EntityFormDialog<RenewFormValues>
      open
      onOpenChange={onOpenChange}
      title="Renew contract"
      description="Leave a field blank to keep it: same length, same value, starting when the current term ends."
      resolver={zodResolver(renewSchema)}
      defaultValues={RENEW_DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={renew.isPending}
      submitLabel="Renew"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="termMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Term (months)</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" placeholder="Same as now" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contractValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`Contract value (${currency})`}</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" placeholder="Same as now" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startedOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New term starts</FormLabel>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="When the current term ends"
                  ariaLabel="New term starts"
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
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
