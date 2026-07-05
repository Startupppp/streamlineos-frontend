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
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import {
  useCreateChannel,
  useUpdateChannel,
  type Channel,
} from "@/hooks/api/inventory/channels";
import { getErrorMessage } from "@/lib/get-error-message";

const channelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  channelType: z.enum(["INTERNAL", "SHOPIFY", "WOOCOMMERCE", "MARKETPLACE", "B2B", "THREE_PL"]),
  status: z.enum(["ACTIVE", "PAUSED"]),
  safetyBuffer: z.string(),
  publishThreshold: z.string(),
  warehouseIds: z.array(z.number()),
});

type ChannelFormValues = z.infer<typeof channelSchema>;

interface ChannelSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel?: Channel;
}

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  SHOPIFY: "Shopify",
  WOOCOMMERCE: "WooCommerce",
  MARKETPLACE: "Marketplace",
  B2B: "B2B",
  THREE_PL: "3PL",
};

function buildDefaultValues(channel?: Channel): ChannelFormValues {
  return {
    name: channel?.name ?? "",
    channelType: channel?.channelType ?? "INTERNAL",
    status: channel?.status ?? "ACTIVE",
    safetyBuffer: channel?.safetyBuffer != null ? String(channel.safetyBuffer) : "",
    publishThreshold: channel?.publishThreshold != null ? String(channel.publishThreshold) : "",
    warehouseIds: channel?.warehouseIds ?? [],
  };
}

export function ChannelSheet({ open, onOpenChange, channel }: ChannelSheetProps) {
  const isEdit = channel !== undefined;
  const createMutation = useCreateChannel();
  const updateMutation = useUpdateChannel();
  const { data: warehouses = [] } = useWarehouses();

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: buildDefaultValues(channel),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(channel));
    }
  }, [open, channel, form]);

  function handleOpenChange(next: boolean): void {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handleCancel(): void {
    form.reset();
    onOpenChange(false);
  }

  async function onSubmit(values: ChannelFormValues): Promise<void> {
    const safetyBuffer = values.safetyBuffer ? Number(values.safetyBuffer) : undefined;
    const publishThreshold = values.publishThreshold ? Number(values.publishThreshold) : undefined;

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          channelId: channel.id,
          name: values.name.trim(),
          status: values.status,
          safetyBuffer,
          publishThreshold,
          warehouseIds: values.warehouseIds,
        });
        toast.success("Channel updated");
      } else {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          channelType: values.channelType,
          status: values.status,
          safetyBuffer,
          publishThreshold,
          warehouseIds: values.warehouseIds,
        });
        toast.success("Channel created");
      }
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? "Edit Channel" : "New Channel"}
      description={
        isEdit
          ? "Update channel settings and warehouse assignments."
          : "Create a new sales or fulfilment channel."
      }
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="channel-form"
            size="sm"
            disabled={isPending}
          >
            {isPending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create channel"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="channel-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Shopify Main Store" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channelType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel type *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(CHANNEL_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="safetyBuffer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Safety buffer (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="publishThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publish threshold (units)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {warehouses.length > 0 && (
            <FormField
              control={form.control}
              name="warehouseIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouses</FormLabel>
                  <div className="space-y-2 rounded-md border border-border p-3">
                    {warehouses.map((wh) => {
                      const checked = field.value.includes(wh.id);

                      function handleChecked(next: boolean): void {
                        if (next) {
                          field.onChange([...field.value, wh.id]);
                        } else {
                          field.onChange(field.value.filter((id) => id !== wh.id));
                        }
                      }

                      return (
                        <div key={wh.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`wh-${wh.id}`}
                            checked={checked}
                            onCheckedChange={handleChecked}
                          />
                          <Label htmlFor={`wh-${wh.id}`} className="text-sm font-normal cursor-pointer">
                            {wh.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>
    </AppSheet>
  );
}
