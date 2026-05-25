import { z } from "zod";

export const assetFormSchema = z.object({
  name: z.string().trim().min(1, "Asset name is required").max(120),
  type: z.string().trim().min(1, "Type is required").max(64),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]),
  serialNumber: z.string().trim().max(64).optional().or(z.literal("")),
  assignedTo: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchaseCost: z.coerce
    .number()
    .min(0, "Cost cannot be negative")
    .max(999999999, "Cost is too large")
    .optional(),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const deviceFormSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  deviceType: z.string().trim().min(1, "Device type is required").max(64),
  deviceName: z.string().trim().min(1, "Device name is required").max(120),
  serialNumber: z.string().trim().max(64).optional().or(z.literal("")),
  brand: z.string().trim().max(64).optional().or(z.literal("")),
  model: z.string().trim().max(64).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
