import {
  MAX_ORG_SETUP_INVITE_BATCHES,
  MAX_ORG_SETUP_INVITEES,
  MAX_INVITEE_MODULE_ACCESS,
  inviteeModuleAccessSchema,
  orgSetupInviteeRoleSchema,
  orgSetupInviteeSchema,
  type OrgSetupInvitee,
} from "@/hooks/api/org-setup-schema";
import type { OrgSetupPayload } from "@/hooks/api/org-setup";
import { DEFAULT_APPS } from "./constants";
import {
  type Invitee,
  type InviteeModuleAccess,
  type OrgModuleKey,
  type WizardData,
} from "./wizard-data-schema";

export function defaultInviteModuleAccess(
  role: string,
  enabledModules: readonly OrgModuleKey[],
): InviteeModuleAccess[] {
  return role === "MEMBER" && enabledModules.includes("build")
    ? [{ moduleKey: "build", standing: "MEMBER" }]
    : [];
}

export function effectiveInviteModuleAccess(
  invitee: Invitee,
  enabledModules: readonly OrgModuleKey[],
): InviteeModuleAccess[] {
  return invitee.moduleAccess ?? defaultInviteModuleAccess(invitee.role, enabledModules);
}

function enabledModulesFor(data: WizardData): OrgModuleKey[] {
  return data.modules.length > 0 ? data.modules : [...DEFAULT_APPS];
}

export function getInviteAccessError(data: WizardData): string | null {
  if (data.invitees.length > MAX_ORG_SETUP_INVITEES)
    return `Invite at most ${MAX_ORG_SETUP_INVITEES} people during setup. You can invite more later.`;

  const enabledModules = enabledModulesFor(data);
  const enabled = new Set(enabledModules);
  const emails = new Set<string>();
  const batches = new Set<string>();

  for (const invitee of data.invitees) {
    const email = invitee.email.trim().toLowerCase();
    if (emails.has(email)) return `${invitee.email} appears more than once. Remove the duplicate invitation.`;
    emails.add(email);

    if (!orgSetupInviteeRoleSchema.safeParse(invitee.role).success)
      return `${invitee.email} has an unavailable organization role. Remove and add this person again.`;

    const moduleAccess = effectiveInviteModuleAccess(invitee, enabledModules);
    const parsed = inviteeModuleAccessSchema.safeParse(moduleAccess);
    if (!parsed.success)
      return `${invitee.email} has invalid module access. Select at most ${MAX_INVITEE_MODULE_ACCESS} different products with Member or Admin access.`;

    const unavailable = moduleAccess.find((item) => !enabled.has(item.moduleKey));
    if (unavailable)
      return `${invitee.email} still has ${unavailable.moduleKey} access, but that product is no longer selected. Remove the assignment or select the product again.`;

    const grants = moduleAccess
      .map((item) => `${item.moduleKey}:${item.standing}`)
      .sort();
    batches.add(JSON.stringify([invitee.role, grants]));
  }

  if (batches.size > MAX_ORG_SETUP_INVITE_BATCHES)
    return `Use at most ${MAX_ORG_SETUP_INVITE_BATCHES} different role and product-access combinations during setup. Match an existing combination or invite more people later.`;

  return null;
}

function toSetupInvitee(
  invitee: Invitee,
  enabledModules: readonly OrgModuleKey[],
): OrgSetupInvitee {
  const moduleAccess = effectiveInviteModuleAccess(invitee, enabledModules);
  return orgSetupInviteeSchema.parse({
    email: invitee.email,
    role: invitee.role,
    ...(invitee.moduleAccess !== undefined || moduleAccess.length > 0
      ? { moduleAccess }
      : {}),
  });
}

export function buildOrgSetupPayload(data: WizardData): OrgSetupPayload {
  const inviteError = getInviteAccessError(data);
  if (inviteError) throw new Error(inviteError);
  const enabledModules = enabledModulesFor(data);
  const invitees = data.invitees.map((invitee) =>
    toSetupInvitee(invitee, enabledModules),
  );
  return {
    industry: data.industry,
    companyName: data.companyName,
    ...(data.fullName.trim() ? { fullName: data.fullName.trim() } : {}),
    companySize: data.teamSize,
    ...(data.country ? { country: data.country } : {}),
    ...(data.timezone ? { timezone: data.timezone } : {}),
    phone: data.phone,
    enabledModules,
    ...(invitees.length > 0 ? { invitees } : {}),
  };
}
