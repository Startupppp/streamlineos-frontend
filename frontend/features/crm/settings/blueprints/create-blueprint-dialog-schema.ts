import { z } from "zod";

export const createBlueprintSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pipelineId: z.string().min(1, "Pipeline is required"),
});

export type CreateBlueprintFormValues = z.infer<typeof createBlueprintSchema>;
