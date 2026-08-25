"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useCreateCarrier,
  useUpdateCarrier,
  type Carrier,
} from "@/hooks/api/inventory/shipping";
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

export function CarrierSheet({
  open,
  onOpenChange,
  carrier,
}: CarrierSheetProps) {
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
      description={
        isEdit
          ? "Update carrier details."
          : "Add a shipping carrier for tracking."
      }
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="carrier-form"
            size="sm"
            isPending={isPending}
            loadingText={isEdit ? "Saving…" : "Creating…"}
          >
            {isEdit ? "Save Changes" : "Add Carrier"}
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="carrier-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="DHL Express" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="DHL" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="trackingUrlTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking URL Template</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://track.carrier.com/{tracking}"
                    className="text-sm"
                    {...field}
                  />
                </FormControl>
                <p className="text-micro text-muted-foreground">
                  Use {"{tracking}"} as placeholder
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="carrier-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel htmlFor="carrier-active" className="text-sm font-normal cursor-pointer">
                  Active
                </FormLabel>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
