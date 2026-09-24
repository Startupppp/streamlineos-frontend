import { z } from "zod";

const classificationEnum = z.enum(["PERSONAL", "CONFIDENTIAL", "RESTRICTED", "INTERNAL"]);

const audienceSchema = z.object({
  id: z.number().int(),
  kind: z.enum(["ALL_EMPLOYEES", "DEPARTMENT", "LOCATION"]),
  refId: z.string().nullable(),
  label: z.string().nullable(),
});

const blockerSchema = z.object({
  code: z.enum([
    "CLASSIFICATION_NOT_SHAREABLE",
    "BELONGS_TO_AN_EMPLOYEE",
    "TYPE_NOT_ALLOWED",
    "DOCUMENT_INACTIVE",
    "HIRING_ARTEFACT",
  ]),
  message: z.string(),
});

export const documentClassificationContract = z.object({
  documentId: z.number().int(),
  classification: classificationEnum,
  effectiveDate: z.string().nullable(),
  audiences: z.array(audienceSchema),
  publishable: z.boolean(),
  blockers: z.array(blockerSchema),
});

export const classifyDocumentContract = documentClassificationContract.extend({
  linksTakenDown: z.number().int(),
});

export const setDocumentAudiencesContract = documentClassificationContract.extend({
  linkAudiencesNarrowed: z.number().int(),
});
