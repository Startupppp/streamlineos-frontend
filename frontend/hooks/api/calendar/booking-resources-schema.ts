import { z } from "zod";

export const bookingResourceContract = z.object({
  id: z.number().int().positive(),
  kind: z.enum(["room", "equipment", "resource"]),
  ownership: z.enum(["calendar", "source"]),
  sourceKey: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  name: z.string(),
  location: z.string().nullable(),
  capacity: z.number().int().positive(),
  divisible: z.boolean(),
  accessibility: z.array(z.string()),
  requiresApproval: z.boolean(),
  status: z.enum(["active", "unavailable", "retired"]),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const bookingResourcesContract = z.array(bookingResourceContract);

export const bookingRuleResourceContract = z.object({
  resourceId: z.number().int().positive(),
  units: z.number().int().positive(),
  minimumCapacity: z.number().int().positive(),
  requiredLocation: z.string().nullable(),
  requiredAccessibility: z.array(z.string()),
});

export const bookingRuleResourcesContract = z.array(bookingRuleResourceContract);

export const bookingResourceMaintenanceContract = z.object({
  id: z.number().int().positive(),
  resourceId: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.enum(["active", "cancelled"]),
  reason: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type BookingResource = z.infer<typeof bookingResourceContract>;
export type BookingRuleResource = z.infer<typeof bookingRuleResourceContract>;
export type BookingResourceMaintenance = z.infer<typeof bookingResourceMaintenanceContract>;
