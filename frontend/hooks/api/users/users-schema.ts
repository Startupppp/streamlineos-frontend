import { z } from "zod";

/**
 * Organization user counters. Every value is a Drizzle `count()`, which carries
 * `.mapWith(Number)`, so all six really are numbers and none is nullable — the
 * `?? 0` each has server-side is belt and braces, not a hint that a key can go
 * missing. A count that ever arrived as a string (a raw `db.execute` COUNT
 * would) is exactly what this rejects, because a string count renders as a
 * plausible-looking figure and sorts wrong.
 */

export const userStatsContract = z.object({
  total: z.number(),
  active: z.number(),
  suspended: z.number(),
  archived: z.number(),
  pendingInvitations: z.number(),
  newThisMonth: z.number(),
});

export type UserStats = z.infer<typeof userStatsContract>;
