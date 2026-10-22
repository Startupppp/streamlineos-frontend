import type { StatusTone } from "@/lib/design-tokens";
import type {
  GrantSourceKind,
  ModuleStandingLevel,
  OrgStanding,
} from "@/hooks/api/roles-schema";
import type { DataScope } from "@/types/access";

export const ORG_STANDING_LABELS: Record<OrgStanding, string> = {
  OWNER: "Organization owner",
  ORG_ADMIN: "Organization admin",
  MEMBER: "Organization member",
};

export const ORG_STANDING_TONES: Record<OrgStanding, StatusTone> = {
  OWNER: "success",
  ORG_ADMIN: "info",
  MEMBER: "neutral",
};

export const ORG_STANDING_DESCRIPTIONS: Record<OrgStanding, string> = {
  OWNER:
    "Holds the whole permission catalog by standing. Ownership transfer and organization deletion stay with this person.",
  ORG_ADMIN:
    "Holds the whole permission catalog by standing, except ownership lifecycle actions.",
  MEMBER:
    "Holds only what roles, groups, delegations, direct grants and module ownership resolve to.",
};

export const MODULE_STANDING_LABELS: Record<ModuleStandingLevel, string> = {
  owner: "Module owner",
  admin: "Module admin",
  member: "Module member",
  none: "No standing",
};

export const MODULE_STANDING_TONES: Record<ModuleStandingLevel, StatusTone> = {
  owner: "success",
  admin: "info",
  member: "neutral",
  none: "neutral",
};

export const GRANT_SOURCE_LABELS: Record<GrantSourceKind, string> = {
  "org-standing": "Organization standing",
  "universal-member": "Every active member",
  "employee-self-service": "Employee self-service",
  "manager-authority": "Reporting manager",
  "role-grant": "Role",
  "role-default": "Role template",
  delegation: "Delegation",
  "user-grant": "Direct grant",
  "module-ownership": "Module ownership",
  "platform-capability": "Platform operator",
  "access-view-implication": "Implied by manage",
};

export const GRANT_SOURCE_TONES: Record<GrantSourceKind, StatusTone> = {
  "org-standing": "success",
  "universal-member": "neutral",
  "employee-self-service": "neutral",
  "manager-authority": "info",
  "role-grant": "info",
  "role-default": "info",
  delegation: "warning",
  "user-grant": "info",
  "module-ownership": "success",
  "platform-capability": "danger",
  "access-view-implication": "neutral",
};

export const SCOPE_LABELS: Record<DataScope, string> = {
  all: "All records",
  team: "Team",
  own: "Own records",
  none: "No records",
};

export const SCOPE_TONES: Record<DataScope, StatusTone> = {
  all: "info",
  team: "warning",
  own: "neutral",
  none: "danger",
};

export const TEAM_SCOPE_EXPLANATION =
  "Team scope is not implemented. The data layer falls back to this person's own records, so it currently grants no more than Own.";

export const UNAVAILABLE_MODULE_EXPLANATION =
  "This module is not enabled for the organization, so these permissions resolve but every request to the module is refused. That is different from being denied the permission.";

const GRANTABLE_RANK_LABELS: Readonly<Record<number, string>> = {
  20: "Module admin",
  30: "Module member",
  40: "Functional role",
};

export function grantableRankLabel(rank: number): string {
  return GRANTABLE_RANK_LABELS[rank] ?? `Rank ${rank}`;
}

export const GRANT_SOURCE_NAMES_ITS_GRANTOR: ReadonlySet<GrantSourceKind> =
  new Set<GrantSourceKind>(["role-grant", "role-default"]);
