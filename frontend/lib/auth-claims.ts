import type { Plan } from "@/lib/billing/feature-gates";
import { resolveSessionIsActive } from "@/lib/auth-is-active";

export interface FreshClaims {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image: string | null;
  role?: string | null;
  isActive: boolean;
  orgId?: string | null;
  isOrgOwner: boolean;
  plan?: Plan | null;
  enabledModules?: string[];
  orgOnboardingCompletedAt?: string | null;
  userOnboardingCompletedAt?: string | null;
  organizationAccess?: "active" | "suspended" | "none";
  suspendedOrganizationName?: string | null;
}

export interface TokenClaims {
  name?: string | null;
  picture?: string | null;
  role?: string;
  isActive?: boolean;
  orgId?: string | null;
  isOrgOwner?: boolean;
  orgOnboardingCompletedAt?: string | null;
  userOnboardingCompletedAt?: string | null;
  organizationAccess?: "active" | "suspended" | "none";
  suspendedOrganizationName?: string | null;
}

export interface SessionClaims {
  name: string;
  image: string | null;
  role: string;
  isActive: boolean;
  orgId: string | null;
  isOrgOwner: boolean;
  plan: Plan | null;
  enabledModules: string[];
  orgOnboardingCompletedAt: string | null;
  userOnboardingCompletedAt: string | null;
  organizationAccess: "active" | "suspended" | "none";
  suspendedOrganizationName: string | null;
}

export function resolveSessionDisplayName(data: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const displayName = data.name?.trim();
  if (displayName) return displayName;
  const full = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim();
  if (full) return full;
  const email = data.email?.trim();
  if (!email) return "";
  const local = email.split("@")[0]?.trim();
  return local || email;
}

export function resolveSessionClaims(
  fresh: FreshClaims | null,
  token: TokenClaims,
): SessionClaims {
  const orgId = fresh ? (fresh.orgId ?? null) : (token.orgId ?? null);
  return {
    name: fresh ? resolveSessionDisplayName(fresh) : (token.name ?? ""),
    image: fresh ? (fresh.image ?? null) : (token.picture ?? null),
    role: fresh ? (fresh.role ?? "") : (token.role ?? ""),
    isActive: resolveSessionIsActive(fresh, token.isActive),
    orgId,
    isOrgOwner: fresh ? fresh.isOrgOwner : (token.isOrgOwner ?? false),
    plan: fresh?.plan ?? null,
    enabledModules: fresh?.enabledModules ?? [],
    orgOnboardingCompletedAt: fresh
      ? (fresh.orgOnboardingCompletedAt ?? null)
      : (token.orgOnboardingCompletedAt ?? null),
    userOnboardingCompletedAt: fresh
      ? (fresh.userOnboardingCompletedAt ?? null)
      : (token.userOnboardingCompletedAt ?? null),
    organizationAccess:
      (fresh ? fresh.organizationAccess : token.organizationAccess) ??
      (orgId ? "active" : "none"),
    suspendedOrganizationName: fresh
      ? (fresh.suspendedOrganizationName ?? null)
      : (token.suspendedOrganizationName ?? null),
  };
}
