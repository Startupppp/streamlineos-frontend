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

export interface GeofencePreset {
  id: string;
  name: string;
  lat: string;
  lng: string;
}

export const GEOFENCE_PRESETS: GeofencePreset[] = [
  { id: "bengaluru", name: "Bengaluru HQ", lat: "12.9716", lng: "77.5946" },
  { id: "mumbai", name: "Mumbai Office", lat: "19.0760", lng: "72.8777" },
  { id: "delhi", name: "Delhi NCR / Gurgaon", lat: "28.4595", lng: "77.0266" },
  { id: "hyderabad", name: "Hyderabad Tech Hub", lat: "17.4483", lng: "78.3742" },
  { id: "chennai", name: "Chennai Center", lat: "13.0827", lng: "80.2707" },
  { id: "pune", name: "Pune Hub", lat: "18.5204", lng: "73.8567" },
  { id: "san_francisco", name: "San Francisco HQ", lat: "37.7749", lng: "-122.4194" },
  { id: "new_york", name: "New York Office", lat: "40.7128", lng: "-74.0060" },
  { id: "london", name: "London Office", lat: "51.5074", lng: "-0.1278" },
  { id: "singapore", name: "Singapore Hub", lat: "1.3521", lng: "103.8198" },
  { id: "tokyo", name: "Tokyo Office", lat: "35.6762", lng: "139.6503" },
  { id: "sydney", name: "Sydney Office", lat: "-33.8688", lng: "151.2093" },
];

export const GEOFENCE_DEFAULTS: GeofenceFormValues = {
  name: "",
  lat: "",
  lng: "",
  radiusMeters: 200,
};

