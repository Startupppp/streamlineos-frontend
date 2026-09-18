import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

export const assetRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  type: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  serialNumber: z.string().nullable(),
  assignedTo: z.string().nullable(),
  assignedToMembershipId: z.number().int().nullable(),
  status: z.string(),
  purchaseDate: z.string().nullable(),
  purchaseCost: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  expectedReturnDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const assetCountsContract = z.object({
  total: z.number(),
  available: z.number(),
  assigned: z.number(),
  maintenance: z.number(),
  retired: z.number(),
});

export const assetListPageContract = z.object({
  data: z.array(assetRowContract),
  counts: assetCountsContract,
  pagination: cursorPaginationContract,
});
