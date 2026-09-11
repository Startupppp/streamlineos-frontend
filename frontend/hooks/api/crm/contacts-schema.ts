import { z } from "zod";

const associationRef = z.object({ id: z.number().int(), name: z.string() }).nullable();

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
  ownerId: z.string().nullable(),
  source: z.string().nullable(),
  status: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
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

const crmOrganizationSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"] as const).nullable(),
  website: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  description: z.string().nullable(),
  healthScore: z.number().nullable(),
  parentId: z.number().int().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  openRequestCount: z.number().int().optional(),
});

export const contactDetailContract = contactItemSchema.extend({
  crmOrganization: crmOrganizationSchema.nullable().optional(),
});

export const contactContract = contactItemSchema;

const contactRoleRowSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  contactId: z.number().int(),
  entityType: z.enum(["deal", "company"] as const),
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
  matchReason: z.enum(["email", "phone", "name"] as const),
});

export const duplicateContactsContract = z.array(duplicateContactPairSchema);

export const mergeContactsContract = z.object({
  success: z.literal(true),
  primaryId: z.number().int(),
  mergedId: z.number().int(),
});

export const deleteContactContract = z.object({ success: z.boolean() });
