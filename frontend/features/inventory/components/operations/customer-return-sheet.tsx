"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateCustomerReturn } from "@/hooks/api/inventory/operations";
import { getErrorMessage } from "@/lib/get-error-message";

const DISPOSITIONS = [
  { value: "RESTOCK", label: "Restock" },
  { value: "QUARANTINE", label: "Quarantine" },
  { value: "SCRAP", label: "Scrap" },
] as const;

const lineSchema = z.object({
  productVariantId: z.number({ error: "Required" }).int().positive(),
  quantity: z.number({ error: "Required" }).positive(),
  reason: z.string().min(1, "Reason is required").max(500),
  disposition: z.enum(["RESTOCK", "QUARANTINE", "SCRAP"]),
  targetLocationId: z.number().int().positive().optional(),
});

const formSchema = z.object({
  soId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1, "At least one line is required"),
});

type FormValues = z.infer<typeof formSchema>;

export interface CustomerReturnSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerReturnSheet({ open, onOpenChange }: CustomerReturnSheetProps) {
  const createMutation = useCreateCustomerReturn();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
      lines: [{ productVariantId: 0, quantity: 1, reason: "", disposition: "RESTOCK", targetLocationId: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  function handleClose(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  function handleAddLine(): void {
    append({ productVariantId: 0, quantity: 1, reason: "", disposition: "RESTOCK", targetLocationId: undefined });
  }

  function handleRemoveLine(index: number): void {
    if (fields.length > 1) remove(index);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      await createMutation.mutateAsync({
        soId: values.soId,
        notes: values.notes?.trim() || undefined,
        lines: values.lines.map((l) => ({
          productVariantId: l.productVariantId,
          quantity: l.quantity,
          reason: l.reason,
          disposition: l.disposition,
          targetLocationId: l.targetLocationId,
        })),
      });
      toast.success("Customer return created");
      handleClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="New Customer Return"
      description="Create a return merchandise authorization for a customer."
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="customer-return-form"
            size="sm"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Return"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="customer-return-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
          <FormField
            control={form.control}
            name="soId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sales Order ID (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Sales order ID"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Return Lines</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add Line
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-border/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Line {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => handleRemoveLine(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.productVariantId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Variant ID *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Product variant ID"
                            value={f.value || ""}
                            onChange={(e) => f.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={f.value || ""}
                            onChange={(e) => f.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.disposition`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Disposition *</FormLabel>
                        <Select value={f.value} onValueChange={f.onChange}>
                          <FormControl>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DISPOSITIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.targetLocationId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Target Location ID</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Optional"
                            value={f.value ?? ""}
                            onChange={(e) => f.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`lines.${index}.reason`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Reason *</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe the return reason" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Any notes for this return" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
