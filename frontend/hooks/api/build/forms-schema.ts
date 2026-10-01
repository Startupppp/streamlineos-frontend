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
const formValuesSchema = z.record(z.string(), z.unknown());

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

export const submissionRowContract = submissionsUpdateSubmissionResponseSchema.transform((row) => ({
  ...row,
  values: formValuesSchema.parse(row.values),
}));

export const submissionResponseContract = submissionsListSubmissionsResponseSchema.transform((page) => ({
  ...page,
  data: page.data.map((item) => ({
    ...item,
    values: formValuesSchema.parse(item.values),
  })),
}));

export const submissionCreateResultContract = submissionsCreateSubmissionResponseSchema.transform((row) => ({
  ...row,
  values: formValuesSchema.parse(row.values),
}));
