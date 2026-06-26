import { z } from "zod";

export const idSchema = z.coerce.number().int().positive();
export const uuidSchema = z.string().uuid();
export const slugSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase, hyphen-separated");

export const emailSchema = z.string().email().max(254);
export const phoneSchema = z.string().min(7).max(30);
export const urlSchema = z.string().url().max(2048);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const sortSchema = z.object({
  sortBy: z.string().min(1).max(50).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((r) => !r.from || !r.to || r.from <= r.to, {
    message: "`from` must be ≤ `to`",
    path: ["from"],
  });

export const searchSchema = z.object({
  q: z.string().trim().max(200).optional(),
});

export const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(50);

export const safeStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(5000)
  .refine((v) => !/<script|javascript:|on\w+=/i.test(v), {
    message: "Contains potentially unsafe content",
  });

export const moneySchema = z.coerce.number().min(0).max(1e12);
export const percentSchema = z.coerce.number().min(0).max(100);

export const statusFilterSchema = z.array(z.string().min(1).max(40)).max(20).optional();

export function paginatedQuerySchema<T extends z.ZodRawShape>(extra: T) {
  return paginationSchema.merge(sortSchema).merge(searchSchema).extend(extra);
}

export type SortDir = "asc" | "desc";
