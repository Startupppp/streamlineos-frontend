# Client portal activation source audit

Status: Current unverified in a running application; source findings recorded 2026-10-03. Requirement: [BLD-005](../implementation/REQUIREMENT-LEDGER.md). Owner: `ARCH-17-CLIENT-PORTAL-ACCESS` in the [work claims](../implementation/WORK-CLAIMS.md).

## Customer outcome

An authorized Build owner or administrator selects a project and an external client, chooses the permitted artifacts and expiry, and submits once. Success means a durable scoped grant and a usable single-purpose invitation exist together. The client accepts a secure link and sees only published, permitted project content. Revocation, expiry, or unpublication blocks the next request, including file access.

## Current source observations

| Boundary | Source | Finding |
|---|---|---|
| Internal invite | `backend/src/modules/portal/access/portal-access.service.ts` `inviteClient`; `frontend/features/portal-access/invite-client-dialog.tsx` | The API creates Party, Contact, and an `ACTIVE` portal membership through separate calls. The UI says portal access was activated. This path does not create a portal invitation, project grant, delivery outbox row, or usable link. |
| Separate grant | `backend/src/modules/portal/access/lib/project-client-grants.ts` | Grant creation is a later command, so the present invite success and project access are not one durable outcome. |
| Guest acceptance | `backend/src/modules/portal/auth/portal-auth.service.ts` | The accept endpoint consumes `portal_invitations`, but this audit found no invitation producer in the portal module. Before backend `61c0d9faf`, final status update did not condition on still being `PENDING`. The source now claims one pending, unexpired invitation by tenant, ID, and token hash before changing membership or minting a session. Target database concurrency proof remains open. |
| External reads | `backend/src/modules/portal/client/portal-client.service.ts` | Before backend `2e6266ec0`, list, overview, and change request paths omitted `projects.portal_published_at`. The source now filters to published, nondeleted, same-tenant projects with an active unexpired grant; target database and deployed behavior remain unverified. |
| Publication owner | `backend/src/modules/build/client-portal/client-portal-management.service.ts` | Publish and unpublish write the project field. External reads must honor that field. |
| Persistence | `backend/src/db/schema/portal-access/*` | Check live-grant uniqueness and invitation token lookup indexes against the target database before an additive migration. Schema declarations alone are not migration proof. |

These are source observations, not evidence that any deployed tenant was exposed or that an external link was sent. Do not describe a contact-only membership as an invitation or a grant.

## Canonical command and state

`POST /portal-access/activations` is the proposed owner command. Its strict body includes `projectId`, either an existing contact reference or name/email for a new contact, explicit client-visible capabilities, optional expiry, delivery mode (`email` or authorized one-time share), expected policy revision, and an idempotency key. Validate organization and Build management permission, project reachability, plan limits, normalized recipient identity, allowed capabilities, expiry, and publication policy before committing. Keep current granular membership and grant APIs only as compatible administration operations.

One tenant transaction resolves or creates the Party/Contact through transaction-aware owner commands, records a pending portal membership and hashed invitation token, creates one project-scoped grant, and queues delivery in a transaction-bound email outbox. No raw token is stored. Return `activationId`, grant ID, invitation ID, masked recipient, state, delivery outcome, and allowed next action. A share URL is returned only for the explicit authorized copy-link mode. `success` never describes an unsent email as delivered; report `pending_delivery`, `email_not_sent`, or a durable retry state.

Acceptance atomically claims one unexpired `PENDING` invitation and activates the matching membership. It may mint one current session only after the state claim commits. Duplicate and concurrent redemption must yield one winner and a safe generic rejection for the loser. Any grant remains project scoped and can be narrower than the portal membership.

The external read owner uses one effective-grant predicate across list, overview, change request, and signed file issuance: same tenant, active membership, active unexpired grant, nondeleted project, `portalPublishedAt IS NOT NULL`, and record/field visibility. Client projection excludes internal descriptions, private comments, hidden files, rates, and unapproved statuses even when an internal ticket links to the project. All denial paths use safe `401` or `404` without leaking another project.

## Proposed UI flow

The Build-wide Client Access page and project Client Portal settings open one project-aware `Invite client` dialog. Required fields are project, recipient, and access preset; an advanced section controls individual artifact capabilities, expiry, and email versus authorized copy-link delivery. Preview shows exactly what the client will see. Submit has a stable pending state; retries reuse the same idempotency key. Success shows invitation and grant status as separate facts and a usable next action. An unsent invitation remains visible with retry or copy-link only when policy allows. Refresh preserves the status. Revoke and unpublish update the guest view immediately.

## Migration and negative evidence

Before migration, count duplicate active grants per membership/project and duplicate token hashes, resolve them with a reversible plan, then add a partial unique live-grant invariant and a unique token hash/indexed pending-expiry lookup. Add a first-view marker or event idempotency key only when the event contract is defined. Record migration ownership and rollback in the [migration plan](../implementation/15-migration-cleanup-and-reuse-plan.md); never choose a migration number without checking the live sequence.

Required proof: wrong organization/project, denied Build actor, hidden fields, unpublished project, suspended/revoked membership, expired/revoked grant, replayed/expired token, concurrent accept, rollback at every creation boundary, outbox suppression/provider failure, duplicate submission, signed file after revoke, and target database RLS. Browser verification must cover actual invitation delivery or authorized link, guest entry, project visibility, refresh, revoke, and unpublish with network/console evidence. Deployment and worker revisions must match the tested source.

## Delivery checklist

- [x] Inventory the current invite, grant, accept, publication, and guest-read source paths above without claiming deployed behavior.
- [x] Complete the external publication guard source slice under `ARCH-17` at backend `2e6266ec0`: 5 portal-client suites/53 tests, production typecheck, and scoped lint pass; live database/browser revocation proof remains open.
- [x] Complete the conditional guest-acceptance source slice under `ARCH-17` at backend `61c0d9faf`: 2 portal-auth suites/19 tests, focused enforcement 11 tests, production typecheck, and scoped lint pass; target database concurrency proof remains open.
- [ ] Build one retry-safe activation command that persists recipient, invitation, project grant, and delivery intent in one tenant transaction.
- [ ] Prove conditional, expiry-aware invitation acceptance and concurrent redemption on a target database, including rollback, replay, and session mint behavior.
- [ ] Replace the false-success invite UI with one project-aware activation flow and truthful delivery states.
- [ ] Reconcile the grant/token indexes and first-view event with additive migrations, backfill checks, and rollback.
- [ ] Prove tenant, role, publication, grant, file, retry, worker, browser, and revocation behavior before marking BLD-005 verified.
