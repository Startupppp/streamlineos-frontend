"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { HrSheet } from "@/components/shared/hr-sheet";
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
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GEOFENCE_DEFAULTS,
  GEOFENCE_PRESETS,
  geofenceSchema,
  type GeofenceFormValues,
} from "@/features/hr/geofencing/geofence-schema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fence?: Geofence | null;
}

export function GeofenceFormSheet({ open, onOpenChange, fence }: Props) {
  const isEdit = Boolean(fence);
  const createFence = useCreateGeofence();
  const updateFence = useUpdateGeofence();
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const form = useForm<GeofenceFormValues>({
    resolver: zodResolver(geofenceSchema),
    defaultValues: GEOFENCE_DEFAULTS,
  });

  const radiusValue = form.watch("radiusMeters");

  useEffect(() => {
    if (!open) return;
    if (fence) {
      form.reset({ name: fence.name, lat: fence.lat, lng: fence.lng, radiusMeters: fence.radiusMeters });
      const matchingPreset = GEOFENCE_PRESETS.find((p) => p.lat === fence.lat && p.lng === fence.lng);
      setSelectedPreset(matchingPreset ? matchingPreset.id : "custom");
    } else {
      form.reset(GEOFENCE_DEFAULTS);
      setSelectedPreset("custom");
    }
  }, [open, fence, form]);

  const detectLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latStr = position.coords.latitude.toFixed(6);
        const lngStr = position.coords.longitude.toFixed(6);

        form.setValue("lat", latStr, { shouldValidate: true, shouldDirty: true });
        form.setValue("lng", lngStr, { shouldValidate: true, shouldDirty: true });

        if (!form.getValues("name")) {
          form.setValue("name", "Current Location", { shouldValidate: true, shouldDirty: true });
        }

        setSelectedPreset("gps");
        setIsLocating(false);
        toast.success("Successfully captured current GPS location");
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Could not fetch location: ${err.message}. Please enter manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [form]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      setSelectedPreset(presetId);

      if (presetId === "gps") {
        detectLocation();
        return;
      }

      if (presetId === "custom") {
        return;
      }

      const preset = GEOFENCE_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        form.setValue("lat", preset.lat, { shouldValidate: true, shouldDirty: true });
        form.setValue("lng", preset.lng, { shouldValidate: true, shouldDirty: true });

        const currentName = form.getValues("name");
        const matchesOtherPreset = GEOFENCE_PRESETS.some((p) => p.name === currentName);
        if (!currentName || matchesOtherPreset || currentName === "Current Location") {
          form.setValue("name", preset.name, { shouldValidate: true, shouldDirty: true });
        }

        toast.success(`Coordinates set to ${preset.name}`);
      }
    },
    [detectLocation, form],
  );

  const onSubmit = useCallback(
    (data: GeofenceFormValues) => {
      const payload = { name: data.name, lat: data.lat, lng: data.lng, radiusMeters: data.radiusMeters };
      const handlers = {
        onSuccess: () => {
          toast.success(isEdit ? "Geofence updated" : "Geofence added");
          form.reset(GEOFENCE_DEFAULTS);
          setSelectedPreset("custom");
          onOpenChange(false);
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      };
      if (fence) updateFence.mutate({ geofencingId: fence.id, ...payload }, handlers);
      else createFence.mutate(payload, handlers);
    },
    [fence, isEdit, createFence, updateFence, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit geofence" : "Add geofence"}
      description="Define a location boundary for attendance validation"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Add location"}
      isPending={createFence.isPending || updateFence.isPending}
      isDirty={form.formState.isDirty}
      onDiscard={() => {
        form.reset();
        setSelectedPreset("custom");
      }}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Location name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Head Office" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                Quick Select Location / Preset
              </FormLabel>
              <span className="text-micro text-muted-foreground font-medium">Auto-fill coordinates</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedPreset} onValueChange={handleSelectPreset}>
                <SelectTrigger className="flex-1 text-sm bg-background" aria-label="Quick Select Location">
                  <SelectValue placeholder="Select location option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Manual entry / Custom coordinates</SelectItem>
                  <SelectItem value="gps">
                    <span className="flex items-center gap-2 text-primary font-medium">
                      <LocateFixed className="h-3.5 w-3.5 text-primary shrink-0" />
                      Detect current GPS location
                    </span>
                  </SelectItem>
                  <SelectGroup>
                    <SelectLabel>Office Presets</SelectLabel>
                    {GEOFENCE_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name} ({preset.lat}, {preset.lng})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={detectLocation}
                disabled={isLocating}
                className="shrink-0 text-xs font-medium gap-1.5 bg-background hover:bg-accent"
                title="Detect and fill current GPS location"
              >
                {isLocating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <LocateFixed className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <span>{isLocating ? "Locating..." : "Use Current Location"}</span>
              </Button>
            </div>
            <p className="text-micro text-muted-foreground leading-normal">
              Select an option above to automatically set latitude and longitude, or enter coordinates manually below.
            </p>
          </div>

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
                    <Input
                      inputMode="decimal"
                      placeholder="e.g. 13.0827"
                      className="text-sm font-mono"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSelectedPreset("custom");
                      }}
                    />
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
                    <Input
                      inputMode="decimal"
                      placeholder="e.g. 80.2707"
                      className="text-sm font-mono"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSelectedPreset("custom");
                      }}
                    />
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
                <div className="flex justify-between text-micro text-muted-foreground mt-1">
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
