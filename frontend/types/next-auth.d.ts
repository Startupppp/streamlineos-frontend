
import { DefaultSession } from "next-auth";
import type { SessionClaims } from "@/lib/auth-claims";

declare module "next-auth" {
  interface Session {
    orgId?: SessionClaims["orgId"];
    sessionId?: string;
    plan?: SessionClaims["plan"];
    enabledModules?: SessionClaims["enabledModules"];
    daysUntilExpiry?: number;
    orgOnboardingCompletedAt?: SessionClaims["orgOnboardingCompletedAt"];
    userOnboardingCompletedAt?: SessionClaims["userOnboardingCompletedAt"];
    organizationAccess?: SessionClaims["organizationAccess"];
    suspendedOrganizationName?: SessionClaims["suspendedOrganizationName"];
    isPlatformAdmin?: SessionClaims["isPlatformAdmin"];
    backendJwt?: string;
    authProvider?: string;
    user: {
      id: string;
      role: SessionClaims["role"];
      isActive?: SessionClaims["isActive"];
      isOrgOwner?: SessionClaims["isOrgOwner"];
    } & DefaultSession["user"];
  }

  interface User {
    role?: SessionClaims["role"];
    id?: string;
    isActive?: SessionClaims["isActive"];
    daysUntilExpiry?: number;
    orgId?: SessionClaims["orgId"];
    isOrgOwner?: SessionClaims["isOrgOwner"];
    orgOnboardingCompletedAt?: SessionClaims["orgOnboardingCompletedAt"];
    plan?: SessionClaims["plan"];
    enabledModules?: SessionClaims["enabledModules"];
    userOnboardingCompletedAt?: SessionClaims["userOnboardingCompletedAt"];
    organizationAccess?: SessionClaims["organizationAccess"];
    suspendedOrganizationName?: SessionClaims["suspendedOrganizationName"];
    isPlatformAdmin?: SessionClaims["isPlatformAdmin"];
    name?: string | null;
    sessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    orgId?: SessionClaims["orgId"];
    role?: SessionClaims["role"];
    isActive?: SessionClaims["isActive"];
    sessionId?: string;
    isOrgOwner?: SessionClaims["isOrgOwner"];
    daysUntilExpiry?: number;
    orgOnboardingCompletedAt?: SessionClaims["orgOnboardingCompletedAt"];
    userOnboardingCompletedAt?: SessionClaims["userOnboardingCompletedAt"];
    organizationAccess?: SessionClaims["organizationAccess"];
    suspendedOrganizationName?: SessionClaims["suspendedOrganizationName"];
    isPlatformAdmin?: SessionClaims["isPlatformAdmin"];
    authProvider?: string;
  }
}
