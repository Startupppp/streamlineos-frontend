import { z } from "zod";
import type { PlaybookEntry } from "@/hooks/api/crm/sales-schema";

/** Mirrors `playbookCreateSchema` / `playbookUpdateSchema`. */
export const playbookEntrySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  category: z.string().trim().max(80),
  content: z.string().max(10000),
});

export type PlaybookEntryValues = z.infer<typeof playbookEntrySchema>;

export function toPlaybookValues(entry: PlaybookEntry | null): PlaybookEntryValues {
  return { title: entry?.title ?? "", category: entry?.category ?? "", content: entry?.content ?? "" };
}
