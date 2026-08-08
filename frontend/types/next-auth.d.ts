
import { DefaultSession } from "next-auth";
import type { Plan } from "@/lib/billing/feature-gates";

declare module "next-auth" {
  interface Session {
    orgId?: string | null;
    branchId?: number | null;
    sessionId?: string;
    plan?: Plan | null;
    enabledModules?: string[];
    daysUntilExpiry?: number;
    orgOnboardingCompletedAt?: string | null;
    userOnboardingCompletedAt?: string | null;
    organizationAccess?: "active" | "suspended" | "none";
    suspendedOrganizationName?: string | null;
    backendJwt?: string;
    authProvider?: string;
    user: {
      id: string;
      role: string;
      isActive?: boolean;
      isOrgOwner?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    id?: string;
    isActive?: boolean;
    daysUntilExpiry?: number;
    orgId?: string | null;
    isOrgOwner?: boolean;
    orgOnboardingCompletedAt?: string | null;
    branchId?: number | null;
    plan?: Plan | null;
    enabledModules?: string[];
    userOnboardingCompletedAt?: string | null;
    organizationAccess?: "active" | "suspended" | "none";
    suspendedOrganizationName?: string | null;
    name?: string | null;
    sessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    orgId?: string | null;
    role?: string;
    isActive?: boolean;
    image?: string | null;
    branchId?: number | null;
    sessionId?: string;
    plan?: Plan | null;
    isOrgOwner?: boolean;
    enabledModules?: string[];
    daysUntilExpiry?: number;
    orgOnboardingCompletedAt?: string | null;
    userOnboardingCompletedAt?: string | null;
    organizationAccess?: "active" | "suspended" | "none";
    suspendedOrganizationName?: string | null;
    authProvider?: string;
  }
}
