import { z } from "zod";

const associationRef = z.object({ id: z.number().int(), name: z.string().nullable() }).nullable();

const contactItemSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string().nullable(),
  department: z.string().nullable(),
  company: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  twitterUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  dealId: z.number().int().nullable(),
  mergedIntoId: z.number().int().nullable(),
  leadId: z.number().int().nullable(),
  organizationId: z.number().int().nullable(),
  lead: associationRef,
  deal: associationRef,
});

export const contactListContract = z.object({
  items: z.array(contactItemSchema),
  total: z.number().int().optional(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const contactDetailContract = contactItemSchema.extend({
  crmOrganization: z.object({ id: z.number().int(), name: z.string().nullable() }).nullable(),
});

export const contactContract = contactItemSchema;

const contactRoleRowSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  contactId: z.number().int(),
  entityType: z.string(),
  entityId: z.number().int(),
  roleKey: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const contactRolesListContract = z.array(contactRoleRowSchema);
export const contactRoleContract = contactRoleRowSchema;

const duplicateContactSideSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

const duplicateContactPairSchema = z.object({
  contact1: duplicateContactSideSchema,
  contact2: duplicateContactSideSchema,
  matchReason: z.string(),
});

export const duplicateContactsContract = z.object({
  items: z.array(duplicateContactPairSchema),
  total: z.number().int().optional(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  pageSize: z.number().int(),
});

export const mergeContactsContract = z.object({
  success: z.literal(true),
  primaryId: z.number().int(),
  mergedId: z.number().int(),
});

export const deleteContactContract = z.object({ success: z.boolean() });
