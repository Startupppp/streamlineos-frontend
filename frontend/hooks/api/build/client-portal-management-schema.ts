import { z } from "zod";

export const portalSettingsContract = z.object({
  portalPublishedAt: z.string().nullable(),
  grantCount: z.number().int().nonnegative(),
});

export const portalPreviewContract = z.object({
  project: z.object({
    id: z.number().int(),
    name: z.string(),
    key: z.string(),
    status: z.string(),
    startDate: z.string().nullable(),
    targetEndDate: z.string().nullable(),
  }),
  milestones: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      dueDate: z.string().nullable(),
      status: z.string(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: z.number().int(),
      ticketNumber: z.number().int(),
      title: z.string(),
      status: z.string(),
      dueDate: z.string().nullable(),
    }),
  ),
  attachments: z.array(
    z.object({
      id: z.number().int(),
      filename: z.string(),
      url: z.string(),
    }),
  ),
  comments: z.array(
    z.object({
      id: z.number().int(),
      body: z.string(),
      authorName: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export type PortalSettings = z.infer<typeof portalSettingsContract>;
export type PortalPreview = z.infer<typeof portalPreviewContract>;
