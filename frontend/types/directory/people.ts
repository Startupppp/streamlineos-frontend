/**
 * The response shapes are `z.infer`red from the contracts that validate them at
 * the fetch seam (`hooks/api/directory/people-schema.ts`), so there is one
 * definition of each and it is the one enforced at runtime.
 */
export type {
  OrganizationPerson,
  PersonAccountAccess,
} from "@/hooks/api/directory/people-schema";

export interface CreatePersonInput {
  firstName: string;
  lastName: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  userId?: string;
  organizationMembershipId?: number;
}

export interface UpdatePersonInput {
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
  preferredName?: string | null;
  workEmail?: string | null;
  personalEmail?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  timezone?: string | null;
  languageCode?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  bio?: string | null;
  userId?: string | null;
  organizationMembershipId?: number | null;
}
