# Org / access notifications — design

**Date:** 2026-08-05
**Scope:** ownership transfers, invitations, membership lifecycle, structural role changes.

## Problem

The notification engine works. Nothing in the org/access domain is wired into it.

`NotificationDispatchService` runs end to end (registry → routing/quiet-hours → in-app row + realtime announce → `notification_queue` → delivery worker → email/push providers) and has ~50 call sites across accounting, finance, KB, support, MFA.

The org/access domain has zero:

| Surface | State | Evidence |
|---|---|---|
| Event catalog | No org / invitation / membership / ownership events. Only 5 `security.*` keys. | `notification-events.catalog.ts:167-173` |
| `OwnershipService` | Injects `db`, `audit`, `cache` only. No notification, no email on initiate / accept / decline / cancel / force-set / expire. | `ownership.service.ts:36-42` |
| `InvitationsService` | Sends the invite email only. Nothing on accepted, cancelled, role-changed, expired. | `invitations.service.ts` |
| `OrgMembershipService` | `removeMember` / `suspendMember` / `reactivateMember` / `updateMemberRole` / `leaveOrg` emit nothing. | zero `dispatch.` in the org module |
| Structural role change | `updateMemberRole` never fires `security.role.changed`; only the custom-role path in `role-member.service.ts` does. | `role-member.service.ts:266,351` |

A transfer recipient learns of a nomination only by navigating to `/settings/incoming-transfer`.

Invitation decline does not exist. The only decline routes in the backend are `sign-public.controller.ts:112` and `ownership.controller.ts:137`. Nothing writes `invitations.status = 'DECLINED'` or `invitations.declined_at` — the two references are `declinedAt: null` resets (`invitations.service.ts:281`, `:901`). `invitationEvents` declares a `"DECLINED"` event type (`db/schema/common/invitations-events.ts:8`) that is never inserted. Enum value, column, and event type are all dead.

## Constraints

**No migration needed for new events.** `resolveDefinition()` falls back to `NOTIFICATION_EVENT_MAP` when an org has no override row (`notification-event-registry.service.ts:127-128`); `onModuleInit` seeds global `orgId: null` rows. Catalog entries take effect for existing orgs on next boot.

**`notification_category` has no ORGANIZATION value** (`enums.ts:75-78`). All new events use `SECURITY` — every one is an access change, and it keeps them under one filter in the notification center.

**Emails are free for members.** `NotificationEmailProvider.buildHtml` renders title/message/link through the shared branded base template. Any event with `EMAIL` in `defaultChannels` gets a proper mail with no new template file.

**`filterOrgMemberIds` requires `status = 'ACTIVE'`** (`common/tenant/org-membership.ts:24`). A removed or suspended member is silently dropped by `dispatch.emit`. Their access-loss notice must be a direct email sent post-commit, not an engine event. Reactivation goes through the engine — the member is ACTIVE by then.

**`sourceModule` is free text**, rendered as a badge; `category` drives icon/label with a `?? SYSTEM` fallback (`notification-card.tsx:106`). No frontend change is needed for new events to render.

## Event catalog additions

Twelve entries in `notification-events.catalog.ts`, all `category: "SECURITY"`.

### Ownership — `sourceModule: "ownership"`

| eventKey | recipients | channels | flags |
|---|---|---|---|
| `ownership.transfer.requested` | recipient | IN_APP + EMAIL | HIGH, mandatory, `always_bypass` |
| `ownership.transfer.accepted` | initiator + org owner | IN_APP + EMAIL | HIGH, SUCCESS, mandatory |
| `ownership.transfer.declined` | initiator | IN_APP + EMAIL | HIGH, WARNING |
| `ownership.transfer.cancelled` | recipient | IN_APP + EMAIL | NORMAL, WARNING |
| `ownership.transfer.expired` | initiator + recipient | IN_APP | NORMAL, WARNING |
| `ownership.module_owner.changed` | new owner + previous owner | IN_APP + EMAIL | HIGH |

### Invitations — `sourceModule: "organization"`

| eventKey | recipients | channels |
|---|---|---|
| `organization.invitation.accepted` | inviter + org admins | IN_APP + EMAIL |
| `organization.invitation.declined` | inviter + org admins | IN_APP + EMAIL |
| `organization.invitation.expired` | inviter | IN_APP |

### Membership — `sourceModule: "organization"`

| eventKey | recipients | channels | flags |
|---|---|---|---|
| `organization.member.joined` | org admins | IN_APP | LOW |
| `organization.member.reactivated` | affected member | IN_APP + EMAIL | HIGH, mandatory, `always_bypass` |
| `organization.member.left` | org admins | IN_APP + EMAIL | NORMAL |

