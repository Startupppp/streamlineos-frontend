import { z } from "zod";

export const QA_STATES = ["pending", "in_review", "approved", "rejected"] as const;
export type QaState = (typeof QA_STATES)[number];

export const releaseFormSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  version: z.string().min(1, "Required").max(50),
  description: z.string().max(2000).optional(),
  releaseDate: z.string().optional(),
  status: z.enum(["draft", "released", "archived"]),
  ownerUserId: z.string().nullable().optional(),
  qaState: z.enum(QA_STATES).nullable().optional(),
  deploymentEvidenceUrl: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\/.+/.test(v),
      { message: "Must be a valid URL starting with http:// or https://" },
    ),
});

export type ReleaseFormValues = z.infer<typeof releaseFormSchema>;
