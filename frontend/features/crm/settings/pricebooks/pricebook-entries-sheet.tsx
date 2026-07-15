"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getErrorMessage } from "@/lib/get-error-message";
import type { Pricebook } from "@/types/crm/pricebooks";

const entrySchema = z.object({
  productId: z.string().min(1, "Product ID required"),
  unitPriceCents: z.string().min(1, "Price required"),
  minQuantity: z.string(),
});

type EntryFormValues = z.infer<typeof entrySchema>;

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

  const { data: entries, isLoading } = usePricebookEntries(pricebookId);
  const upsertEntry = useUpsertPricebookEntry();
  const deleteEntry = useDeletePricebookEntry();

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
          {isLoading ? (
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
                    <p className="text-sm font-medium truncate">
                      {entry.productName ?? `Product #${entry.productId}`}
                    </p>
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
                      <FormItem>
                        <FormLabel className="text-xs">Product ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            placeholder="123"
                            className="text-xs"
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
                      <FormItem>
                        <FormLabel className="text-xs">Price (cents)</FormLabel>
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
