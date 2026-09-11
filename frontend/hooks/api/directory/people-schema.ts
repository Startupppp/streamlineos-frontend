import { z } from "zod";

/**
 * Contracts for the people directory — the PII surface every member can read.
 *
 * `accountAccess` is required here against a backend that attaches it to every
 * row unconditionally. It decides whether a person shows as a member, as an
 * open invitation or as having no account at all, so a version that stopped
 * sending it would render everyone as "no account" and nothing would say so.
 *
 * Not `.strict()`: the restricted onboarding columns (date of birth, gender,
 * nationality, address, emergency contact) are deliberately absent from this
 * projection, and a future additive field must not fail the directory.
 */

export const personAccountAccessContract = z.discriminatedUnion("state", [
  z.object({ state: z.literal("MEMBER") }),
  z.object({
    state: z.literal("INVITED"),
    invitationId: z.string(),
    invitationStatus: z.enum(["PENDING", "EXPIRED"]),
    email: z.string(),
    role: z.string(),
    expiresAt: z.string(),
  }),
  z.object({ state: z.literal("NONE") }),
]);

export const organizationPersonContract = z.object({
  organizationPersonId: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  organizationMembershipId: z.number().nullable(),
  accountAccess: personAccountAccessContract,
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  preferredName: z.string().nullable(),
  workEmail: z.string().nullable(),
  personalEmail: z.string().nullable(),
  phone: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  timezone: z.string().nullable(),
  languageCode: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  bio: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const peoplePageInfoContract = z.object({
  limit: z.number(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const peoplePageContract = z.object({
  data: z.array(organizationPersonContract),
  pageInfo: peoplePageInfoContract,
});

export type PersonAccountAccess = z.infer<typeof personAccountAccessContract>;
export type OrganizationPerson = z.infer<typeof organizationPersonContract>;
export type PeoplePage = z.infer<typeof peoplePageContract>;
