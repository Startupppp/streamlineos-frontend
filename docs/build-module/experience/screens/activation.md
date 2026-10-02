# Activation and account journeys

Status: Planned

## Problem Statement

Users need a short path to useful work, while owners, invited members, clients, and returning users have different activation requirements.

## Solution

Use one identity entry and a three-step owner setup. Resolve the destination server-side before rendering unrelated setup.

## User Stories

1. As a solo freelancer, I want to skip invitations, so that I can start immediately.
2. As an agency owner, I want to select Build and CRM together, so that delivery and customer context connect.
3. As an owner, I want to invite many people with explicit module access, so that no manual role repair is required.
4. As an invited member, I want to accept my invitation directly, so that I do not create an unrelated workspace.
5. As a client, I want a secure magic link, so that I can review a deliverable without internal membership.
6. As a returning user, I want my last permitted destination, so that I resume work.
7. As an existing owner, I want another company isolated, so that customer data never mixes.
8. As a new user, I want custom fields offered optionally, so that setup does not become a questionnaire.

## Implementation Decisions

### Signup/signin

One 440 px card: Continue with Google, email, Continue, terms/privacy, and session message. Email opens OTP state with six-digit paste/autofill, resend cooldown, Change email and retry. Password/passkey and enterprise SSO are later alternatives under the existing identity module; they do not block the first activation release.

Inputs: email only before verification. API owner is Identity; signup consumes identity verification result, not a new password/token store. No account enumeration. After authentication resolve valid bound invite, unfinished owner setup, required destination-module onboarding, authorized same-origin callback, then default landing. Client audience never falls through to internal setup.

### New owner

Workspace: name, use style, country. Products: selected modules and Build work kind. These are the five default visible controls. Country defaults to locale and remains editable. Products are one selection control even with multiple choices. People is optional, with Member default, explicit Org Admin and module access chips; advanced row details collapse.

Workspace creation: identity-scoped setup session → server preview → idempotent activation transaction → selected-module adapter setup → outbox invitations → Build Command Center for Build-led setup, Home for multi-module suite entry. Keep launch summary in People; no fourth review questionnaire.

Custom fields and module adjustments are optional drawers. Combined modules add at most two blocking questions, only where safe defaults cannot produce valid records. Do not create tax/payroll/regulated records before required configuration is complete.

### Existing user creates another organization

Organization switcher → Create organization → new identity-owned setup session. Never copy grants, client lists, provider credentials, legal entity, or invoices implicitly. Offer copied public template/navigation configuration with preview. Activation returns the new tenant and clears prior-tenant read caches.

### Invited internal member

Invite acceptance page: inviter, organization, masked email, org role, selected module standings, first project grants, expiry, Accept/Decline. Verify matching identity; accept in one transaction with membership and module standing. Valid target project opens after required member onboarding; otherwise Build My Work. Multiple organizations remain selectable.

Expired/revoked: request new invitation. Wrong identity: switch account. Already accepted: continue to permitted destination. Delivery failure: pending invite remains and owner can resend. Accept retry does not duplicate memberships.

### Returning user

No setup when organization is complete. Verify saved landing access; fall back to Build Command Center when Build remains accessible, otherwise Home. A missing Build assignment opens access-needed state rather than empty project counts. Resume drafts by session revision across devices.

### External client

Portal link → audience-bound exchange → grant-scoped portal overview or requested artifact. Never create internal membership. Expired link requests another without exposing account existence. Revocation ends session and signed-file access. Wrong project or unpublished artifact returns neutral inaccessible state.

### Data, APIs, cache and errors

The detailed session/run/draft schemas and /org/setup contracts are in the onboarding specification. Client acceptance uses the portal-grant module; internal acceptance uses invitation module. Autosaved owner session is revisioned, private, with no shared response cache. Resume shows only actor-owned drafts.

Every launch failure shows which durable stage failed and Retry. Email failure is a warning after workspace activation, not false failure of organization creation. Inputs and module drafts survive deselection and errors according to stated retention.

### Visual and mobile behavior

Progress names: Workspace, Products, People. Header shows Back and close/resume. Sticky Continue at bottom; optional details collapsed. Multi-invite paste/CSV validates in a preview sheet. Mobile uses stacked product cards and one expanded invitation row at a time. No dashboard setup wall appears before first useful work.

## Testing Decisions

Test all six journeys through real identity/session fixtures and durable activation outputs. Include no-invite solo, Build+CRM+HR, custom field defaults, duplicate invite, exceeded plan, wrong email, retry, partial module failure, tenant switch, expired/revoked client, safe callback, and cross-device resume.

## Out of Scope

Changing authentication providers, payroll/tax onboarding implementation, or sending real invitations during documentation verification.

## Further Notes

[Detailed onboarding](../../onboarding/01-signup-and-multi-module-onboarding.md) owns schema and endpoint detail. [RBAC](../../governance/rbac/01-role-model-and-open-risks.md) owns the structural role model.
