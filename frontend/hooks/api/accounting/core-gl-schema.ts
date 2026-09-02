import { z } from "zod";

/**
 * The general ledger — every posting the books are built from.
 *
 * This is the ONE accounting surface where money is a JSON **number**. The
 * columns are `decimal(18,4)` (so a string from the driver), but the service
 * runs each through `emitAmount() = Number(decimal)` before emitting, and says
 * so in a comment. Every other accounting route emits decimal strings; a
 * contract copied from one of those would reject the entire ledger.
 *
 * The ledger row is also the one place where the hand-written client type had
 * the field NAMES wrong, not just the types — see the notes on each field.
 */

export const glRowContract = z.object({
  lineId: z.number(),
  entryId: z.number(),
  entryNumber: z.string(),
  /** The server sends `entryDate`. The client type called it `date`. */
  entryDate: z.string(),
  description: z.string().nullable(),
  entryDescription: z.string().nullable(),
  accountId: z.number(),
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.number(),
  credit: z.number(),
  /** Plain `text`, not a pg enum — the writer set is open and grows. */
  sourceType: z.string(),
  sourceId: z.string().nullable(),
  clientId: z.number().nullable(),
  vendorId: z.number().nullable(),
  projectId: z.number().nullable(),
  departmentId: z.string().nullable(),
  runningBalance: z.number(),
});

/**
 * Note the shape: `nextCursor` is hoisted to the top level and there is no
 * `pagination` object, so this is NOT the shared keyset page. `hasMore` and
 * `limit` are not sent at all — exhaustion is `nextCursor === null`.
 */
export const glResponseContract = z.object({
  openingBalance: z.number(),
  closingBalance: z.number(),
  items: z.array(glRowContract),
  nextCursor: z.string().nullable(),
});

/**
 * A bare array, not `{ items }`. `accountId` / `periodDebit` / `periodCredit`
 * are the real names; the client type called them `id` / `totalDebit` /
 * `totalCredit`, so all three read `undefined`.
 */
export const glAccountContract = z.object({
  accountId: z.number(),
  code: z.string(),
  name: z.string(),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  periodDebit: z.number(),
  periodCredit: z.number(),
  netActivity: z.number(),
});

export const glAccountsContract = z.array(glAccountContract);

export type GlRow = z.infer<typeof glRowContract>;
export type GlResponse = z.infer<typeof glResponseContract>;
export type GlAccount = z.infer<typeof glAccountContract>;
