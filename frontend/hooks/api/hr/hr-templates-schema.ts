import { z } from "zod";
import type { HrTemplateKind, HrTemplateStatus, HrLetterType } from "@/types/hr/templates";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const hrTemplateListItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  kind: z.custom<HrTemplateKind>((v) => typeof v === "string"),
  name: z.string(),
  description: z.string().nullable(),
  status: z.custom<HrTemplateStatus>((v) => typeof v === "string"),
  version: z.number().int(),
  parentTemplateId: z.number().int().nullable(),
  variablesUsed: z.array(z.string()),
  letterType: z.custom<HrLetterType | null>((v) => v === null || typeof v === "string"),
  createdBy: z.string(),
  updatedBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hrTemplateRowContract = hrTemplateListItemContract.extend({
  content: z.record(z.string(), z.unknown()),
});

export const hrTemplateListContract = z.object({
  data: z.array(hrTemplateListItemContract),
  total: z.number().int(),
  pagination: cursorPagination,
});

export const hrTemplateSeedResultContract = z.object({
  seeded: z.boolean(),
  count: z.number().int().optional(),
  message: z.string().optional(),
});

export const hrTemplateRenderResultContract = z.object({
  outputHtml: z.string(),
  renderedSubject: z.string().optional(),
  renderId: z.number().int(),
  templateVersion: z.number().int(),
});

export const templateVariableContract = z.object({
  token: z.string(),
  label: z.string(),
  group: z.string(),
  sensitive: z.boolean(),
  example: z.string(),
});

export const templateVariablesListContract = z.array(templateVariableContract);
