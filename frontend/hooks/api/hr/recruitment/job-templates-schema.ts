import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

const screeningQuestionContract = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["TEXT", "YES_NO", "SINGLE_SELECT", "NUMBER"]),
  required: z.boolean(),
  knockout: z.boolean(),
  knockoutAnswer: z.string().optional(),
  options: z.array(z.string()).optional(),
});

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
