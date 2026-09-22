import { z } from "zod";

export const createBugFromResultSchema = z.object({
  bugTitle: z.string().min(1, "Title is required"),
  bugSeverity: z.string(),
});

export type CreateBugFromResultFormValues = z.infer<typeof createBugFromResultSchema>;
