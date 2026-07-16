"use client";

import { useFieldArray, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateInspection } from "@/hooks/api/inventory/quality";
import { InspectionLineRow } from "@/features/inventory/components/quality/inspection-line-row";

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
      <FormProvider {...form}>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">
              Source <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              className="text-xs"
              placeholder="e.g. GRN-001, manual"
              {...form.register("source")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground/80">Lines</p>
              <AnimatedIconButton type="button" icon={PlusIcon} iconSize={12} iconClassName="mr-1" size="sm" variant="outline" className="h-6 text-xs px-2" onClick={handleAddLine}>
                Add Line
              </AnimatedIconButton>
            </div>

            {form.formState.errors.lines?.root && (
              <p className="text-xs text-destructive">{form.formState.errors.lines.root.message}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <InspectionLineRow
                  key={field.id}
                  index={idx}
                  canRemove={fields.length > 1}
                  onRemove={handleRemoveLine}
                />
              ))}
            </div>
          </div>
        </form>
      </FormProvider>
    </AppSheet>
  );
}
