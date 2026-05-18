import { z } from "zod";

export const DOCUMENT_DESCRIPTION_MAX = 500;
export const DOCUMENT_NAME_MAX = 255;
export const DOCUMENT_CATEGORY_MAX = 200;

export const createDocumentBodySchema = z.object({
  name: z.string().min(1).max(DOCUMENT_NAME_MAX),
  type: z.enum([
    "CONTRACT",
    "CERTIFICATE",
    "ID_PROOF",
    "PAYSLIP",
    "POLICY",
    "OFFER_LETTER",
    "RESUME",
    "OTHER",
  ]),
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  userId: z.string().optional(),
  description: z.string().max(DOCUMENT_DESCRIPTION_MAX).optional(),
  category: z.string().max(DOCUMENT_CATEGORY_MAX).optional(),
  isPublic: z.boolean().optional().default(false),
  expiryDate: z.string().optional(),
  tags: z.array(z.string().max(100)).optional(),
});

export const createDocumentFolderSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required").max(100),
});

export const orgDocumentVariableSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Use letters, numbers, and underscores (e.g. Support_Email)"),
  label: z.string().trim().min(1).max(120),
  defaultValue: z.string().max(500).default(""),
});

export const updateOrgDocumentVariableSchema = orgDocumentVariableSchema.partial();
