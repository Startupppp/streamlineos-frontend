"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/api-client";
import { useCreateGeofence } from "@/hooks/api/hr/geofencing";
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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GeofenceFormSheet({ open, onOpenChange }: Props) {
  const createFence = useCreateGeofence();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      lat: "",
      lng: "",
      radiusMeters: 200,
    },
  });

  const radiusValue = form.watch("radiusMeters");

  const onSubmit = useCallback(
    (data: FormValues) => {
      createFence.mutate(
        { name: data.name, lat: data.lat, lng: data.lng, radiusMeters: data.radiusMeters },
        {
          onSuccess: () => {
            toast.success("Geofence added");
            form.reset();
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createFence, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add Geofence"
      description="Define a location boundary for attendance validation"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Add Location"
      isPending={createFence.isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Location Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Head Office" className="h-9 text-sm" {...field} />
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
                    Latitude
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="12.9716" className="h-9 text-sm font-mono" {...field} />
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
                    Longitude
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="77.5946" className="h-9 text-sm font-mono" {...field} />
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
                  <span className="text-sm font-semibold text-violet-600">{radiusValue}m</span>
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
