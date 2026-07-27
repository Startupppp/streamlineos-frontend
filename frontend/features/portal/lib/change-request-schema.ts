import { z } from "zod";

export const changeRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string()
    .min(10, "Please provide more detail (at least 10 characters)")
    .max(2000, "Description cannot exceed 2000 characters"),
});

export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;
