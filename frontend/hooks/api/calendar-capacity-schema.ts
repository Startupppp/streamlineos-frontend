import { z } from "zod";

const calendarResourceContract = z.object({
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
});

export const calendarResourceListContract = z.object({
  items: z.array(calendarResourceContract),
  nextCursor: z.string().nullable(),
});

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

export type CalendarResourceList = z.infer<typeof calendarResourceListContract>;
export type CalendarCapacity = z.infer<typeof calendarCapacityContract>;

export const calendarPersonalCapacityContract = z.object({
  evaluatedAt: z.string(),
  coverage: z.enum(["complete", "partial"]),
  slices: z.array(z.object({
    start: z.string(),
    end: z.string(),
    state: z.enum(["available", "limited", "over_capacity", "unknown"]),
    availableUnits: z.number().int().min(0).max(1).nullable(),
    explanation: z.string(),
  })),
});

export type CalendarPersonalCapacity = z.infer<typeof calendarPersonalCapacityContract>;

export const calendarWarehouseCapacityContract = z.object({
  warehouseId: z.number().int().positive(),
  warehouseName: z.string(),
  warehouseVersion: z.string(),
  evaluatedAt: z.string(),
  coverage: z.literal("partial"),
  schedulingState: z.enum(["unscheduled", "unavailable"]),
  pendingPicks: z.number().int().nonnegative(),
  activePicks: z.number().int().nonnegative(),
  pendingPutaways: z.number().int().nonnegative(),
  activePutaways: z.number().int().nonnegative(),
  explanation: z.string(),
});

export type CalendarWarehouseCapacity = z.infer<typeof calendarWarehouseCapacityContract>;
