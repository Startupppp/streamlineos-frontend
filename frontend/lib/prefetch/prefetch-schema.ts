import { z } from "zod";
import { notificationListContract } from "@/hooks/api/notifications-schema";

const wireDate = () => z.string();

export const dashboardStatsContract = z.object({
  orgName: z.string(),
  orgSlug: z.string(),
  totalEmployees: z.number().int().nullable(),
  activeProjects: z.number().int().nullable(),
  presentToday: z.number().int().nullable(),
});

const hrDocumentSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  url: z.string().nullable(),
  type: z.string().nullable(),
  createdAt: wireDate(),
}).catchall(z.unknown());

export const hrDocumentListContract = z.object({
  data: z.array(hrDocumentSchema),
  pageInfo: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const notificationCursorPageContract = notificationListContract;

export const notificationUnreadCountContract = z.object({
  count: z.number().int(),
});
