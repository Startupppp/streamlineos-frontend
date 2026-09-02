export interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  logo: string | null;
  website: string | null;
  industry: string | null;
  timezone: string | null;
  currency: string | null;
  fiscalYearStart: number | null;
  mfaEnforced?: boolean;
  allowedEmailDomains?: string[] | null;
  maxConcurrentSessions?: number | null;
  settings?: Record<string, unknown> | null;
  primaryColor?: string | null;
  loginBgUrl?: string | null;
  ipAllowlist?: string[];
  directoryPublic?: boolean;
  legalName?: string | null;
  orgCode?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  favicon?: string | null;
  secondaryColor?: string | null;
  businessHours?: Record<string, { open: string; close: string; enabled: boolean }> | null;
  language?: string | null;
  dateFormat?: string | null;
  timeFormat?: "12h" | "24h" | null;
  numberFormat?: string | null;
  weekStartDay?: "monday" | "sunday" | "saturday" | null;
  onboardingCompletedAt?: string | null;
  companySize?: string | null;
  country?: string | null;
  enabledModules?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export type { OrgMember } from "@/hooks/api/organization-schema";

export interface Branch {
  id: number;
  orgId: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  branchManagerId: string | null;
  branchHrId: string | null;
  status: "ACTIVE" | "INACTIVE";
  branchManager: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string;
  } | null;
  branchHr: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export type { Role } from "@/hooks/api/roles-schema";

