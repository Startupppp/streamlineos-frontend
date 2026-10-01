import { z } from "zod";
import {
  formsGetFormResponseSchema,
  formsListFormsResponseSchema,
  submissionsListSubmissionsResponseSchema,
  submissionsCreateSubmissionResponseSchema,
  submissionsUpdateSubmissionResponseSchema,
} from "@/contracts/build-contracts.generated";

const formFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "long_text", "number", "date", "dropdown", "multiselect", "checkbox", "url", "user", "currency", "rating"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const formActionSchema = z.object({
  type: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const formFieldsSchema = z.array(formFieldSchema);
const formActionsSchema = z.array(formActionSchema);

export const formRowContract = formsGetFormResponseSchema.transform((row) => ({
  ...row,
  fields: formFieldsSchema.parse(row.fields),
  actions: formActionsSchema.parse(row.actions),
}));

export const formResponseContract = formsListFormsResponseSchema.transform((page) => ({
  ...page,
  data: page.data.map((row) => ({
    ...row,
    fields: formFieldsSchema.parse(row.fields),
    actions: formActionsSchema.parse(row.actions),
  })),
}));

export const submissionRowContract = submissionsUpdateSubmissionResponseSchema;
export const submissionResponseContract = submissionsListSubmissionsResponseSchema;
export const submissionCreateResultContract = submissionsCreateSubmissionResponseSchema;
