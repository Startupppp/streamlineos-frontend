import { z } from "zod";
import type { CreateEnterpriseQuotePayload } from "@/hooks/api/billing/enterprise-quotes";

export const CONTRACT_TERMS = ["12", "24", "36"] as const;
const TERM_MONTHS = { "12": 12, "24": 24, "36": 36 } as const;

const seats = z
  .string()
  .trim()
  .regex(/^\d+$/, "Enter a whole number of seats")
  .refine((v) => Number(v) >= 1 && Number(v) <= 1_000_000, "Between 1 and 1,000,000 seats");

/** The form edits rupees; the backend stores whole paise, so the conversion is string arithmetic. */
function rupeesToPaise(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(`${whole}${fraction.padEnd(2, "0")}`);
}

export const createEnterpriseQuoteSchema = z
  .object({
    subject: z.string().trim().min(1, "Subject is required").max(255, "255 characters or fewer"),
    requestedSeats: seats,
    negotiatedSeats: seats,
    pricePerSeat: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1499 or 1499.50")
      .refine((v) => rupeesToPaise(v) <= 100_000_000, "At most ₹10,00,000 per seat"),
    contractTermMonths: z.enum(CONTRACT_TERMS),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    notes: z.string().max(10_000, "10,000 characters or fewer").optional(),
  })
  .transform(
    (v): CreateEnterpriseQuotePayload => ({
      subject: v.subject,
      requestedSeats: Number(v.requestedSeats),
      negotiatedSeats: Number(v.negotiatedSeats),
      pricePerSeatInPaise: rupeesToPaise(v.pricePerSeat),
      contractTermMonths: TERM_MONTHS[v.contractTermMonths],
      validUntil: v.validUntil,
      ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
    }),
  );

export type CreateEnterpriseQuoteForm = z.input<typeof createEnterpriseQuoteSchema>;
