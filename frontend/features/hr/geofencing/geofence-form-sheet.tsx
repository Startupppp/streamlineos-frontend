"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateGeofence,
  useUpdateGeofence,
  type Geofence,
} from "@/hooks/api/hr/geofencing";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  lat: z.string().min(1, "Latitude is required"),
  lng: z.string().min(1, "Longitude is required"),
  radiusMeters: z.number().min(50).max(2000),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: "",
  lat: "",
  lng: "",
  radiusMeters: 200,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fence?: Geofence | null;
}

export function GeofenceFormSheet({ open, onOpenChange, fence }: Props) {
  const isEdit = Boolean(fence);
  const createFence = useCreateGeofence();
  const updateFence = useUpdateGeofence();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  const radiusValue = form.watch("radiusMeters");

  useEffect(() => {
    if (!open) return;
    form.reset(
      fence
        ? { name: fence.name, lat: fence.lat, lng: fence.lng, radiusMeters: fence.radiusMeters }
        : EMPTY_VALUES,
    );
  }, [open, fence, form]);

  const onSubmit = useCallback(
    (data: FormValues) => {
      const payload = { name: data.name, lat: data.lat, lng: data.lng, radiusMeters: data.radiusMeters };
      const handlers = {
        onSuccess: () => {
          toast.success(isEdit ? "Geofence updated" : "Geofence added");
          form.reset(EMPTY_VALUES);
          onOpenChange(false);
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      };
      if (fence) updateFence.mutate({ id: fence.id, ...payload }, handlers);
      else createFence.mutate(payload, handlers);
    },
    [fence, isEdit, createFence, updateFence, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Geofence" : "Add Geofence"}
      description="Define a location boundary for attendance validation"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save Changes" : "Add Location"}
      isPending={createFence.isPending || updateFence.isPending}
      isDirty={form.formState.isDirty}
      onDiscard={() => form.reset()}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Location Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Head Office" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="lat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Latitude <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="12.9716" className="text-sm font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lng"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Longitude <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="77.5946" className="text-sm font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="radiusMeters"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Radius
                  </FormLabel>
                  <span className="text-sm font-semibold text-primary">{radiusValue}m</span>
                </div>
                <FormControl>
                  <Slider
                    min={50}
                    max={2000}
                    step={50}
                    value={[field.value]}
                    onValueChange={(v) => field.onChange(v[0])}
                    className="w-full"
                  />
                </FormControl>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>50m</span>
                  <span>2000m</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}
