import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

/**
 * The stored jsonb, mirrored from `jobs-schema.ts` because a template's
 * questions are copied onto a posting verbatim. A `z.object` STRIPS what it
 * does not list, so a narrower copy here would silently drop `id` — the key the
 * wizard maps its question rows by — on the way through the picker.
 */
const screeningQuestionContract = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["TEXT", "YES_NO", "SINGLE_SELECT", "NUMBER"]),
  required: z.boolean(),
  knockout: z.boolean(),
  knockoutAnswer: z.string().optional(),
  options: z.array(z.string()).optional(),
});

/**
 * Timestamps are strings, not dates.
 *
 * The backend contract coerces them to `Date` because it validates the object
 * it is about to serialise; by the time the browser sees them they have been
 * through JSON and are ISO strings again. `z.coerce.date()` here would hand
 * components a `Date` the server never promised and break the moment a value is
 * rendered or compared against another timestamp in the same list.
 */
export const jobTemplateContract = z.object({
  id: z.number().int(),
  name: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.string().nullable(),
  benefits: z.string().nullable(),
  type: z.string(),
  experience: z.string().nullable(),
  screeningQuestions: z.array(screeningQuestionContract).nullable(),
  jobLevelId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobTemplatePageContract = z.object({
  data: z.array(jobTemplateContract),
  pagination: cursorPaginationContract,
});

/**
 * What `POST /apply` hands back: the posting draft with the template's values
 * filled into the gaps the recruiter left.
 *
 * Every field is optional because the merge output is only as complete as the
 * template plus what the recruiter had typed — a half-written template applied
 * to an empty form legitimately returns almost nothing.
 */
export const appliedJobTemplateContract = z.object({
  jobTemplateId: z.number().int(),
  jobTemplateName: z.string(),
  draft: z.object({
    title: z.string().optional(),
    departmentId: z.string().optional(),
    hiringFlowId: z.number().int().optional(),
    location: z.string().optional(),
    type: z.string().optional(),
    experience: z.string().optional(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    description: z.string().optional(),
    requirements: z.string().optional(),
    benefits: z.string().optional(),
    openings: z.number().int().optional(),
    applicationDeadline: z.string().optional(),
    status: z.string().optional(),
    screeningQuestions: z.array(screeningQuestionContract).optional(),
  }),
});
