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

export const bookingAllocationContract = z.object({
  resourceId: z.number().int().positive(),
  resourceName: z.string(),
  ownership: z.enum(["calendar", "source"]),
  state: z.enum(["committed", "pending", "rejected", "uncertain", "released"]),
  reasonCode: z.string().nullable(),
  version: z.number().int().positive(),
  canResolve: z.boolean(),
  canApprove: z.boolean(),
  approvalReceiptId: z.string().nullable(),
});

export const bookingAllocationsContract = z.array(bookingAllocationContract);

export const pendingBookingAllocationsContract = z.object({
  items: z.array(z.object({
  bookingId: z.string().uuid(),
  resourceId: z.number().int().positive(),
  resourceName: z.string(),
  ownership: z.enum(["calendar", "source"]),
  startAt: z.string(),
  endAt: z.string(),
  state: z.enum(["pending", "uncertain"]),
  reasonCode: z.string().nullable(),
  version: z.number().int().positive(),
  canApprove: z.boolean(),
  approvalReceiptId: z.string().nullable(),
  })),
  nextCursor: z.string().nullable(),
});

export const legacyPendingBookingAllocationsContract = pendingBookingAllocationsContract.shape.items;

export const bookingAllocationResolutionContract = z.object({
  bookingId: z.string().uuid(),
  bookingStatus: z.enum(["pending", "confirmed", "declined"]),
  lifecycleVersion: z.number().int().positive(),
  allocation: z.object({
    resourceId: z.number().int().positive(),
    state: z.enum(["committed", "pending", "rejected", "uncertain"]),
    ownerReceiptId: z.string().nullable(),
    reasonCode: z.string().nullable(),
    version: z.number().int().positive(),
    resolvedAt: z.string().nullable(),
  }),
});

export type BookingResource = z.infer<typeof bookingResourceContract>;
export type BookingRuleResource = z.infer<typeof bookingRuleResourceContract>;
export type BookingResourceMaintenance = z.infer<typeof bookingResourceMaintenanceContract>;
export type BookingAllocation = z.infer<typeof bookingAllocationContract>;
export type PendingBookingAllocation = z.infer<typeof pendingBookingAllocationsContract>["items"][number];
export type PendingBookingAllocationPage = z.infer<typeof pendingBookingAllocationsContract>;
export type BookingAllocationResolution = z.infer<typeof bookingAllocationResolutionContract>;
