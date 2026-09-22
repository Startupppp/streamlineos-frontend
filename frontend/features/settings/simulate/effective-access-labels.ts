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

/**
 * Team scope is declarable but not implemented, and the screen has to say so —
 * presenting it as a wider grant than `own` would be a lie the reader acts on.
 * `applyScope` falls back to `eq(ownerColumn, userId)` whenever no team column
 * and team ids are supplied, and no production call site supplies them.
 */
export const TEAM_SCOPE_EXPLANATION =
  "Team scope is not implemented. The data layer falls back to this person's own records, so it currently grants no more than Own.";

export const UNAVAILABLE_MODULE_EXPLANATION =
  "This module is not enabled for the organization, so these permissions resolve but every request to the module is refused. That is different from being denied the permission.";

/**
 * `grantableRanks` comes back as `ROLE_RANK` numbers. Only the three ranks
 * `describeGrantable` can return are named; anything else renders its number
 * rather than a guess, so a new rung reads as unknown instead of as the wrong
 * standing.
 */
const GRANTABLE_RANK_LABELS: Readonly<Record<number, string>> = {
  20: "Module admin",
  30: "Module custom role",
  40: "Functional role",
};

export function grantableRankLabel(rank: number): string {
  return GRANTABLE_RANK_LABELS[rank] ?? `Rank ${rank}`;
}

/**
 * Only these two kinds carry a label that names something the reader can go and
 * look at — the role. Every other kind's `label` restates its own category, and
 * rendering both produced "Direct grant: Direct grant to this person".
 */
export const GRANT_SOURCE_NAMES_ITS_GRANTOR: ReadonlySet<GrantSourceKind> =
  new Set<GrantSourceKind>(["role-grant", "role-default"]);
