import { z } from "zod";

const customFieldSchema = z.object({
  id: z.number().int(),
  entityType: z.string(),
  name: z.string(),
  label: z.string(),
  fieldType: z.string(),
  options: z.unknown().nullable(),
  isRequired: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const customFieldsListContract = z.object({
  fields: z.array(customFieldSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const customFieldMutatedContract = z.object({
  field: customFieldSchema,
});

export const deleteCustomFieldContract = z.object({ success: z.boolean() });
