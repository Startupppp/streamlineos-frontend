import { z } from "zod";

/**
 * Response contracts for the two WATCHER lists.
 *
 * Both shipped the same defect and both had the same consequence: the star
 * never filled, `aria-label` was permanently "Follow", and the un-follow branch
 * was unreachable — so somebody who followed a ticket could never stop, and kept
 * receiving watcher notifications. `follow` uses `onConflictDoNothing`, so the
 * repeat clicks returned success and changed nothing. On the build side `user`
 * pointed at `organization_members`, so every avatar fell back to "?" and
 * `key={w.userId}` was `undefined` on every row.
 *
 * `userId` decides an equality test (`w.userId === currentUserId`), and a
 * comparison that silently collapses to false renders a plausible screen rather
 * than an error. That is the whole reason these two are contracted first.
 *
 * Derived from `support-workspace.service.ts:249-253` and
 * `projects-ticket-subresources.service.ts:245-248`, with column nullability
 * from `db/schema/support/support-workspace.ts` and
 * `db/schema/build/ticket-collaboration.ts`. Both key sets are already asserted
 * by backend wire-shape specs (`support-watchers-wire-shape.spec.ts:59`,
 * `ticket-watchers-wire-shape.spec.ts:68`), so `.strict()` here is checked on
 * both sides of the wire.
 *
 * THE TWO ROWS ARE NOT THE SAME SHAPE and must not share a contract: support
 * emits `orgId` and a 3-key `user`; build emits no `orgId` and a 6-key `user`
 * carrying `firstName`, `lastName` and `email`.
 */

const supportWatcherUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .strict();

export const supportTicketWatcherContract = z
  .object({
    id: z.number(),
    orgId: z.string(),
    ticketId: z.number(),
    createdAt: z.string(),
    userId: z.string().nullable(),
    user: supportWatcherUserContract.nullable(),
  })
  .strict();

export const supportTicketWatchersContract = z.array(supportTicketWatcherContract);

const buildWatcherUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string(),
  })
  .strict();

export const buildTicketWatcherContract = z
  .object({
    id: z.number(),
    ticketId: z.number(),
    createdAt: z.string(),
    userId: z.string().nullable(),
    user: buildWatcherUserContract.nullable(),
  })
  .strict();

export const buildTicketWatchersContract = z.array(buildTicketWatcherContract);
