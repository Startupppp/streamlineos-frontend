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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useSetCarrierCredentials,
  type Carrier,
} from "@/hooks/api/inventory/shipping-carriers";
import { getErrorMessage } from "@/lib/get-error-message";

const carrierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  trackingUrlTemplate: z.string().optional(),
  transport: z.string().optional(),
  apiBaseUrl: z.string().optional(),
  apiCredential: z.string().optional(),
  webhookSecret: z.string().optional(),
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
  const credentialsMutation = useSetCarrierCredentials();
  const isEdit = carrier !== undefined;

  const form = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierSchema),
    defaultValues: {
      name: carrier?.name ?? "",
      code: carrier?.code ?? "",
      trackingUrlTemplate: carrier?.trackingUrlTemplate ?? "",
      transport: carrier?.transport ?? "",
      apiBaseUrl: carrier?.apiBaseUrl ?? "",
      apiCredential: "",
      webhookSecret: "",
      isActive: carrier?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: carrier?.name ?? "",
        code: carrier?.code ?? "",
        trackingUrlTemplate: carrier?.trackingUrlTemplate ?? "",
        transport: carrier?.transport ?? "",
        apiBaseUrl: carrier?.apiBaseUrl ?? "",
        apiCredential: "",
        webhookSecret: "",
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
      let carrierId: number;

      if (isEdit && carrier) {
        carrierId = carrier.id;
        await updateMutation.mutateAsync({
          carrierId: carrier.id,
          name: values.name.trim(),
          code: values.code.trim(),
          trackingUrlTemplate: values.trackingUrlTemplate?.trim() || undefined,
          isActive: values.isActive,
        });
      } else {
        const created = await createMutation.mutateAsync({
          name: values.name.trim(),
          code: values.code.trim(),
          trackingUrlTemplate: values.trackingUrlTemplate?.trim() || undefined,
          isActive: values.isActive,
        });
        carrierId = created.id;
      }

      // If transport or credentials were changed/specified, set them on the org row
      const transportVal = values.transport?.trim() || null;
      const apiBaseUrlVal = values.apiBaseUrl?.trim() || null;
      const apiCredentialVal = values.apiCredential?.trim() || undefined;
      const webhookSecretVal = values.webhookSecret?.trim() || undefined;

      if (transportVal || apiBaseUrlVal || apiCredentialVal || webhookSecretVal) {
        await credentialsMutation.mutateAsync({
          carrierId,
          transport: transportVal,
          apiBaseUrl: apiBaseUrlVal,
          apiCredential: apiCredentialVal,
          webhookSecret: webhookSecretVal,
        });
      }

      toast.success(
        isEdit
          ? `Carrier "${values.name}" updated`
          : `Carrier "${values.name}" created`,
      );
      handleClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    credentialsMutation.isPending;

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? `Edit ${carrier?.name}` : "Add Carrier"}
      description={
        isEdit
          ? "Update carrier details and integration settings."
          : "Add a shipping carrier for tracking and automated booking."
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
                  <Input placeholder="Delhivery Surface / Express" className="text-sm" {...field} />
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
                  <Input placeholder="DELHIVERY" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Integration Transport</FormLabel>
                <Select
                  value={field.value || "MANUAL"}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select transport" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual (No Integration)</SelectItem>
                    <SelectItem value="DELHIVERY">Delhivery (Express Sandbox / Prod)</SelectItem>
                    <SelectItem value="reference-http">Reference HTTP Carrier</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-micro text-muted-foreground">
                  Select DELHIVERY to integrate with Delhivery courier API.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("transport") === "DELHIVERY" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-semibold">Delhivery Credentials (Per-Tenant)</p>

              <FormField
                control={form.control}
                name="apiBaseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">API Base URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://staging-express.delhivery.com"
                        className="text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiCredential"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      API Token {carrier?.apiCredentialHint ? `(Current: ${carrier.apiCredentialHint})` : ""}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Paste Delhivery API token"
                        className="text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="webhookSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Webhook Secret</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Paste webhook secret (≥32 chars)"
                        className="text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="trackingUrlTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking URL Template</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://track.delhivery.com/p/{tracking}"
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
