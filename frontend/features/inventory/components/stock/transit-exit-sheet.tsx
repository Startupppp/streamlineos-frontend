"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { useExitTransit, type StrandedTransitRow } from "@/hooks/api/inventory/transit";
import {
  transitExitSchema,
  type TransitExitFormOutput,
  type TransitExitFormValues,
} from "./transit-exit-schema";

const DISPOSITION_LABEL = {
  RETURN_TO_SOURCE: "Return to the source bin",
  WRITE_OFF: "Write off as lost",
} as const;

/**
 * The decision on one stranded line.
 *
 * A Sheet rather than a Dialog because the operator needs the line in front of
 * them while they answer — which document, which lot, how much was dispatched
 * against how much arrived. Losing that context is how a write-off gets raised
 * against the wrong transfer.
 */
export function TransitExitSheet({
  row,
  onOpenChange,
  onExited,
}: {
  row: StrandedTransitRow | null;
  onOpenChange: (open: boolean) => void;
  onExited?: () => void;
}) {
  const exitTransit = useExitTransit();

  function handleSubmit(values: TransitExitFormOutput): void {
    if (!row) return;
    exitTransit.mutate(
      {
        transferId: row.transferId,
        disposition: values.disposition,
        reason: values.reason,
        lines: [{ transferLineId: row.transferLineId, quantity: values.quantity }],
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.disposition === "WRITE_OFF"
              ? "Written off — the loss is posted against the transit bin."
              : "Returned to the source bin.",
          );
          onOpenChange(false);
          onExited?.();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  const documentName = row?.referenceNumber ?? "this transfer";
  const productName = row?.variantName ?? row?.sku ?? "this product";

  return (
    <EntityFormSheet<TransitExitFormValues, TransitExitFormOutput>
      open={row !== null}
      onOpenChange={onOpenChange}
      title="Take these units out of transit"
      description={`${productName} on ${documentName}. Returning puts them back on the source bin; writing off records the loss. Both post movements, and neither deletes the row.`}
      resolver={zodResolver(transitExitSchema)}
      resetOnOpen
      defaultValues={{
        disposition: "RETURN_TO_SOURCE",
        quantity: row?.quantityStranded ?? "",
        reason: "",
      }}
      isSubmitting={exitTransit.isPending}
      submitLabel={exitTransit.isPending ? "Posting…" : "Post the exit"}
      onSubmit={handleSubmit}
    >
      {(form) => (
        <div className="space-y-4">
          {row ? (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div>
                <dt className="text-dense text-muted-foreground">Dispatched</dt>
                <dd className="font-mono tabular-nums text-sm">{row.quantityDispatched}</dd>
              </div>
              <div>
                <dt className="text-dense text-muted-foreground">Received</dt>
                <dd className="font-mono tabular-nums text-sm">{row.quantityReceived}</dd>
              </div>
              <div>
                <dt className="text-dense text-muted-foreground">Stranded</dt>
                <dd className="font-mono tabular-nums text-sm font-semibold">
                  {row.quantityStranded}
                </dd>
              </div>
              <div>
                <dt className="text-dense text-muted-foreground">Standing on</dt>
                <dd className="text-sm">{row.transitLocationCode ?? "Transit"}</dd>
              </div>
            </dl>
          ) : null}

          <FormField
            control={form.control}
            name="disposition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What happened to them</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="RETURN_TO_SOURCE">
                      {DISPOSITION_LABEL.RETURN_TO_SOURCE}
                    </SelectItem>
                    <SelectItem value="WRITE_OFF">{DISPOSITION_LABEL.WRITE_OFF}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" />
                </FormControl>
                <p className="text-dense text-muted-foreground">
                  Defaults to everything this line stranded. Reduce it when only part of the
                  consignment has been accounted for.
                </p>
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
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="Pallet found damaged at the depot and scrapped on site"
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
