import { z } from "zod";

/**
 * B7 — what an operator may assert about a parcel, mirroring the backend's
 * `carrierStatusSchema` exactly.
 *
 * The status set is the backend's, not the shipment-status enum: `DRAFT` and
 * `PACKED` are internal states nobody hears from a carrier, and offering them
 * here would produce a 400 from a control that looked legitimate.
 */
export const carrierStatusFormSchema = z.object({
  status: z.enum(["LABEL_CREATED", "SHIPPED", "DELIVERED", "CANCELLED"]),
  /** A local `datetime-local` value, converted to an ISO instant on submit. */
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

/** `datetime-local` gives a value with no zone; the API wants an instant. */
export function toIsoInstant(localValue: string): string {
  const parsed = new Date(localValue);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/** Now, in the shape a `datetime-local` input accepts. */
export function nowAsLocalInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}
