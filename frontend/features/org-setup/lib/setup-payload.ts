import {
  MAX_ORG_SETUP_INVITEES,
  orgSetupInviteeRoleSchema,
  type OrgSetupInvitee,
} from "@/lib/api/hooks/org-schema";
import type { OrgSetupPayload } from "@/lib/api/hooks/org";
import { DEFAULT_APPS } from "./constants";
import type { Invitee, WizardData } from "./wizard-data-schema";

function toSetupInvitee(invitee: Invitee): OrgSetupInvitee {
  const role = orgSetupInviteeRoleSchema.safeParse(invitee.role);
  return { email: invitee.email, role: role.success ? role.data : "MEMBER" };
}

export function buildOrgSetupPayload(data: WizardData): OrgSetupPayload {
  const invitees = data.invitees
    .slice(0, MAX_ORG_SETUP_INVITEES)
    .map(toSetupInvitee);
  return {
    industry: data.industry,
    companyName: data.companyName,
    companySize: data.teamSize,
    ...(data.country ? { country: data.country } : {}),
    ...(data.timezone ? { timezone: data.timezone } : {}),
    phone: data.phone,
    enabledModules: data.modules.length > 0 ? data.modules : [...DEFAULT_APPS],
    ...(invitees.length > 0 ? { invitees } : {}),
  };
}
