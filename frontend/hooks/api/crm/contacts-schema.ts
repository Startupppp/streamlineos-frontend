import { z } from "zod";

const associationRef = z.object({ id: z.number().int(), name: z.string().nullable() }).nullable();

export const contactRecordContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string().nullable(),
  department: z.string().nullable(),
  company: z.string().nullable(),
  organizationId: z.number().int().nullable(),
  linkedinUrl: z.string().nullable(),
  twitterUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  leadId: z.number().int().nullable(),
  dealId: z.number().int().nullable(),
  tags: z.array(z.string()),
  deletedAt: z.string().nullable(),
  mergedIntoId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  notes: z.string().nullable(),
});

export const contactRowContract = contactRecordContract.extend({
  partyId: z.string(),
  lead: associationRef,
  deal: associationRef,
});

export const contactListContract = z.object({
  items: z.array(contactRowContract),
  total: z.number().int().optional(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const contactDetailContract = contactRowContract.extend({
  crmOrganization: z.object({ id: z.number().int(), name: z.string().nullable() }).nullable(),
});

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
