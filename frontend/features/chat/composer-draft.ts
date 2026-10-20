import { z } from "zod";
import { RECORD_SEARCH_TYPES } from "./linked-record-meta";

export const LINKED_RECORD_LIMIT = 10;

const linkedRecordDraftsSchema = z
  .array(
    z.object({
      key: z.string(),
      type: z.enum(RECORD_SEARCH_TYPES),
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      href: z.string(),
    }),
  )
  .max(LINKED_RECORD_LIMIT);

export type LinkedRecordDraft = z.infer<typeof linkedRecordDraftsSchema>[number];

export function linksKeyFor(draftKey: string): string {
  return `${draftKey}:links`;
}

export function readDraftText(draftKey: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(draftKey) ?? "";
}

export function readDraftLinks(draftKey: string): LinkedRecordDraft[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(linksKeyFor(draftKey));
  if (!raw) return [];
  try {
    const parsed = linkedRecordDraftsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
