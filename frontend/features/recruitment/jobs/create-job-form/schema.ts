import { z } from "zod";
import {
  overviewWordCheck,
  responsibilitiesWordCheck,
  jobRequirementsWordCheck,
  benefitsWordCheck,
} from "./job-description-limits";

export const NO_HIRING_FLOW = "none";

/**
 * The picker's "start from scratch" option.
 *
 * Radix refuses `value=""` on a `SelectItem` — an empty value is how it spells
 * "cleared" — so an explicit sentinel stands in for "no template", exactly as
 * `NO_HIRING_FLOW` does one field over. It never leaves the form: the picker
 * reads it as "apply nothing" and the submit payload has no template field at all.
 */
export const NO_JOB_TEMPLATE = "none";

export const SCREENING_QUESTION_TYPES = ["TEXT", "YES_NO", "SINGLE_SELECT", "NUMBER"] as const;

export const screeningQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1, "Question text is required").max(500),
  type: z.enum(SCREENING_QUESTION_TYPES),
  required: z.boolean(),
  knockout: z.boolean(),
  knockoutAnswer: z.string().optional(),
  options: z.array(z.string()).optional(),
});
export type ScreeningQuestionValues = z.infer<typeof screeningQuestionSchema>;

export const INTERVIEW_ROUND_OPTIONS = [
  { value: "HR_ROUND", label: "HR Round" },
  { value: "TECHNICAL_ROUND", label: "Technical Round" },
  { value: "MANAGER_ROUND", label: "Manager Round" },
  { value: "FINAL_ROUND", label: "Final Round" },
] as const;

export const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE", "TEMPORARY", "CONSULTANT", "APPRENTICESHIP", "COMMISSION_BASED"] as const;
const WORK_MODES = ["ONSITE", "REMOTE", "HYBRID"] as const;
const SALARY_TYPES = ["MONTHLY", "ANNUAL", "HOURLY"] as const;
const STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
const VISIBILITIES = ["PUBLIC", "INTERNAL"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function optionalText(schema: z.ZodString) {
  return z.union([z.literal(""), schema]).optional();
}

function wordChecked(check: (v: string) => string | true) {
  return z
    .string()
    .superRefine((v, ctx) => {
      if (!v.trim()) return;
      const result = check(v);
      if (result !== true) ctx.addIssue({ code: "custom", message: result });
    })
    .optional();
}

export function toOptionalNumber(v: unknown): number | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export const createJobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Job Title must be at least 2 characters")
      .max(100, "Job Title must be at most 100 characters")
      .refine((v) => /^[a-zA-Z]/.test(v), "Job Title must start with a letter")
      .refine(
        (v) => !/[^a-zA-Z0-9\s\-',]/.test(v),
        "Job Title may only contain letters, numbers, hyphens, apostrophes, and commas",
      )
      .refine((v) => !/(.)\1{3,}/.test(v), "Job Title cannot have 4 or more consecutive identical characters")
      .refine((v) => !/\s{2,}/.test(v), "Job Title cannot have multiple consecutive spaces"),
    departmentId: z.string().optional(),
    jobType: z.enum(JOB_TYPES).optional(),
    workMode: z.enum(WORK_MODES).optional(),
    openings: z
      .number({ error: "Enter a valid number" })
      .int("Must be a whole number")
      .min(1, "At least 1 opening required")
      .max(999, "Too many openings")
      .optional(),

    country: z.string().optional(),
    stateCity: optionalText(z.string().min(2, "State/City must be at least 2 characters").max(100, "Too long")),
    officeLocation: optionalText(z.string().max(200, "Too long")),

    salaryMin: z.number().min(1, "Must be greater than 0").max(999_999_999, "Too large").optional(),
    salaryMax: z.number().min(1, "Must be greater than 0").max(999_999_999, "Too large").optional(),
    currency: z.string().optional(),
    salaryType: z.enum(SALARY_TYPES).optional(),
    bonus: z.string().max(200).optional(),

    minExperience: z.number().int().min(0, "Cannot be negative").max(50, "Too large").optional(),
    maxExperience: z.number().int().min(0).max(50).optional(),
    educationLevel: z.string().optional(),

    requiredSkills: z.array(z.string().min(1)).optional(),
    preferredSkills: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),

    overview: wordChecked(overviewWordCheck),
    responsibilities: wordChecked(responsibilitiesWordCheck),
    jobRequirements: wordChecked(jobRequirementsWordCheck),
    benefits: wordChecked(benefitsWordCheck),

    hiringManager: optionalText(z.string().max(100, "Too long")),
    hiringFlowId: z.string().optional(),
    jobTemplateId: z.string().optional(),
    interviewRounds: z.array(z.string()).optional(),

    resumeRequired: z.boolean(),
    coverLetterRequired: z.boolean(),
    screeningQuestions: z.array(screeningQuestionSchema).max(20).optional(),

    status: z.enum(STATUSES).optional(),
    visibility: z.enum(VISIBILITIES).optional(),
    applicationDeadline: z.string().optional(),

    priority: z.enum(PRIORITIES).optional(),
    referralEnabled: z.boolean(),
    approvalRequired: z.boolean(),
  })
  .refine((d) => d.salaryMin === undefined || d.salaryMax === undefined || d.salaryMin <= d.salaryMax, {
    message: "Min salary must be ≤ max salary",
    path: ["salaryMin"],
  })
  .refine(
    (d) => d.maxExperience === undefined || d.maxExperience >= (d.minExperience ?? 0),
    { message: "Max experience must be ≥ min experience", path: ["maxExperience"] }
  );

export type CreateJobFormValues = z.infer<typeof createJobFormSchema>;

export type JobFormBlock = "essentials" | "details" | "hiring";

export interface PublishRequirement {
  key: keyof CreateJobFormValues;
  label: string;
}

const ESSENTIAL_KEYS: ReadonlyArray<string> = [
  "title",
  "departmentId",
  "jobType",
  "workMode",
  "openings",
  "jobTemplateId",
];

const DETAIL_KEYS: ReadonlyArray<string> = [
  "country",
  "stateCity",
  "officeLocation",
  "salaryMin",
  "salaryMax",
  "currency",
  "salaryType",
  "bonus",
  "minExperience",
  "maxExperience",
  "educationLevel",
  "requiredSkills",
  "preferredSkills",
  "tags",
  "overview",
  "responsibilities",
  "jobRequirements",
  "benefits",
];

export function blockOf(key: string): JobFormBlock {
  if (ESSENTIAL_KEYS.includes(key)) return "essentials";
  if (DETAIL_KEYS.includes(key)) return "details";
  return "hiring";
}

const PUBLISH_REQUIRED: PublishRequirement[] = [
  { key: "title", label: "Job title" },
  { key: "departmentId", label: "Department" },
  { key: "jobType", label: "Employment type" },
  { key: "workMode", label: "Work mode" },
  { key: "openings", label: "Openings" },
  { key: "country", label: "Country" },
  { key: "stateCity", label: "State / city" },
  { key: "overview", label: "Overview" },
  { key: "responsibilities", label: "Responsibilities" },
  { key: "jobRequirements", label: "Requirements" },
];

function isBlank(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return Number.isNaN(v);
  return v === undefined || v === null;
}

export function missingForPublish(
  values: Partial<CreateJobFormValues>,
  { requireDepartment }: { requireDepartment: boolean },
): PublishRequirement[] {
  return PUBLISH_REQUIRED.filter(
    (r) => (r.key !== "departmentId" || requireDepartment) && isBlank(values[r.key]),
  );
}