Structural role changes reuse `security.role.changed` rather than adding a parallel key, so a role change notifies the member exactly once.

## Components

### `common/tenant/org-admin-recipients.ts` (new)

`getOrgAdminUserIds(db, orgId): Promise<string[]>` — active `isOwner` plus `ORG_ADMIN` member user ids. Three call sites hand-roll the owner query today (`assert-target-not-owner.ts:61`, `org-lifecycle.service.ts:133`, `role-lockout.service.ts:22`); this replaces the duplication for recipient resolution.

### Ownership — split into three services

`ownership.service.ts` is 892 lines. Mechanical split, no logic restructuring:

- `ownership.service.ts` — module ownership records: `listModuleOwnerships`, `getModuleOwnership`, `forceSetModuleOwner`, membership fetch helpers.
- `ownership-transfers.service.ts` — `initiateOrgTransfer`, `initiateModuleTransfer`, `listTransfers`, `listIncomingTransfers`, `expireStaleTransfers`.
- `ownership-transfer-response.service.ts` — `acceptTransfer`, `declineTransfer`, `cancelTransfer`.

`OwnershipController` delegates to the three. Each file lands under 500 lines.

### Invitations — split into three services

`invitations.service.ts` is 1133 lines. Mechanical split:

- `invitations.service.ts` — `invite`, `bulkInvite`, `resend`, `changeRole`, `cancel`, `revokeAllPending`, `expireStaleInvitations`.
- `invitations-read.service.ts` — `listPaginated`, `validate`.
- `invitation-acceptance.service.ts` — `accept`, `decline`, `lockPendingInvitation`.

`OrganizationModule` exports stay source-compatible for existing consumers.

### Invitation decline (new capability)

`POST /organization/invitations/decline`, `@Public()`, token in body — mirrors `invitations/accept` and the `withPublicToken` pattern.

Conditional update on `status = 'PENDING' AND accepted_at IS NULL`, verified by affected-row count (§21: never revive an accepted or revoked invitation via an ID-only update). Writes `DECLINED` + `declined_at` + an `invitationEvents` row, then emits `organization.invitation.declined`.

Frontend: decline action on `app/(auth)/invitation/[token]/page.tsx`, plus the route added to the public allowlist in `lib/api-client.ts:20-21`.

### Emails

Three bespoke senders in `email-senders.base.ts` with templates in `templates/organization.ts`, for recipients the engine cannot reach:

- `sendInvitationRevokedEmail` — invitee may not be a user at all.
- `sendMembershipRemovedEmail` — no longer a member.
- `sendMembershipSuspendedEmail` — status is not ACTIVE.

All other notification emails render through the engine.

## Call sites

| Service | Emits |
|---|---|
| `OwnershipTransfersService` | `requested` on both initiate paths; `expired` in `expireStaleTransfers` |
| `OwnershipTransferResponseService` | `accepted`, `declined`, `cancelled` |
| `OwnershipService` | `module_owner.changed` on `forceSetModuleOwner` |
| `InvitationAcceptanceService` | `invitation.accepted` + `member.joined` on both accept branches; `invitation.declined` |
| `InvitationsService` | direct revoked-email on `cancel`; `invitation.expired` in `expireStaleInvitations` |
| `OrgMembershipService` | `member.reactivated` on reactivate; `security.role.changed` on `updateMemberRole`; `member.left` on `leaveOrg`; direct email on remove and suspend |

Module wiring: `NotificationsModule` and `EmailModule` into `OwnershipModule` and `OrganizationModule` (core).

Every emit is `void …catch(() => undefined)` after commit, matching the existing 50 call sites. A notification failure never rolls back an access change.

## Error handling

- Dispatch failures are swallowed and logged; the mutation already committed.
- Direct-email failures for removed/suspended members are logged, not thrown — access revocation must not depend on mail delivery.
- Invitation decline on an already-terminal invitation returns 404, consistent with `accept`.
- Cross-tenant transfer or invitation ids return 404, never 403 (§20).

## Testing

Per surface: the emit fires with the correct eventKey and recipient set; a dispatch rejection does not fail the mutation; removed and suspended members take the direct-email path rather than dispatch. Invitation decline gets state-machine coverage alongside the existing `invitations-state-machine.spec.ts` — decline of an accepted, revoked, or expired invitation must not mutate it.

## Out of scope

Org archive / delete / purge notifications, delegation lifecycle, module-access grant changes. Flagged for a later pass.
