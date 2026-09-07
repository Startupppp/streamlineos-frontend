import { z } from "zod";

export const geofenceRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  lat: z.string(),
  lng: z.string(),
  radiusMeters: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const geofenceListContract = z.array(geofenceRowContract);
