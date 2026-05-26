import { z } from "zod";

/** Trimmed non-empty string */
export const requiredString = (label: string, max = 500) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${characters(max)}`);

function characters(max: number) {
  return `${max} characters`;
}

export const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""));

export const optionalAttachmentUrl = z
  .string()
  .trim()
  .url("Attachment must be a valid URL")
  .optional()
  .or(z.literal(""));

export const positiveAmount = z.coerce
  .number()
  .positive("Amount must be greater than zero")
  .max(999_999_999, "Amount is too large");

export const helpdeskTicketSchema = z.object({
  title: requiredString("Title", 200),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be at most 5000 characters")
    .optional()
    .or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  attachmentUrl: optionalAttachmentUrl,
});

export type HelpdeskTicketFormValues = z.infer<typeof helpdeskTicketSchema>;

export const reimbursementRequestSchema = z.object({
  category: requiredString("Category", 100),
  amount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? NaN : Number(val)),
    positiveAmount,
  ),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
  receiptUrl: optionalAttachmentUrl,
});

export type ReimbursementRequestFormValues = z.infer<typeof reimbursementRequestSchema>;

export const createDealFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Deal name is required")
    .max(200, "Deal name must be at most 200 characters")
    .regex(/^[A-Za-z]/, "Deal name must start with a letter"),
  value: z.number().min(0, "Value cannot be negative"),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  probability: z.number().min(0).max(100),
  contactPerson: z
    .string()
    .trim()
    .max(120)
    .regex(/^[A-Za-z\s]*$/, "Contact person can only contain letters")
    .optional()
    .or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  expectedCloseDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type CreateDealFormValues = z.infer<typeof createDealFormSchema>;

const optionalSalary = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z
    .number({ error: "Salary must be a number" })
    .refine((n) => !Number.isNaN(n), "Salary must be a number")
    .min(0, "Salary cannot be negative")
    .max(1_000_000_000, "Salary is too large")
    .optional(),
);

export const createJobPostingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title must be at most 150 characters")
      .regex(/[A-Za-z]/, "Title must contain letters"),
    location: z.string().trim().max(150, "Location must be at most 150 characters").optional().or(z.literal("")),
    type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"], {
      error: "Select a valid job type",
    }),
    description: z.string().trim().max(10_000, "Description must be at most 10000 characters").optional().or(z.literal("")),
    openings: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? NaN : Number(val)),
      z
        .number({ error: "Openings must be a number" })
        .int("Openings must be a whole number")
        .min(1, "At least 1 opening is required")
        .max(1000, "Openings must be at most 1000"),
    ),
    salaryMin: optionalSalary,
    salaryMax: optionalSalary,
    requirements: z.string().trim().max(10_000, "Requirements must be at most 10000 characters").optional().or(z.literal("")),
    applicationDeadline: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (d) => d.salaryMin === undefined || d.salaryMax === undefined || d.salaryMin <= d.salaryMax,
    { path: ["salaryMax"], message: "Max salary must be greater than or equal to min salary" },
  )
  .refine((d) => !d.applicationDeadline || !Number.isNaN(Date.parse(d.applicationDeadline)), {
    path: ["applicationDeadline"],
    message: "Application deadline is not a valid date",
  })
  .refine(
    (d) => {
      if (!d.applicationDeadline) return true;
      const deadline = new Date(d.applicationDeadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deadline >= today;
    },
    { path: ["applicationDeadline"], message: "Application deadline cannot be in the past" },
  );

export type CreateJobPostingFormValues = z.infer<typeof createJobPostingSchema>;

export const onboardingDocUploadSchema = z.object({
  fileUrl: z.string().trim().url("Uploaded file URL is invalid"),
  fileName: requiredString("File name", 255),
});

export type OnboardingDocUploadFormValues = z.infer<typeof onboardingDocUploadSchema>;
