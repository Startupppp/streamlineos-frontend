import { z } from "zod";

function cursorPage<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    pagination: z.object({
      limit: z.number().int(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  });
}

export const portalUpdateSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
});

export const portalFileSchema = z.object({
  id: z.number().int(),
  filename: z.string(),
  url: z.string(),
});

export const portalRequestSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.string(),
  decisionComment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const portalUpdatesPageSchema = cursorPage(portalUpdateSchema);
export const portalFilesPageSchema = cursorPage(portalFileSchema);
export const portalRequestsPageSchema = cursorPage(portalRequestSchema);

export type PortalUpdate = z.infer<typeof portalUpdateSchema>;
export type PortalFile = z.infer<typeof portalFileSchema>;
export type PortalRequest = z.infer<typeof portalRequestSchema>;
export type PortalUpdatesPage = z.infer<typeof portalUpdatesPageSchema>;
export type PortalFilesPage = z.infer<typeof portalFilesPageSchema>;
export type PortalRequestsPage = z.infer<typeof portalRequestsPageSchema>;

export const PORTAL_CHILD_PAGE_SIZE = 25;
