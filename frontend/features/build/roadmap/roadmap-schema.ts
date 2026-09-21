import { z } from "zod";

export const changelogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string(),
  type: z.enum(["feature", "improvement", "fix"]),
  version: z.string(),
  isPublished: z.boolean(),
});

export type ChangelogFormValues = z.infer<typeof changelogSchema>;

export const roadmapItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  category: z.string(),
  targetQuarter: z.string(),
  isPublic: z.boolean(),
});

export type RoadmapItemFormValues = z.infer<typeof roadmapItemSchema>;
