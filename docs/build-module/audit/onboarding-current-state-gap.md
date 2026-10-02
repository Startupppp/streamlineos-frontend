# Signup and onboarding current source gap

Status: Current unverified in a running application; source audit recorded 2026-10-03. Canonical target: [Signup and multi-module onboarding](../onboarding/01-signup-and-multi-module-onboarding.md). Requirement: [BLD-001–003](../implementation/REQUIREMENT-LEDGER.md). Package: `ARCH-14-ACTIVATION`.

## Source-to-target matrix

| Customer journey | Current source observation | Planned contract and acceptance |
|---|---|---|
| Step count and language | `frontend/features/org-setup/lib/constants.ts` and `frontend/app/org-setup/page.tsx` present Welcome → Basics → Invite. People is optional by content but still shown as a screen. | Workspace → Products → optional People; inline launch summary. A Build-only owner can finish with at most five visible required inputs and can skip People without an empty step. |
| Workspace fields | `frontend/features/org-setup/lib/basics-schema.ts` requires full name, goals, industry, company name, team size, and phone; country is also visible. | Collect only what activation needs, infer reversible defaults, put profession, region, and advanced controls behind disclosure. Exact five-input count is browser-tested at desktop and mobile. |
| Product selection | Goal chips derive a restricted set of product keys and force Chat plus Knowledge in `features/org-setup/lib/constants.ts` and `setup-payload.ts`. | One or many explicit catalog modules, including Build alone and Build with CRM/HRMS, with plan eligibility, adaptive questions, and a preview of the enabled scope and quota impact. Module answers remain owned by their adapters. |
| Template and custom fields | `wizard-data-schema.ts` and setup payload do not carry an immutable template version or module-owned custom-field draft. | Preview template before launch; save draft field definitions and reconcile them into the owning module only after activation. Reject unknown or stale template versions. |
| Internal people | `step-invite-launch.tsx` supports multiple invitations, Member/Admin selection, and selected module grants. | Keep this source path. Show quota and grantability using actual organization usage and selected modules, not only trial catalog headroom. Client invitations use their own portal grant flow. |
| Draft and resume | `lib/draft.ts` stores step/data in local storage. The page reads a setup session but does not persist edits through a revisioned server draft. GET can return an ephemeral pre-organization session. | Server-owned identity-scoped draft, revision conflict behavior, cross-device resume, double-submit idempotency, and explicit retry after partial effects. Local storage may be an offline convenience, not the durable authority. |
| Activation and destination | Backend has GET session/status and POST complete/skip with a durable outbox consumer. Frontend launch and skip still target `/dashboard`. Existing member resolution reuses an active organization membership before creating another. | Resolve valid invitation first, unfinished setup next, required module onboarding next, authorized callback next, then allowed landing. Distinct paths for new owner, existing user creating an organization, invited member, returning user, and external client. New organization creation requires an explicit intent, not silent reuse. |
| First Build value | `WorkspaceOnboardingService` provisions department/team structure; it does not create a versioned Build project/template or first ticket. | Deliver one useful project/template and a guided first ticket or intake action, with idempotent project provisioning and a clear recovery path. |
| Plan eligibility | Before backend `9fd0b94d2`, `OrgSetupService.completeSetup` provisioned selected modules without the `PLAN_LOCKED_MODULES` check used by ordinary entitlement changes. The source now reads the current tier inside the setup transaction and rejects locked selections before module writes; target database and concurrent subscription-transition behavior remain unverified. | Use the same eligibility policy in preview; prove mixed-selection rollback and server outcome on a target database. Coordinate billing transitions with setup if the subscription race is confirmed. |

The source observations do not prove browser behavior, database persistence, mail delivery, or deployment. The [client portal audit](./client-portal-activation-gap.md) owns external client activation; an internal organization invitation cannot substitute for a portal grant.

## Sequenced implementation

1. Close the no-migration plan eligibility guard and test Free, trial, mixed, stale preview, Build-only, and retry paths.
2. Define a strict versioned Workspace/Products/People draft and preview contract. Preserve existing invitation grant payloads and permission keys.
3. Add identity-scoped pre-organization draft/session and activation-run tables with additive migration, bounded backfill if needed, idempotency key, revision, expiry, privacy limits, and rollback.
4. Build the five-input responsive shell and explicit module catalog/adaptive adapters. Place template and custom-field editors behind optional disclosure.
5. Replace local-only persistence with server draft save/resume and conflict handling. Route launch through the activation coordinator and fresh effective-access landing resolver.
6. Add first-use Build project/template provisioning through the canonical project command, then cross-module adapters one at a time.
7. Verify six journeys, roles, tenant boundaries, plan quotas, worker crash/replay, browser history, refresh, mobile, keyboard, and funnel metrics on a named deployment before release verification.

## Delivery checklist

- [x] Reconcile the current wizard, backend endpoints, draft storage, invitation payload, and launch destination against the three-step target without claiming runtime verification.
- [x] Add the transaction-bound fresh-tier plan guard at backend `9fd0b94d2`; five focused suites/109 tests, production typecheck, and scoped lint pass for Free, trial, Build-only, mixed selection, and replay. Target database rollback and concurrent subscription transition proof remain open.
- [ ] Define and migrate a revisioned, identity-scoped pre-organization draft and activation run with idempotent recovery and privacy bounds.
- [ ] Replace the current required Basics form and inferred goal modules with at most five Build-only inputs and explicit single/multi-product selection.
- [ ] Add adaptive module questions, immutable template previews, custom-field drafts, and accurate plan/quota previews without extra mandatory steps.
- [ ] Preserve internal multi-invite selected-module grants while adding separate external client grant activation.
- [ ] Implement six destination journeys and first useful Build project/ticket through canonical owners.
- [ ] Prove cross-device resume, retry, tenant/role negatives, database/outbox, and responsive browser acceptance before BLD-001 is verified.
