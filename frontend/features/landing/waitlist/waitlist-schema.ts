import { z } from "zod";

export const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;
export const WAITLIST_MODULES = ["build", "hrms", "payroll", "timesheets"] as const;

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a phone number we can call")
  .max(20, "That phone number is too long")
  .regex(/^[0-9+\-() ]+$/, "Use digits, spaces, and + - ( ) only");

export const waitlistSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required").max(200),
    email: z
      .string()
      .trim()
      .min(1, "Work email is required")
      .email("Enter a valid work email")
      .max(320)
      .toLowerCase(),
    company: z.string().trim().min(1, "Company name is required").max(200),
    role: z.string().trim().max(120).optional(),
    teamSize: z.enum(TEAM_SIZES, { message: "Choose a team size" }),
    modules: z.array(z.enum(WAITLIST_MODULES)).max(4).optional(),
    phone: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      phoneSchema.optional(),
    ),
    notes: z.string().trim().max(500, "Keep this to 500 characters").optional(),
    consent: z.literal(true, { message: "Consent is required" }),
    website: z.string().max(200).optional(),
    source: z.string().trim().max(50).optional(),
    utm: z.record(z.string().trim().min(1).max(40), z.string().trim().max(80)).optional(),
    cfTurnstileToken: z.string().trim().min(1).max(2048).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.modules && new Set(value.modules).size !== value.modules.length) {
      ctx.addIssue({ code: "custom", path: ["modules"], message: "Modules must be unique" });
    }
    if (value.utm && Object.keys(value.utm).length > 5) {
      ctx.addIssue({ code: "custom", path: ["utm"], message: "At most 5 UTM parameters" });
    }
  });

export type WaitlistFormValues = z.input<typeof waitlistSchema>;
export type WaitlistPayload = z.output<typeof waitlistSchema>;

export const MODULE_LABELS: Record<(typeof WAITLIST_MODULES)[number], string> = {
  build: "Build",
  hrms: "HRMS",
  payroll: "Payroll",
  timesheets: "Timesheets",
};
