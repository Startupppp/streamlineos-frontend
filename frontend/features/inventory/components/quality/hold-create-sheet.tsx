"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateQualityHold } from "@/hooks/api/inventory/quality";

const schema = z.object({
  variantId: z.string().min(1, "Required").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) > 0,
    "Must be a positive integer",
  ),
  locationId: z.string().optional(),
  lotId: z.string().optional(),
  serialId: z.string().optional(),
  qty: z.string().min(1, "Required").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) > 0,
    "Must be > 0",
  ),
  reason: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function HoldCreateSheet({ open, onOpenChange }: Props) {
  const createMut = useCreateQualityHold();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      variantId: "",
      locationId: "",
      lotId: "",
      serialId: "",
      qty: "",
      reason: "",
    },
  });

  function handleSubmit(values: FormValues): void {
    createMut.mutate(
      {
        productVariantId: Number(values.variantId),
        locationId: values.locationId !== "" && values.locationId !== undefined ? Number(values.locationId) : 0,
        ...(values.lotId !== "" && values.lotId !== undefined ? { lotId: Number(values.lotId) } : {}),
        ...(values.serialId !== "" && values.serialId !== undefined ? { serialId: Number(values.serialId) } : {}),
        quantity: Number(values.qty),
        reason: values.reason,
      },
      {
        onSuccess: () => {
          toast.success("Quality hold created");
          form.reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const footer = (
    <>
      <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={createMut.isPending}>
        {createMut.isPending ? "Creating…" : "Create Hold"}
      </Button>
    </>
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Quality Hold"
      description="Place inventory on a quality hold"
      footer={footer}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Variant ID *</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              placeholder="ID"
              {...form.register("variantId")}
            />
            {form.formState.errors.variantId && (
              <p className="text-[10px] text-destructive">{form.formState.errors.variantId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Qty *</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              placeholder="Quantity"
              {...form.register("qty")}
            />
            {form.formState.errors.qty && (
              <p className="text-[10px] text-destructive">{form.formState.errors.qty.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Location ID <span className="text-muted-foreground">(opt.)</span></Label>
            <Input
              className="h-8 text-xs"
              type="number"
              placeholder="Optional"
              {...form.register("locationId")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lot ID <span className="text-muted-foreground">(opt.)</span></Label>
            <Input
              className="h-8 text-xs"
              type="number"
              placeholder="Optional"
              {...form.register("lotId")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Serial ID <span className="text-muted-foreground">(opt.)</span></Label>
            <Input
              className="h-8 text-xs"
              type="number"
              placeholder="Optional"
              {...form.register("serialId")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Reason *</Label>
          <Textarea
            className="text-xs min-h-[80px] resize-none"
            placeholder="Describe the reason for this hold…"
            {...form.register("reason")}
          />
          {form.formState.errors.reason && (
            <p className="text-[10px] text-destructive">{form.formState.errors.reason.message}</p>
          )}
        </div>
      </form>
    </AppSheet>
  );
}
