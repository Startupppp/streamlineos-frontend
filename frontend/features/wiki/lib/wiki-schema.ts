import { z } from "zod";

export const chatUsersContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string(),
  }),
).max(500);

export const kbPageEditConflictContract = z.object({
  currentContentRevision: z.number().int().nullable(),
  lastEditedByName: z.string().nullable(),
  lastEditedAt: z.string().nullable(),
});

export type KbPageEditConflict = z.infer<typeof kbPageEditConflictContract>;

export const UNATTRIBUTED_PAGE_EDIT_CONFLICT: KbPageEditConflict = {
  currentContentRevision: null,
  lastEditedByName: null,
  lastEditedAt: null,
};

export const kbPageSearchContract = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      icon: z.string().nullable(),
      snippet: z.string(),
    }),
  ),
  hasMore: z.boolean(),
  limit: z.number().int(),
});
