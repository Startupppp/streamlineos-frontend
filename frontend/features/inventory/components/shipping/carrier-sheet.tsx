"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateCarrier, useUpdateCarrier, type Carrier } from "@/hooks/api/inventory/shipping";
import { getErrorMessage } from "@/lib/get-error-message";

const carrierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  trackingUrlTemplate: z.string(),
  isActive: z.boolean(),
});

type CarrierFormValues = z.infer<typeof carrierSchema>;

interface CarrierSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  carrier?: Carrier;
}

export function CarrierSheet({ open, onOpenChange, carrier }: CarrierSheetProps) {
  const createMutation = useCreateCarrier();
  const updateMutation = useUpdateCarrier();
  const isEdit = carrier !== undefined;

  const form = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierSchema),
    defaultValues: {
      name: carrier?.name ?? "",
      code: carrier?.code ?? "",
      trackingUrlTemplate: carrier?.trackingUrlTemplate ?? "",
      isActive: carrier?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: carrier?.name ?? "",
        code: carrier?.code ?? "",
        trackingUrlTemplate: carrier?.trackingUrlTemplate ?? "",
        isActive: carrier?.isActive ?? true,
      });
    }
  }, [open, carrier, form]);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  function handleClose(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleIsActiveChange(checked: boolean): void {
    form.setValue("isActive", checked);
  }

  async function onSubmit(values: CarrierFormValues): Promise<void> {
    try {
      if (isEdit && carrier) {
        await updateMutation.mutateAsync({
          carrierId: carrier.id,
          name: values.name.trim(),
          code: values.code.trim(),
          trackingUrlTemplate: values.trackingUrlTemplate.trim() || undefined,
          isActive: values.isActive,
        });
        toast.success(`Carrier "${values.name}" updated`);
      } else {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          code: values.code.trim(),
          trackingUrlTemplate: values.trackingUrlTemplate.trim() || undefined,
          isActive: values.isActive,
        });
        toast.success(`Carrier "${values.name}" created`);
      }
      handleClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? `Edit ${carrier?.name}` : "Add Carrier"}
      description={isEdit ? "Update carrier details." : "Add a shipping carrier for tracking."}
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="carrier-form"
            size="sm"
            disabled={isPending}
          >
            {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Add Carrier")}
          </Button>
        </div>
      }
    >
      <form id="carrier-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="carrier-name" className="text-xs">Name *</Label>
          <Input
            id="carrier-name"
            placeholder="DHL Express"
            className="h-8 text-sm"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="carrier-code" className="text-xs">Code *</Label>
          <Input
            id="carrier-code"
            placeholder="DHL"
            className="h-8 text-sm"
            {...form.register("code")}
          />
          {form.formState.errors.code && (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="carrier-tracking-url" className="text-xs">Tracking URL Template</Label>
          <Input
            id="carrier-tracking-url"
            placeholder="https://track.carrier.com/{tracking}"
            className="h-8 text-sm"
            {...form.register("trackingUrlTemplate")}
          />
          <p className="text-[10px] text-muted-foreground">Use {"{tracking}"} as placeholder</p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="carrier-active"
            checked={form.watch("isActive")}
            onCheckedChange={handleIsActiveChange}
          />
          <Label htmlFor="carrier-active" className="text-sm cursor-pointer">Active</Label>
        </div>
      </form>
    </AppSheet>
  );
}
