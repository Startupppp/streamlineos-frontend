"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateInspection } from "@/hooks/api/inventory/quality";

const lineSchema = z.object({
  variantId: z.string().min(1, "Required").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) > 0,
    "Required",
  ),
  lotId: z.string().optional(),
  serialId: z.string().optional(),
  qty: z.string().min(1, "Required").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) > 0,
    "Must be > 0",
  ),
});

const schema = z.object({
  source: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one line"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateInspectionSheet({ open, onOpenChange }: Props) {
  const createMut = useCreateInspection();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "", lines: [{ variantId: "", lotId: "", serialId: "", qty: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  function handleSubmit(values: FormValues): void {
    const lines = values.lines.map((l) => ({
      variantId: Number(l.variantId),
      ...(l.lotId !== "" && l.lotId !== undefined ? { lotId: Number(l.lotId) } : {}),
      ...(l.serialId !== "" && l.serialId !== undefined ? { serialId: Number(l.serialId) } : {}),
      qty: Number(l.qty),
    }));

    createMut.mutate(
      { source: values.source || undefined, lines },
      {
        onSuccess: () => {
          toast.success("Inspection created");
          form.reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleAddLine(): void {
    append({ variantId: "", lotId: "", serialId: "", qty: "" });
  }

  function handleRemoveLine(idx: number): void {
    remove(idx);
  }

  const footer = (
    <>
      <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={createMut.isPending}>
        {createMut.isPending ? "Creating…" : "Create Inspection"}
      </Button>
    </>
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Inspection"
      description="Create a manual quality inspection"
      footer={footer}
    >
      <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-1.5">
          <Label className="text-xs">Source <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            className="h-8 text-xs"
            placeholder="e.g. GRN-001, manual"
            {...form.register("source")}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Lines</p>
            <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2" onClick={handleAddLine}>
              <Plus className="h-3 w-3 mr-1" />Add Line
            </Button>
          </div>

          {form.formState.errors.lines?.root && (
            <p className="text-xs text-destructive">{form.formState.errors.lines.root.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="rounded-md border border-border p-3 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Variant ID *</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      placeholder="ID"
                      {...form.register(`lines.${idx}.variantId`)}
                    />
                    {form.formState.errors.lines?.[idx]?.variantId && (
                      <p className="text-[10px] text-destructive">{form.formState.errors.lines[idx]?.variantId?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Qty *</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      placeholder="Qty"
                      {...form.register(`lines.${idx}.qty`)}
                    />
                    {form.formState.errors.lines?.[idx]?.qty && (
                      <p className="text-[10px] text-destructive">{form.formState.errors.lines[idx]?.qty?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Lot ID</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      placeholder="Optional"
                      {...form.register(`lines.${idx}.lotId`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Serial ID</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      placeholder="Optional"
                      {...form.register(`lines.${idx}.serialId`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </AppSheet>
  );
}
