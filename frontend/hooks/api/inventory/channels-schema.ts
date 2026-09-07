import { z } from "zod";

const invChannelContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  channelType: z.string(),
  config: z.record(z.string(), z.unknown()).nullable(),
  isActive: z.boolean(),
  lastSyncAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const channelDetailContract = invChannelContract;

export const listChannelsContract = z.object({
  items: z.array(invChannelContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const syncStockContract = z.object({
  channelId: z.number().int(),
  syncedAt: z.string(),
  itemsSynced: z.number().int(),
  errors: z.array(z.string()),
});

const publicationContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  channelId: z.number().int(),
  productVariantId: z.number().int(),
  status: z.string(),
  externalId: z.string().nullable(),
  lastPublishedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
  channel: z.object({ id: z.number().int(), name: z.string(), channelType: z.string() }).optional(),
});

export const listPublicationsContract = z.object({
  items: z.array(publicationContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const retryPublicationsContract = z.object({
  retried: z.number().int(),
  failed: z.number().int(),
});

const tplConnectionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  provider: z.string(),
  config: z.record(z.string(), z.unknown()).nullable(),
  status: z.string(),
  lastSyncAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listTplConnectionsContract = z.object({
  items: z.array(tplConnectionContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const tplConnectionDetailContract = tplConnectionContract;

export const syncTplConnectionContract = z.object({
  connectionId: z.number().int(),
  syncedAt: z.string(),
  itemsSynced: z.number().int(),
  errors: z.array(z.string()),
});
