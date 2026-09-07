import { z } from "zod";

export const letterRenderRowSchema = z.object({
  id: z.number().int(),
  templateId: z.number().int(),
  templateVersion: z.number().int(),
  renderedForEmploymentId: z.number().int().nullable(),
  renderedBy: z.string(),
  createdAt: z.string(),
  templateName: z.string(),
  templateLetterType: z.string().nullable(),
  rendererName: z.string().nullable(),
});

export const lettersListContract = z.array(letterRenderRowSchema);

export const renderLetterContract = z.object({
  templateId: z.number().int(),
  templateVersion: z.number().int(),
  templateName: z.string(),
  letterType: z.string().nullable(),
  outputHtml: z.string(),
  variables: z.array(z.string()),
  contextSnapshot: z.record(z.string(), z.string()),
  employmentId: z.number().int().optional(),
});

export const saveLetterContract = letterRenderRowSchema;
