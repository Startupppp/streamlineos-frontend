import { z } from "zod";

/** `chatUnreadResponseSchema` */
export const chatUnreadContract = z
  .object({ total: z.number().int().min(0).max(100) })
  .strict();

/** `chatOnlineResponseSchema` */
export const chatOnlineUsersContract = z.array(
  z.object({
    userId: z.string(),
    status: z.string(),
    lastSeenAt: z.string(),
    userName: z.string().nullable(),
    userImage: z.string().nullable(),
  }),
);

/** `chatUsersResponseSchema` */
export const chatOrgUsersContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string().nullable(),
  }),
);
