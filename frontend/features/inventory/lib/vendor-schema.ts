import { z } from "zod";

export const VENDOR_NAME_RE = /^[A-Za-z][A-Za-z0-9 &.,\-'()]+$/;
export const VENDOR_CODE_RE = /^[A-Z0-9_-]+$/i;
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const vendorBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Vendor name must be at least 2 characters")
    .max(255, "Vendor name must be at most 255 characters")
    .refine((v) => VENDOR_NAME_RE.test(v.trim()), {
      message: "Name must start with a letter and contain only letters, numbers, spaces, & . , - ' ()",
    }),
  code: z
    .string()
    .max(50, "Code must be at most 50 characters")
    .refine((v) => !v || VENDOR_CODE_RE.test(v.trim()), {
      message: "Code may only contain letters, numbers, hyphens, and underscores",
    }),
  email: z.string().refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
    { message: "Invalid email address" },
  ),
  phone: z.string().max(30, "Phone must be at most 30 characters"),
  address: z.string().max(500, "Address must be at most 500 characters"),
  gstin: z
    .string()
    .refine((v) => !v || GSTIN_RE.test(v.trim().toUpperCase()), {
      message: "Invalid GSTIN format (must be 15 characters, e.g. 22AAAAA0000A1Z5)",
    })
    .refine((v) => !v || v.trim().length === 15, {
      message: "GSTIN must be exactly 15 characters",
    }),
  leadTimeDays: z
    .string()
    .refine((v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n >= 0 && n <= 365; }, {
      message: "Lead time must be between 0 and 365 days",
    }),
  paymentTermsDays: z
    .string()
    .refine((v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n >= 0 && n <= 365; }, {
      message: "Payment terms must be between 0 and 365 days",
    }),
  currency: z.string().min(1, "Currency is required").max(3, "Currency must be 3 characters"),
  notes: z.string().max(2000, "Notes must be at most 2000 characters"),
});

export const vendorEditSchema = vendorBaseSchema.extend({
  isActive: z.boolean(),
});
export type VendorEditFormValues = z.infer<typeof vendorEditSchema>;
