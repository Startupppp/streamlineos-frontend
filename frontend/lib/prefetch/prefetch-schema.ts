import { z } from "zod";

const wireDate = () => z.string();
const nullableWireDate = () => z.string().nullable();

export const projectDetailContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  clientMembershipId: z.number().int().nullable(),
  managerMembershipId: z.number().int().nullable(),
  startDate: nullableWireDate(),
  endDate: nullableWireDate(),
  status: z.string(),
  priority: z.string(),
  dealId: z.number().int().nullable(),
  managedProductId: z.number().int().nullable(),
  pmWorkspaceId: z.number().int().nullable(),
  budget: z.number().nullable(),
  budgetMinor: z.number().int().nullable(),
  budgetCurrency: z.string().nullable(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: nullableWireDate(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const dashboardStatsContract = z.object({
  openTickets: z.number().int().optional(),
  completedThisWeek: z.number().int().optional(),
  overdueItems: z.number().int().optional(),
  teamVelocity: z.number().optional(),
}).catchall(z.unknown());

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

const hrAssetSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  status: z.string(),
}).catchall(z.unknown());

export const hrAssetListContract = z.object({
  data: z.array(hrAssetSchema),
  counts: z.object({
    total: z.number().int(),
    available: z.number().int(),
    assigned: z.number().int(),
    maintenance: z.number().int(),
    retired: z.number().int(),
  }),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

const notificationSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: wireDate(),
}).catchall(z.unknown());

export const notificationCursorPageContract = z.object({
  data: z.array(notificationSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.number().int().nullable(),
  }),
});

export const notificationUnreadCountContract = z.object({
  count: z.number().int(),
});
