import { z } from "zod";

export const chatUsersContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string(),
  }),
).max(500);

export const kbPageSearchContract = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      icon: z.string().nullable(),
      snippet: z.string(),
    }),
  ),
  hasMore: z.boolean(),
  limit: z.number().int(),
});
