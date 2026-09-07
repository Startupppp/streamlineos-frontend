import { z } from "zod";

export const invVendorContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  address: z.string().nullable(),
  currency: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  leadTimeDays: z.number().int().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listVendorsContract = z.object({
  items: z.array(invVendorContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const vendorPerformanceContract = z.object({
  vendorId: z.number().int(),
  vendorName: z.string(),
  totalOrders: z.number().int(),
  totalSpend: z.number(),
  avgLeadTime: z.number().nullable(),
  onTimeRate: z.number().nullable(),
  defectRate: z.number().nullable(),
});
