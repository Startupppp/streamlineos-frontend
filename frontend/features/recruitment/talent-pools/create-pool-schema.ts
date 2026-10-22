import { z } from "zod";

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
