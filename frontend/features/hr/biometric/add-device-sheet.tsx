"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/api-client";
import {
  useCreateBiometricDevice,
  useUpdateBiometricDevice,
  type BiometricDevice,
} from "@/hooks/api/hr/biometric";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VENDORS = ["ZKTeco", "Suprema", "eSSL", "Other"] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  ipAddress: z.string().min(1, "IP address is required"),
  port: z.number().int().min(1).max(65535),
  vendor: z.enum(VENDORS),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: "",
  ipAddress: "",
  port: 4370,
  vendor: "ZKTeco",
  location: "",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  device?: BiometricDevice | null;
}

export function AddDeviceSheet({ open, onOpenChange, device }: Props) {
  const isEdit = Boolean(device);
  const createDevice = useCreateBiometricDevice();
  const updateDevice = useUpdateBiometricDevice();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      device
        ? {
            name: device.name,
            ipAddress: device.ipAddress,
            port: device.port,
            vendor: VENDORS.includes(device.vendor as (typeof VENDORS)[number])
              ? (device.vendor as (typeof VENDORS)[number])
              : "Other",
            location: device.location ?? "",
          }
        : EMPTY_VALUES,
    );
  }, [open, device, form]);

  const onSubmit = useCallback(
    (data: FormValues) => {
      const payload = { ...data, location: data.location || undefined };
      const handlers = {
        onSuccess: () => {
          toast.success(isEdit ? "Device updated" : "Device added");
          form.reset(EMPTY_VALUES);
          onOpenChange(false);
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      };
      if (device) updateDevice.mutate({ id: device.id, ...payload }, handlers);
      else createDevice.mutate(payload, handlers);
    },
    [device, isEdit, createDevice, updateDevice, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Biometric Device" : "Add Biometric Device"}
      description={
        isEdit
          ? "Update this fingerprint or face-recognition device"
          : "Connect a new fingerprint or face-recognition device"
      }
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save Changes" : "Add Device"}
      isPending={createDevice.isPending || updateDevice.isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Device Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Reception Entrance" className="h-9 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      IP Address
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.100" className="h-9 text-sm font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Port
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="h-9 text-sm"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="vendor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Vendor
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VENDORS.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Location{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Floor 2, Entrance A" className="h-9 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}
