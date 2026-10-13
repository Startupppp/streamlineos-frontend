import { z } from "zod";

export const calendarResourceListContract = z.array(z.object({
  id: z.number().int().positive(),
  kind: z.enum(["room", "equipment", "resource"]),
  ownership: z.enum(["calendar", "source"]),
  name: z.string(),
  location: z.string().nullable(),
  capacity: z.number().int().positive(),
  divisible: z.boolean(),
  requiresApproval: z.boolean(),
  status: z.enum(["active", "unavailable", "retired"]),
  version: z.number().int().positive(),
}));

export const calendarCapacityContract = z.object({
  resourceId: z.number().int().positive(),
  resourceVersion: z.string(),
  evaluatedAt: z.string(),
  coverage: z.enum(["complete", "partial"]),
  slices: z.array(z.object({
    start: z.string(), end: z.string(),
    confirmedUnits: z.number().int().nonnegative(),
    tentativeUnits: z.number().int().nonnegative(),
    proposedUnits: z.number().int().nonnegative(),
    availableUnits: z.number().int().nonnegative().nullable(),
    state: z.enum(["available", "limited", "over_capacity", "unknown"]),
    reasons: z.array(z.enum(["capacity", "location", "skill", "shift", "maintenance", "leave", "unavailable", "restricted_input"])),
  })),
});

export type CalendarResource = z.infer<typeof calendarResourceListContract>[number];
export type CalendarCapacity = z.infer<typeof calendarCapacityContract>;
