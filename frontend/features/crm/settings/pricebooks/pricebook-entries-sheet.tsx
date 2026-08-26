"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { entrySchema, type EntryFormValues } from "./pricebook-entries-sheet-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  usePricebookEntries,
  useUpsertPricebookEntry,
  useDeletePricebookEntry,
} from "@/hooks/api/crm/pricebooks";
import { useProducts } from "@/hooks/api/crm/products";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Pricebook } from "@/types/crm/pricebooks";
import { NoPermissionState } from "@/components/shared";

const defaultEntryValues: EntryFormValues = {
  productId: "",
  unitPriceCents: "",
  minQuantity: "1",
};

interface PricebookEntriesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricebook: Pricebook | null;
}

export function PricebookEntriesSheet({
  open,
  onOpenChange,
  pricebook,
}: PricebookEntriesSheetProps) {
  const pricebookId = pricebook?.id ?? "";

  const { data: entries, isLoading, access } = usePricebookEntries(pricebookId);
  const upsertEntry = useUpsertPricebookEntry();
  const deleteEntry = useDeletePricebookEntry();
  const { data: productsData } = useProducts();
  const productOptions = useMemo(
    () =>
      (productsData?.products ?? []).map((p) => ({
        value: String(p.id),
        label: p.name,
        sublabel: p.sku ?? undefined,
      })),
    [productsData],
  );

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: defaultEntryValues,
  });

  function handleAddEntry(values: EntryFormValues) {
    if (!pricebookId) return;
    const productId = Number(values.productId);
    const unitPriceCents = Number(values.unitPriceCents);
    const minQuantity = Number(values.minQuantity) || 1;
    if (!productId || productId <= 0) return;
    upsertEntry.mutate(
      { pricebookId, productId, unitPriceCents, minQuantity },
      {
        onSuccess: () => {
          toast.success("Entry added");
          form.reset(defaultEntryValues);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDeleteEntry(entryId: string) {
    if (!pricebookId) return;
    deleteEntry.mutate(
      { pricebookId, entryId },
      {
        onSuccess: () => toast.success("Entry removed"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleClose() {
    onOpenChange(false);
  }

  const entryList = entries ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col overflow-hidden sm:max-w-xl">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>
            {pricebook ? `Entries — ${pricebook.name}` : "Pricebook Entries"}
          </SheetTitle>
          <SheetDescription>
            Manage product prices for this pricebook.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4 px-6 py-4">
          {access.denied ? (
            <NoPermissionState permission={access.permission} compact />
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading entries...</p>
          ) : entryList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet. Add one below.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border">
              {entryList.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <TruncatedText
                      text={entry.productName ?? `Product #${entry.productId}`}
                      className="text-sm font-medium"
                    />
                    <p className="text-xs text-muted-foreground">
                      Qty &ge; {entry.minQuantity} &nbsp;&middot;&nbsp;{" "}
                      {(entry.unitPriceCents / 100).toLocaleString()}{" "}
                      {entry.productCurrency ?? pricebook?.currency ?? ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDeleteEntry(entry.id)}
                    aria-label="Remove entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Add Entry</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddEntry)} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel className="text-xs">Product <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Combobox
                            options={productOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Search products…"
                            searchPlaceholder="Search by name or SKU"
                            emptyText="No products found"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitPriceCents"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs">Price (cents) <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            placeholder="1000"
                            className="text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Min Qty</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            placeholder="1"
                            className="text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <LoadingButton
                  type="submit"
                  size="sm"
                  isPending={upsertEntry.isPending}
                  loadingText="Adding..."
                  className="text-xs"
                >
                  Add Entry
                </LoadingButton>
              </form>
            </Form>
          </div>
        </SheetBody>

        <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
