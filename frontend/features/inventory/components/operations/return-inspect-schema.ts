import { z } from "zod";

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
