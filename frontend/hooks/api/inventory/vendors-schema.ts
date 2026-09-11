import { z } from "zod";

export const invVendorContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  clientId: z.number().int().nullable(),
  name: z.string(),
  code: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  gstin: z.string().nullable(),
  leadTimeDays: z.number().int(),
  paymentTermsDays: z.number().int(),
  currency: z.string(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VendorResponse = z.infer<typeof invVendorContract>;

export const listVendorsContract = z.object({
  items: z.array(invVendorContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const vendorPerformanceContract = z.object({
  vendorId: z.number().int(),
  onTimeRate: z.number(),
  fillRate: z.number(),
  avgLeadTimeDays: z.number(),
  returnRate: z.number(),
  openPoCount: z.number().int(),
  totalSpend: z.number(),
});

export type VendorPerformanceData = z.infer<typeof vendorPerformanceContract>;
