import { z } from "zod";
import type { ZodError } from "zod";

const titleSchema = z
  .string()
  .trim()
  .min(2, "Title must be at least 2 characters")
  .max(200, "Title must be at most 200 characters")
  .regex(/[a-zA-Z]/, "Title must contain at least one letter")
  .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces");

const contentSchema = z
  .string()
  .trim()
  .min(10, "Content must be at least 10 characters")
  .max(5000, "Content must be at most 5000 characters")
  .regex(/[a-zA-Z0-9]/, "Content must contain at least one letter or number")
  .refine((v) => !/\s{3,}/.test(v), "Cannot have excessive consecutive spaces");

const optionalDateTime = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return undefined;
    const trimmed = v.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine(
    (v) => !v || !Number.isNaN(new Date(v).getTime()),
    "Enter a valid date and time",
  );

export const announcementTargetTypeSchema = z.enum([
  "ALL",
  "DEPARTMENT",
  "BRANCH",
  "ROLE",
]);

export const announcementStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "EXPIRED",
]);

export type AnnouncementTargetType = z.infer<typeof announcementTargetTypeSchema>;
export type AnnouncementStatus = z.infer<typeof announcementStatusSchema>;

export function isAnnouncementTargetType(value: string): value is AnnouncementTargetType {
  return announcementTargetTypeSchema.safeParse(value).success;
}

export function isAnnouncementStatus(value: string): value is AnnouncementStatus {
  return announcementStatusSchema.safeParse(value).success;
}

export function buildAnnouncementSchema(options?: { isEdit?: boolean }) {
  const isEdit = options?.isEdit ?? false;

  return z
    .object({
      title: titleSchema,
      content: contentSchema,
      targetType: announcementTargetTypeSchema,
      targetIds: z.array(z.string()).default([]),
      status: announcementStatusSchema,
      publishAt: optionalDateTime,
      expiresAt: optionalDateTime,
      isPinned: z.boolean(),
      attachmentUrls: z.array(z.string()).default([]),
    })
    .superRefine((data, ctx) => {
      if (data.status === "EXPIRED") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot set status to Expired — use an expiry date instead",
          path: ["status"],
        });
      }

      if (data.status === "SCHEDULED" && !data.publishAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Publish date is required for scheduled announcements",
          path: ["publishAt"],
        });
      }

      if (
        !isEdit &&
        data.status === "SCHEDULED" &&
        data.publishAt &&
        new Date(data.publishAt).getTime() <= Date.now()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Publish date must be in the future",
          path: ["publishAt"],
        });
      }

      if (
        data.expiresAt &&
        new Date(data.expiresAt).getTime() <= Date.now() &&
        !isEdit
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date must be in the future",
          path: ["expiresAt"],
        });
      }

      if (data.publishAt && data.expiresAt) {
        if (new Date(data.expiresAt).getTime() <= new Date(data.publishAt).getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Expiry must be after the publish date",
            path: ["expiresAt"],
          });
        }
      }

      if (
        data.targetType !== "ALL" &&
        (!data.targetIds || data.targetIds.length === 0)
      ) {
        const noun =
          data.targetType === "DEPARTMENT"
            ? "department"
            : data.targetType === "BRANCH"
              ? "branch"
              : "role";
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Select at least one ${noun}`,
          path: ["targetIds"],
        });
      }
    });
}

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
