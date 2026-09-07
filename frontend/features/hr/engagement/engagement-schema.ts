import { z } from "zod";

const recognitionUserContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});

export const recognitionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  fromUserId: z.string(),
  fromMembershipId: z.number().int().nullable(),
  toUserId: z.string(),
  toMembershipId: z.number().int().nullable(),
  message: z.string(),
  category: z.string(),
  isPublic: z.boolean(),
  createdAt: z.string(),
  fromUser: recognitionUserContract,
  toUser: recognitionUserContract,
});

export const recognitionListContract = z.array(recognitionContract);

export type RecognitionResponse = z.infer<typeof recognitionContract>;
