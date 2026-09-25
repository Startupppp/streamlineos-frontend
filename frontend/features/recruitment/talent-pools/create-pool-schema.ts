import { z } from "zod";

/**
 * Tags are typed as one comma-separated line rather than collected through a
 * chip editor.
 *
 * A pool carries a handful of short labels and is created once; a tag widget
 * here would be more component than the task needs. The normalisation —
 * trimming, lowercasing, deduping — matches what the API does on the way in, so
 * what the recruiter sees after saving is what they typed.
 */
export const TAG_LIMIT = 20;

export function parseTags(raw: string): string[] {
  const tags = raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= 40);
  return [...new Set(tags)];
}

export const createPoolSchema = z.object({
  name: z.string().trim().min(1, "Give the pool a name.").max(200),
  description: z.string().trim().max(2000),
  tags: z
    .string()
    .max(1000)
    .refine((raw) => parseTags(raw).length <= TAG_LIMIT, {
      message: `A pool can carry at most ${TAG_LIMIT} tags.`,
    }),
});

export type CreatePoolValues = z.infer<typeof createPoolSchema>;

export function emptyPoolValues(): CreatePoolValues {
  return { name: "", description: "", tags: "" };
}
