import { z } from "zod";

export const biometricDeviceContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  ipAddress: z.string(),
  port: z.number(),
  vendor: z.string(),
  location: z.string().nullable(),
  isOnline: z.boolean(),
  lastSyncAt: z.string().nullable(),
  createdAt: z.string(),
});

export const biometricDeviceListContract = z.array(biometricDeviceContract);

export const biometricLogContract = z.object({
  id: z.number(),
  orgId: z.string(),
  deviceId: z.number(),
  userId: z.string().nullable(),
  punchTime: z.string(),
  punchType: z.string(),
  processed: z.boolean(),
  createdAt: z.string(),
});

export const biometricLogListContract = z.array(biometricLogContract);
