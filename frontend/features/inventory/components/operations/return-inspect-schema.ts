import { z } from "zod";

/**
 * INV-209 / B9 — the verdict recorded after opening the box.
 *
 * The disposition is required here and optional at intake, which is the whole
 * point: a disposition typed from the customer's description is a guess, and a
 * guess must not be what posts stock.
 */
export const inspectReturnLineSchema = z.object({
  disposition: z.enum(["RESTOCK", "QUARANTINE", "SCRAP", "RETURN_TO_VENDOR"]),
  inspectionNotes: z.string().trim().max(1000).optional(),
});

export type InspectReturnLineFormValues = z.infer<typeof inspectReturnLineSchema>;

export const RETURN_DISPOSITIONS = [
  { value: "RESTOCK", label: "Restock", hint: "Resaleable — back to a sellable bin" },
  { value: "QUARANTINE", label: "Quarantine", hint: "Held pending a quality decision" },
  { value: "SCRAP", label: "Scrap", hint: "Condemned — never enters stock" },
  {
    value: "RETURN_TO_VENDOR",
    label: "Return to vendor",
    hint: "Blocked on the shelf, awaiting a vendor RMA",
  },
] as const;
