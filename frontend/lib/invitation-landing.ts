import type { AccessResponse } from "@/types/access";
import type { WizardGate } from "@/lib/wizard-gate";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { grantsPermission } from "@/lib/rbac/permission-gate";

export type InvitationLanding = "/employee-onboarding" | "/build" | "/dashboard";

function hasEffectivePermission(access: AccessResponse, permission: PermissionKey): boolean {
  return grantsPermission(access, permission) &&
    (access.isOrgOwner || access.scopes[permission] !== "none");
}

export function resolveInvitationLanding(
  access: AccessResponse,
  hrGate: WizardGate,
): InvitationLanding {
  if (
    hrGate === "/employee-onboarding" &&
    access.modules.hr === true &&
    hasEffectivePermission(access, "hr:access:view")
  ) {
    return "/employee-onboarding";
  }

  if (
    access.modules.build === true &&
    hasEffectivePermission(access, "build:view")
  ) {
    return "/build";
  }

  return "/dashboard";
}
