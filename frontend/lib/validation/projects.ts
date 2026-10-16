import { z } from "zod";

export const MAX_TICKET_POINTS = 100;
export const TICKET_TITLE_MAX = 500;

export const portfolioOrProgramNameSchema = z.string().trim().min(1, "Required").max(255);
export const BUDGET_MAX = 1_000_000_000_000;

const BIDI_STRIP_RE = /[‪-‮⁦-⁩​﻿]/g;

export function stripBidiControls(v: string): string {
  return v.replace(BIDI_STRIP_RE, "");
}

/** Same rule as the backend's create/PATCH/from-deal DTOs: trimmed, 2..100. */
export const projectNameSchema = z
  .string()
  .trim()
  .min(2, "Project name must be at least 2 characters")
  .max(100, "Project name must be 100 characters or fewer");

const projectStatusSchema = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);

const ticketTypeSchema = z.enum(["EPIC", "STORY", "TASK", "BUG"]);
const ticketPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const updateProjectSettingsInputSchema = z.object({
  projectId: z.number().int().positive(),
  name: projectNameSchema,
  description: z.string().max(2000).optional(),
  status: projectStatusSchema,
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  memberIds: z.array(z.string()).optional(),
});

export const createTicketInputSchema = z.object({
  projectId: z.number().int().positive(),
  title: z
    .string()
    .transform(stripBidiControls)
    .pipe(
      z
        .string()
        .min(1, "Title is required")
        .max(TICKET_TITLE_MAX, `Title must be ${TICKET_TITLE_MAX} characters or fewer`)
        .refine((v) => v.trim().length >= 3, { message: "Title must be at least 3 characters" })
        .refine((v) => /[a-zA-Z0-9]/.test(v.trim()), { message: "Title must contain at least one letter or number" }),
    ),
  description: z.string().max(100_000).optional(),
  type: ticketTypeSchema,
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  reporterId: z.string().optional(),
  epicId: z.number().int().positive().optional(),
  cycleId: z.number().int().positive().optional(),
  labelIds: z.array(z.number().int().positive()).optional(),
  points: z.number().int().min(0).max(MAX_TICKET_POINTS).optional(),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  originalEstimate: z.number().positive().optional(),
  parentTicketId: z.number().int().positive().optional(),
  status: z.string().optional(),
});

export const budgetFormSchema = z.object({
  budget: z
    .string()
    .refine((v) => v !== "" && Number.isFinite(Number(v)), "Enter a valid budget amount")
    .transform((v) => Number(v))
    .pipe(
      z
        .number()
        .min(0, "Budget must be 0 or more")
        .max(BUDGET_MAX, `Budget must be ${new Intl.NumberFormat("en-IN").format(BUDGET_MAX)} or less`)
        .refine(
          (v) => { const s = v.toString(); const d = s.split(".")[1]; return !d || d.length <= 2; },
          "Use at most 2 decimal places",
        ),
    ),
});
