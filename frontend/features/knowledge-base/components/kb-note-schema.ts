import { z } from "zod";

export const kbNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  text: z.string().min(1, "Content is required").max(50000, "Content is too long"),
});

export type KbNoteFormValues = z.infer<typeof kbNoteSchema>;
