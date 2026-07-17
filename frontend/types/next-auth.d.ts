
import { DefaultSession } from "next-auth";
import type { Plan } from "@/lib/billing/feature-gates";

declare module "next-auth" {
  interface Session {
    orgId?: string | null;
    branchId?: number | null;
    sessionId?: string;
    plan?: Plan | null;
    permissions?: string[];
    enabledModules?: string[];
    daysUntilExpiry?: number;
    orgOnboardingCompletedAt?: string | null;
    userOnboardingCompletedAt?: string | null;
    backendJwt?: string;
    authProvider?: string;
    user: {
      id: string;
      role: string;
      isActive?: boolean;
      hasDashboardAccess?: boolean;
      isPlatformAdmin?: boolean;
      isOrgOwner?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    id?: string;
    isActive?: boolean;
    hasDashboardAccess?: boolean;
    daysUntilExpiry?: number;
    orgId?: string | null;
    isOrgOwner?: boolean;
    orgOnboardingCompletedAt?: string | null;
    branchId?: number | null;
    totpEnabled?: boolean;
    mfaEnforced?: boolean;
    permissions?: string[];
    plan?: Plan | null;
    enabledModules?: string[];
    userOnboardingCompletedAt?: string | null;
    isPlatformAdmin?: boolean;
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
    hasDashboardAccess?: boolean;
    image?: string | null;
    branchId?: number | null;
    sessionId?: string;
    totpEnabled?: boolean;
    mfaEnforced?: boolean;
    permissions?: string[];
    plan?: Plan | null;
    isPlatformAdmin?: boolean;
    isOrgOwner?: boolean;
    enabledModules?: string[];
    daysUntilExpiry?: number;
    orgOnboardingCompletedAt?: string | null;
    userOnboardingCompletedAt?: string | null;
    authProvider?: string;
  }
}
