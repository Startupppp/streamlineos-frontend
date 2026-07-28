import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const renameGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});
export type RenameGroupInput = z.infer<typeof renameGroupSchema>;

export const transferOwnershipSchema = z.object({
  toUserId: z.string().min(1, "Please select a user"),
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
