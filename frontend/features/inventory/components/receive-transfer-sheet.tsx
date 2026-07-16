"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { LoadingButton } from "@/components/ui/loading-button";
import type { TransferDetail } from "@/hooks/api/inventory/stock";

const receiveSchema = z.object({
  lines: z.array(
    z.object({
      transferLineId: z.number(),
      quantityReceived: z.string().refine(
        (v) => {
          const n = Number(v);
          return !isNaN(n) && n >= 0;
        },
        { message: "Must be 0 or more" },
      ),
      notes: z.string().optional(),
    }),
  ),
});

type ReceiveFormValues = z.infer<typeof receiveSchema>;

function ReceiveTransferForm({
  transfer,
  onSubmit,
  isPending,
  onClose,
}: {
  transfer: TransferDetail;
  onSubmit: (lines: { transferLineId: number; quantityReceived: number }[]) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      lines: transfer.lines.map((l) => ({
        transferLineId: l.id,
        quantityReceived: String(l.quantity),
        notes: "",
      })),
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: "lines" });

  function handleReceiveAll() {
    form.setValue(
      "lines",
      transfer.lines.map((l) => ({
        transferLineId: l.id,
        quantityReceived: String(l.quantity),
        notes: "",
      })),
    );
  }

  function handleFormSubmit(data: ReceiveFormValues) {
    const invalidIdx = data.lines.findIndex((l, i) => {
      const expected = transfer.lines[i]?.quantity ?? 0;
      return Number(l.quantityReceived) > expected;
    });

    if (invalidIdx !== -1) {
      form.setError(`lines.${invalidIdx}.quantityReceived`, {
        message: "Cannot exceed expected quantity",
      });
      toast.error("Received quantity cannot exceed expected");
      return;
    }

    onSubmit(
      data.lines.map((l) => ({
        transferLineId: l.transferLineId,
        quantityReceived: Number(l.quantityReceived),
      })),
    );
  }

  return (
    <Form {...form}>
      <SheetBody className="space-y-4 px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium">Line Items</span>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleReceiveAll}>
            Receive All
          </Button>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Product / SKU
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Requested
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Received
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => {
                const line = transfer.lines[idx];
                if (!line) return null;
                return (
                  <tr key={field.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 max-w-[160px]">
                      <TruncatedText
                        text={line.productName}
                        className="font-medium leading-tight"
                      />
                      <p className="text-[10px] text-muted-foreground font-mono">{line.sku}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {line.quantity.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.quantityReceived`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...f}
                                type="number"
                                min={0}
                                max={line.quantity}
                                className="w-20 text-xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <FormField
                        control={form.control}
                        name={`lines.${idx}.notes`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...f}
                                type="text"
                                placeholder="Optional"
                                className="text-xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SheetBody>
      <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            onClick={form.handleSubmit(handleFormSubmit)}
            isPending={isPending}
            loadingText="Receiving…"
          >
            Confirm Receipt
          </LoadingButton>
        </div>
      </SheetFooter>
    </Form>
  );
}

export function ReceiveTransferSheet({
  open,
  onOpenChange,
  transfer,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transfer: TransferDetail;
  onSubmit: (lines: { transferLineId: number; quantityReceived: number }[]) => void;
  isPending: boolean;
}) {
  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Receive Transfer</SheetTitle>
          <SheetDescription>
            {transfer.referenceNumber} · {transfer.fromLocation?.name ?? "—"} →{" "}
            {transfer.toLocation?.name ?? "—"}
          </SheetDescription>
        </SheetHeader>
        <ReceiveTransferForm
          transfer={transfer}
          onSubmit={onSubmit}
          isPending={isPending}
          onClose={handleClose}
        />
      </SheetContent>
    </Sheet>
  );
}
