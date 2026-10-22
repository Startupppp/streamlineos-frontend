import { z } from "zod";

export const carrierStatusFormSchema = z.object({
  status: z.enum(["LABEL_CREATED", "SHIPPED", "DELIVERED", "CANCELLED"]),
  occurredAt: z.string().min(1, "Say when the carrier says it happened"),
  description: z.string().max(500).optional(),
});

export type CarrierStatusFormInput = z.infer<typeof carrierStatusFormSchema>;

export const CARRIER_STATUS_OPTIONS: ReadonlyArray<{
  value: CarrierStatusFormInput["status"];
  label: string;
}> = [
  { value: "LABEL_CREATED", label: "Label created" },
  { value: "SHIPPED", label: "Picked up by carrier" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled by carrier" },
];

export function toIsoInstant(localValue: string): string {
  const parsed = new Date(localValue);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function nowAsLocalInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}
