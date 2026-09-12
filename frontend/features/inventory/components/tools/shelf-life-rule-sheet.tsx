"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useSimpleClientsList } from "@/hooks/api/crm/clients";
import { usePutShelfLifeRule, type ShelfLifeRule } from "@/hooks/api/inventory/system-health";

const EVERY_CUSTOMER = "__default__";

/**
 * Mirrors `putShelfLifeRuleSchema`. Zero is meaningful and is not the same as
 * absent: the backend deletes the row on zero, because a stored zero would read
 * on this screen as a rule somebody set. Ten years is the ceiling, because a
 * floor longer than any shelf life in the catalogue refuses every lot and
 * presents as "allocation is broken" rather than as a setting.
 */
const schema = z.object({
  clientId: z.string(),
  minShelfLifeDays: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, "Whole days, 0 or more")
    .refine((value) => Number(value) <= 3650, "Ten years is the longest floor that can be set"),
  notes: z.string().trim().max(500).optional(),
});

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

export function ShelfLifeRuleSheet({
  rule,
  onOpenChange,
}: {
  rule: ShelfLifeRule | "new" | null;
  onOpenChange: (open: boolean) => void;
}) {
  const put = usePutShelfLifeRule();
  // Gated inside the hook: an inventory administrator who does not also hold
  // `crm:clients:read` gets no list rather than a 403 on every open.
  const canReadCustomers = useCan("crm:clients:read");
  const { data: clients } = useSimpleClientsList();

  const editingExisting = rule !== null && rule !== "new";
  const lockedToCustomer = editingExisting && rule.clientId !== null;

  function handleSubmit(values: Output): void {
    const days = Number(values.minShelfLifeDays);
    put.mutate(
      {
        clientId: values.clientId === EVERY_CUSTOMER ? null : Number(values.clientId),
        minShelfLifeDays: days,
        notes: values.notes === "" ? null : values.notes,
      },
      {
        onSuccess: () => {
          toast.success(
            days === 0
              ? "Floor removed — allocation will take any lot with life left on it."
              : `Floor set to ${String(days)} days.`,
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormSheet<Values, Output>
      open={rule !== null}
      onOpenChange={onOpenChange}
      title={editingExisting ? "Change this shelf-life floor" : "Set a shelf-life floor"}
      description="Allocation will not take a lot with less remaining life than this. Set it to 0 to remove the floor entirely."
      resolver={zodResolver(schema)}
      resetOnOpen
      defaultValues={{
        clientId:
          editingExisting && rule.clientId !== null ? String(rule.clientId) : EVERY_CUSTOMER,
        minShelfLifeDays: editingExisting ? String(rule.minShelfLifeDays) : "0",
        notes: editingExisting ? (rule.notes ?? "") : "",
      }}
      isSubmitting={put.isPending}
      submitLabel={put.isPending ? "Saving…" : "Save floor"}
      onSubmit={handleSubmit}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Applies to</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={lockedToCustomer}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={EVERY_CUSTOMER}>Every customer (default)</SelectItem>
                    {lockedToCustomer ? (
                      <SelectItem value={String(rule.clientId)}>
                        {rule.clientName ?? "This customer"}
                      </SelectItem>
                    ) : null}
                    {(clients ?? []).map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canReadCustomers && !lockedToCustomer ? (
                  <p className="text-dense text-muted-foreground">
                    Only the default can be set here. Naming a customer needs the customer
                    directory, which is behind crm:clients:read.
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minShelfLifeDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum remaining life (days)</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
                </FormControl>
                <p className="text-dense text-muted-foreground">
                  0 removes the floor. A floor longer than anything in the catalogue refuses every
                  lot, so the ceiling is ten years.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={2}
                    placeholder="Agreed in the 2026 supply contract"
                  />
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
