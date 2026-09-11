import { z } from "zod";
import type { CreateLoadInput } from "@/hooks/api/inventory/shipping-loads-schema";

export const loadCreateSchema = z.object({
  destination: z.string().max(200),
  vehicleRef: z.string().max(100),
  sourceWarehouseId: z.string(),
  carrierId: z.string(),
  shipmentIds: z.array(z.number().int()),
  transferIds: z.array(z.number().int()),
});

export type LoadCreateValues = z.infer<typeof loadCreateSchema>;

export const LOAD_CREATE_DEFAULTS: LoadCreateValues = {
  destination: "",
  vehicleRef: "",
  sourceWarehouseId: "",
  carrierId: "",
  shipmentIds: [],
  transferIds: [],
};

function optionalId(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function toCreateLoadInput(values: LoadCreateValues): CreateLoadInput {
  const destination = values.destination.trim();
  const vehicleRef = values.vehicleRef.trim();
  const sourceWarehouseId = optionalId(values.sourceWarehouseId);
  const carrierId = optionalId(values.carrierId);
  return {
    ...(destination ? { destination } : {}),
    ...(vehicleRef ? { vehicleRef } : {}),
    ...(sourceWarehouseId !== undefined ? { sourceWarehouseId } : {}),
    ...(carrierId !== undefined ? { carrierId } : {}),
    shipmentIds: values.shipmentIds,
    transferIds: values.transferIds,
  };
}
