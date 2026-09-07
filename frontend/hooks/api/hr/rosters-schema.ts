import { z } from "zod";

const rosterRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  status: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const rosterEntryRowSchema = z.object({
  id: z.number().int(),
  rosterId: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  shiftId: z.number().int().nullable(),
  date: z.string(),
  isDayOff: z.boolean().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const rostersListContract = z.array(rosterRowSchema);

export const createRosterContract = rosterRowSchema;

export const rosterEntriesContract = z.array(rosterEntryRowSchema);

export const publishRosterContract = rosterRowSchema;
