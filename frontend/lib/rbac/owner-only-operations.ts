export type OwnerOnlyOperationDefinition = {
  readonly summary: string;
  readonly reason: string;
};

export const OWNER_ONLY_OPERATIONS = {
  "organization.ownership.transfer": {
    summary: "Nominate another membership as organization owner",
    reason:
      "It changes who holds the account. An admin who could hand it over could take it.",
  },
  "organization.ownership.force-set-module-owner": {
    summary: "Set a module owner directly, without the transfer handshake",
    reason:
      "It bypasses the acceptance step, so it is the ownership lifecycle rather than access administration.",
  },
  "organization.ownership.direct-module-transfer": {
    summary: "Move module ownership between two other memberships immediately",
    reason:
      "Same authority as force-set: it rewrites ownership with no acceptance from either party.",
  },
  "organization.archive": {
    summary: "Archive the organization",
    reason:
      "It ends everyone's access at once and is the first half of deletion.",
  },
  "organization.delete": {
    summary: "Delete the organization",
    reason: "It ends the account. There is no per-module equivalent to delegate.",
  },
  "organization.purge.schedule": {
    summary: "Schedule the irreversible purge of organization data",
    reason:
      "It sets a date after which the data cannot be recovered, including the owner's own.",
  },
  "organization.purge.cancel": {
    summary: "Cancel a scheduled purge",
    reason:
      "Whoever may schedule destruction must be the only one who may call it off, or the two decisions can be split between people.",
  },
  "finance.expense.grant-without-approval": {
    summary: "Grant an expense that still has a pending approval",
    reason:
      "It overrides the approval control itself, so the person who may skip it must not be the person the control exists to check.",
  },
  "organization.legal-hold": {
    summary: "Place or release an organization-wide legal hold",
    reason:
      "It overrides retention and deletion for everyone, including administrators subject to the hold.",
  },
} as const satisfies Record<string, OwnerOnlyOperationDefinition>;

export type OwnerOnlyOperation = keyof typeof OWNER_ONLY_OPERATIONS;

export const OWNER_ONLY_OPERATION_IDS = Object.keys(
  OWNER_ONLY_OPERATIONS,
) as OwnerOnlyOperation[];

export function canPerformOwnerOnly(
  access: { isOrgOwner: boolean } | undefined,
  _operation: OwnerOnlyOperation,
): boolean {
  return access?.isOrgOwner === true;
}
