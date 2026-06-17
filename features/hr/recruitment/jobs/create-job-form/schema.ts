import { z } from "zod";

export const INTERVIEW_ROUND_OPTIONS = [
  { value: "HR_ROUND", label: "HR Round" },
  { value: "TECHNICAL_ROUND", label: "Technical Round" },
  { value: "MANAGER_ROUND", label: "Manager Round" },
  { value: "FINAL_ROUND", label: "Final Round" },
] as const;

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE", "TEMPORARY", "CONSULTANT", "APPRENTICESHIP", "COMMISSION_BASED"] as const;
const WORK_MODES = ["ONSITE", "REMOTE", "HYBRID"] as const;
const SALARY_TYPES = ["MONTHLY", "ANNUAL", "HOURLY"] as const;
const STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
const VISIBILITIES = ["PUBLIC", "INTERNAL"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const createJobFormSchema = z
  .object({
    title: z
      .string()
      .min(2, "Job Title must be at least 2 characters")
      .max(100, "Job Title must be at most 100 characters")
      .refine((v) => /^[a-zA-Z]/.test(v.trim()), "Must start with a letter")
      .refine((v) => !/[^a-zA-Z0-9\s\-',]/.test(v.trim()), "Invalid characters in title")
      .refine((v) => !/(.)\1{3,}/.test(v.trim()), "Too many consecutive identical characters")
      .refine((v) => !/\s{2,}/.test(v), "Multiple consecutive spaces not allowed"),
    departmentId: z.string().min(1, "Department is required"),
    role: z
      .string()
      .min(2, "Role is required")
      .max(100, "Role must be at most 100 characters"),
    jobType: z.enum(JOB_TYPES, { error: "Job Type is required" }),
    workMode: z.enum(WORK_MODES, { error: "Work Mode is required" }),
    openings: z
      .number({ error: "Enter a valid number" })
      .int("Must be a whole number")
      .min(1, "At least 1 opening required")
      .max(9999, "Too many openings"),

    country: z.string().min(1, "Country is required"),
    stateCity: z.string().min(2, "State/City is required").max(100, "Too long"),
    officeLocation: z.string().min(2, "Office Location is required").max(200, "Too long"),

    salaryMin: z
      .number({ error: "Enter a valid amount" })
      .min(1, "Must be greater than 0")
      .max(999_999_999, "Too large"),
    salaryMax: z
      .number({ error: "Enter a valid amount" })
      .min(1, "Must be greater than 0")
      .max(999_999_999, "Too large"),
    currency: z.string().min(1, "Currency is required"),
    salaryType: z.enum(SALARY_TYPES, { error: "Salary Type is required" }),
    bonus: z.string().max(200).optional(),

    minExperience: z
      .number({ error: "Enter years of experience" })
      .int()
      .min(0, "Cannot be negative")
      .max(50, "Too large"),
    maxExperience: z
      .number({ error: "Enter years of experience" })
      .int()
      .min(0)
      .max(50)
      .optional(),
    educationLevel: z.string().min(1, "Education Level is required"),

    requiredSkills: z.array(z.string().min(1)).min(1, "At least one required skill"),
    preferredSkills: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),

    overview: z.string().min(10, "Overview must be at least 10 characters").max(5000),
    responsibilities: z.string().min(10, "Responsibilities must be at least 10 characters").max(5000),
    jobRequirements: z.string().min(10, "Requirements must be at least 10 characters").max(5000),
    benefits: z.string().max(5000).optional(),

    hiringManager: z.string().min(2, "Hiring Manager is required").max(100),
    interviewRounds: z.array(z.string()).min(1, "Select at least one interview round"),
    questionBankMapping: z.string().min(1, "Question Bank Mapping is required"),

    resumeRequired: z.boolean(),
    coverLetterRequired: z.boolean(),
    customFields: z.string().max(500).optional(),

    status: z.enum(STATUSES, { error: "Status is required" }),
    visibility: z.enum(VISIBILITIES, { error: "Visibility is required" }),
    applicationDeadline: z.string().optional(),

    priority: z.enum(PRIORITIES, { error: "Priority is required" }),
    referralEnabled: z.boolean(),
    approvalRequired: z.boolean(),
  })
  .refine((d) => d.salaryMin <= d.salaryMax, {
    message: "Min salary must be ≤ max salary",
    path: ["salaryMin"],
  })
  .refine(
    (d) => d.maxExperience === undefined || d.maxExperience >= d.minExperience,
    { message: "Max experience must be ≥ min experience", path: ["maxExperience"] }
  );

export type CreateJobFormValues = z.infer<typeof createJobFormSchema>;

export const SECTION_KEYS: Array<keyof CreateJobFormValues>[] = [
  ["title", "departmentId", "role", "jobType", "workMode", "openings"],
  ["country", "stateCity", "officeLocation"],
  ["salaryMin", "salaryMax", "currency", "salaryType"],
  ["minExperience", "educationLevel"],
  ["requiredSkills"],
  ["overview", "responsibilities", "jobRequirements"],
  ["hiringManager", "interviewRounds", "questionBankMapping"],
  ["resumeRequired", "coverLetterRequired"],
  ["status", "visibility"],
  ["priority", "referralEnabled", "approvalRequired"],
];
