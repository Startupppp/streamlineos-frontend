import { z } from "zod";
import type { LoadStatus } from "@/features/inventory/lib";

const loadStatusContract: z.ZodType<LoadStatus> = z.enum([
  "DRAFT",
  "DISPATCHED",
  "ARRIVED",
  "CLOSED",
  "CANCELLED",
]);

const loadContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  loadNumber: z.string(),
  sourceWarehouseId: z.number().int().nullable(),
  destination: z.string().nullable(),
  carrierId: z.number().int().nullable(),
  vehicleRef: z.string().nullable(),
  status: loadStatusContract,
  dispatchDate: z.string().nullable(),
  arrivalDate: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const loadLineContract = z.object({
  id: z.number().int(),
  loadId: z.number().int(),
  shipmentId: z.number().int().nullable(),
  transferId: z.number().int().nullable(),
});

export const loadListContract = z.object({
  items: z.array(loadContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const loadDetailContract = loadContract.extend({
  lines: z.array(loadLineContract),
});

export const loadContractSingle = loadContract;

export const createLoadContract = z.object({
  sourceWarehouseId: z.number().int().optional(),
  destination: z.string().optional(),
  carrierId: z.number().int().optional(),
  vehicleRef: z.string().optional(),
  shipmentIds: z.array(z.number().int()),
  transferIds: z.array(z.number().int()),
});

export type Load = z.infer<typeof loadContract>;
export type LoadDetail = z.infer<typeof loadDetailContract>;
export type LoadLine = z.infer<typeof loadLineContract>;
export type CreateLoadInput = z.infer<typeof createLoadContract>;
