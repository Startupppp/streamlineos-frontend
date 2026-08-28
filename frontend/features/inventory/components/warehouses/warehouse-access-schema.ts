import { z } from "zod";

export const assignWarehouseUserSchema = z.object({
  userId: z.string().min(1, "Select a member to assign"),
});

export type AssignWarehouseUserInput = z.infer<typeof assignWarehouseUserSchema>;
