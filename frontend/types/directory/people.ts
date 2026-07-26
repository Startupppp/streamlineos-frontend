export interface OrganizationPerson {
  organizationPersonId: string;
  organizationId: string;
  userId: string | null;
  organizationMembershipId: number | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  preferredName: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  timezone: string | null;
  languageCode: string | null;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  } | null;
  emergencyContact: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  } | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  bio: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PeoplePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PeoplePage {
  data: OrganizationPerson[];
  pagination: PeoplePagination;
}

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
