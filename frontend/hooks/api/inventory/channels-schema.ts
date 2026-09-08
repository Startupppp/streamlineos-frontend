import { z } from "zod";

const invChannelContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  channelType: z.string().optional(),
  status: z.string().optional(),
  safetyBuffer: z.string().nullable(),
  publishThreshold: z.string().nullable(),
  warehouseIds: z.array(z.number().int()).nullable(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const channelDetailContract = invChannelContract;

export const listChannelsContract = z.array(invChannelContract);

export const syncStockContract = z.object({
  synced: z.number().int(),
  skipped: z.number().int(),
});

const publicationContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  channelId: z.number().int(),
  productVariantId: z.number().int(),
  publishedQty: z.string(),
  availableQty: z.string(),
  status: z.string(),
  error: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listPublicationsContract = z.object({
  items: z.array(publicationContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const retryPublicationsContract = z.object({
  retried: z.number().int(),
});

const tplConnectionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  provider: z.string(),
  status: z.string().optional(),
  externalWarehouseRef: z.string().nullable(),
  skuMapping: z.record(z.string(), z.string()).nullable(),
  lastSyncAt: z.string().nullable(),
  lastSyncStatus: z.string().nullable(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listTplConnectionsContract = z.array(tplConnectionContract);

export const tplConnectionDetailContract = tplConnectionContract;

export const syncTplConnectionContract = z.object({
  connectionId: z.number().int(),
  status: z.string(),
  message: z.string().optional(),
});
