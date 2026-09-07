import { z } from "zod";

export const sessionItemContract = z.object({
  id: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastActive: z.string(),
  createdAt: z.string(),
  browser: z.string(),
  os: z.string().nullable(),
  platform: z.string().nullable(),
  isCurrent: z.boolean(),
});

export const sessionListContract = z.array(sessionItemContract);

export const sessionRevokeOneContract = z.object({ success: z.literal(true) });

export const sessionRevokeAllContract = z.object({ revokedCount: z.number().int() });
