import { z } from "zod";

export const chatPreviewUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .strict();

export const chatMemberUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string(),
  })
  .strict();
