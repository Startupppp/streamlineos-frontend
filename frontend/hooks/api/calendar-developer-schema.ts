import { z } from "zod";

export const calendarApiScopes = [
  "calendar:availability:read",
  "calendar:bookings:read",
  "calendar:bookings:write",
  "calendar:lifecycle:write",
  "calendar:embeds:read",
] as const;

export const calendarDeveloperCredentialContract = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  keyPrefix: z.string(),
  scopes: z.array(z.enum(calendarApiScopes)),
  isRevoked: z.boolean(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export const calendarDeveloperCredentialPageContract = z.object({
  data: z.array(calendarDeveloperCredentialContract),
  pagination: z.object({
    limit: z.number().int().positive(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const createCalendarDeveloperCredentialContract = z.object({
  token: z.string(),
  credential: calendarDeveloperCredentialContract,
});

export const revokeCalendarDeveloperCredentialContract = z.object({ success: z.literal(true) });

export type CalendarApiScope = (typeof calendarApiScopes)[number];
export type CalendarDeveloperCredential = z.infer<typeof calendarDeveloperCredentialContract>;
export type CalendarDeveloperCredentialPage = z.infer<typeof calendarDeveloperCredentialPageContract>;
export type CreateCalendarDeveloperCredentialResult = z.infer<typeof createCalendarDeveloperCredentialContract>;
