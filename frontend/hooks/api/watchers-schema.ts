import { z } from "zod";


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

export const buildWatcherMutationContract = z
  .object({
    userId: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    membershipId: z.number().int(),
  })
  .strict();
