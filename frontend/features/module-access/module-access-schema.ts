import { z } from "zod";

export const transferOwnershipSchema = z.object({
  toUserId: z.string().min(1, "Please select a user"),
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
