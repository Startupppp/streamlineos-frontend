import { z } from "zod";
import { cursorPageInfoContract } from "@/hooks/api/cursor-page-schema";

/**
 * Worker records — names, work email and avatar, so PII on every row.
 *
 * The page is hand-rolled rather than the shared `buildCursorPage`, so the
 * envelope key is `pageInfo`, not `pagination`, and `nextCursor` is the raw
 * `workerId` UUID rather than an encoded cursor. `deletedAt` is always null on
 * this route (the query filters it out) but the column is nullable, so it is
 * contracted as nullable rather than as a literal.
 */

export const workerStatusContract = z.enum(["ACTIVE", "INACTIVE", "EXITED"]);

export const workerContract = z.object({
  workerId: z.string(),
  organizationId: z.string(),
  organizationPersonId: z.string(),
  workerNumber: z.string().nullable(),
  status: workerStatusContract,
  isPayee: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  workEmail: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  userId: z.string().nullable(),
});

export const workersPageContract = cursorPageInfoContract(workerContract);

export type WorkerRecord = z.infer<typeof workerContract>;
export type WorkersPageResponse = z.infer<typeof workersPageContract>;
