import { z } from "zod";

const columnSpecSchema = z.object({
  field: z.string(),
  primary: z.boolean().optional(),
  sortable: z.boolean().optional(),
  width: z.string().optional(),
  subtitle: z.string().optional(),
});

const sectionSpecSchema = z.object({
  title: z.string(),
  fields: z.array(z.string()),
});

const issueFieldSpecSchema = z.object({
  name: z.string(),
  label: z.string(),
  kind: z.enum(["text", "email", "phone", "url", "number", "money", "percent", "date", "dateTime", "select", "badge", "boolean", "longText", "reference"] as const),
  required: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  hint: z.string().optional(),
  numeric: z.boolean().optional(),
  sign: z.enum(["gain", "cost"] as const).optional(),
  referenceTo: z.string().optional(),
  referenceToField: z.string().optional(),
  referenceLabel: z.string().optional(),
  currencyField: z.string().optional(),
  editOnly: z.boolean().optional(),
  createOnly: z.boolean().optional(),
  visibleWhen: z.object({ field: z.string(), values: z.array(z.string()) }).optional(),
});

const issueLayoutSchema = z.object({
  key: z.string(),
  recordType: z.enum(["issue", "task", "complaint"] as const),
  singular: z.string(),
  plural: z.string(),
  titleField: z.string(),
  fields: z.array(issueFieldSpecSchema),
  list: z.object({
    columns: z.array(columnSpecSchema),
    searchPlaceholder: z.string(),
  }),
  detail: z.object({
    sections: z.array(sectionSpecSchema),
  }),
  form: z.object({
    sections: z.array(sectionSpecSchema),
  }),
});

export const issueRecordTypesContract = z.object({
  recordTypes: z.array(issueLayoutSchema),
});

const issueRecordRowSchema = z.object({
  issueRecordId: z.string(),
  recordType: z.enum(["issue", "task", "complaint"] as const),
}).catchall(z.unknown());

const issueTransitionSchema = z.object({
  issueStageTransitionId: z.string(),
  fromStage: z.string().nullable(),
  toStage: z.string(),
  actorKind: z.string(),
  actorLabel: z.string().nullable(),
  actorUserId: z.string().nullable(),
  actorName: z.string().nullable(),
  reason: z.string().nullable(),
  occurredAt: z.string(),
});

export const issueListContract = z.object({
  layout: issueLayoutSchema,
  data: z.array(issueRecordRowSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const issueDetailContract = z.object({
  layout: issueLayoutSchema,
  record: issueRecordRowSchema,
  transitions: z.array(issueTransitionSchema),
});

export const issueTransitionsListContract = z.array(issueTransitionSchema);

export const issueTransitionResultContract = z.object({
  issueRecordId: z.string(),
  fromStage: z.string().nullable(),
  toStage: z.string(),
  issueStageTransitionId: z.string().nullable(),
});

export const issueDeleteContract = z.object({ success: z.boolean() });
