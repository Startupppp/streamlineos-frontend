import { z } from "zod";
import {
  RICE_CONFIDENCE_MAX,
  RICE_CONFIDENCE_MIN,
  RICE_EFFORT_MAX,
  RICE_EFFORT_MIN,
  RICE_IMPACT_MAX,
  RICE_IMPACT_MIN,
  RICE_REACH_MAX,
  RICE_REACH_MIN,
} from "./roadmap-constants";

const riceField = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((raw) => raw === "" || /^\d+$/.test(raw), `${label} must be a whole number`)
    .refine(
      (raw) => raw === "" || (Number(raw) >= min && Number(raw) <= max),
      `${label} must be between ${String(min)} and ${String(max)}`,
    );

export function parseRiceField(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export const changelogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string(),
  type: z.enum(["feature", "improvement", "fix"]),
  version: z.string(),
  isPublished: z.boolean(),
});

export type ChangelogFormValues = z.infer<typeof changelogSchema>;

export const roadmapItemSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string(),
    outcome: z.string(),
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
    horizon: z.enum(["now", "next", "later"]),
    category: z.string(),
    targetQuarter: z.string(),
    targetStart: z.string(),
    targetEnd: z.string(),
    projectId: z.string().refine(
      (value) => value === "" || (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))),
      "Choose a valid delivery project",
    ),
    epicTicketId: z.string(),
    goalId: z.string(),
    releaseId: z.string(),
    teamId: z.string(),
    isPublic: z.boolean(),
    reach: riceField(RICE_REACH_MIN, RICE_REACH_MAX, "Reach"),
    impact: riceField(RICE_IMPACT_MIN, RICE_IMPACT_MAX, "Impact"),
    confidence: riceField(RICE_CONFIDENCE_MIN, RICE_CONFIDENCE_MAX, "Confidence"),
    effort: riceField(RICE_EFFORT_MIN, RICE_EFFORT_MAX, "Effort"),
  })
  .refine(
    (data) => {
      if (!data.targetStart || !data.targetEnd) return true;
      return data.targetEnd >= data.targetStart;
    },
    { message: "Target end must be on or after target start", path: ["targetEnd"] },
  );

export type RoadmapItemFormValues = z.infer<typeof roadmapItemSchema>;
