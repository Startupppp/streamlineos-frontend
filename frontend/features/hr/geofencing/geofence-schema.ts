import { z } from "zod";

function coordinate(label: string, limit: number) {
  return z
    .string()
    .trim()
    .min(1, { message: `${label} is required`, abort: true })
    .refine((value) => Number.isFinite(Number(value)), { message: `${label} must be a number`, abort: true })
    .refine((value) => Math.abs(Number(value)) <= limit, `${label} must be between -${limit} and ${limit}`);
}

export const geofenceSchema = z.object({
  name: z.string().trim().min(1, "Location name is required").max(100, "Location name must be 100 characters or fewer"),
  lat: coordinate("Latitude", 90),
  lng: coordinate("Longitude", 180),
  radiusMeters: z.number().min(50).max(2000),
});

export type GeofenceFormValues = z.infer<typeof geofenceSchema>;

export const GEOFENCE_DEFAULTS: GeofenceFormValues = {
  name: "",
  lat: "",
  lng: "",
  radiusMeters: 200,
};
