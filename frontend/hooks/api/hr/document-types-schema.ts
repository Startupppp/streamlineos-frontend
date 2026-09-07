import { z } from "zod";

export const documentTypeContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  countryCode: z.string().nullable(),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  roles: z.array(z.object({ roleSlug: z.string() })),
});

export const documentTypeListPageContract = z.object({
  data: z.array(documentTypeContract),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});
