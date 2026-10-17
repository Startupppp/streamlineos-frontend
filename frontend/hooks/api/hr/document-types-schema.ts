import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

export const documentTypeContract = z.object({
  id: z.coerce.number().int(),
  orgId: z.string().optional().default(""),
  name: z.string(),
  slug: z.string().optional().default(""),
  description: z.string().nullable().optional().default(null),
  countryCode: z.string().nullable().optional().default(null),
  isMandatory: z.boolean().nullable().optional().default(null),
  isActive: z.boolean().nullable().optional().default(null),
  sortOrder: z.number().int().nullable().optional().default(null),
  createdAt: z.string().optional().default(""),
  updatedAt: z.string().optional().default(""),
  roles: z.array(z.object({ roleSlug: z.string() })).optional().default([]),
});

const documentTypePageContract = z
  .object({
    data: z.array(documentTypeContract),
    pagination: cursorPaginationContract.optional(),
  })
  .transform((value) => ({
    data: value.data,
    pagination: value.pagination ?? {
      limit: value.data.length,
      hasMore: false,
      nextCursor: null as string | null,
    },
  }));

export const documentTypeListPageContract = z.union([
  documentTypePageContract,
  z.array(documentTypeContract).transform((data) => ({
    data,
    pagination: { limit: data.length, hasMore: false, nextCursor: null as string | null },
  })),
  z.object({ items: z.array(documentTypeContract) }).transform((value) => ({
    data: value.items,
    pagination: { limit: value.items.length, hasMore: false, nextCursor: null as string | null },
  })),
]);
