# Scoped synthetic activation dispatch — 2026-10-03

## Scope and revision

Claim: `BLD-BROWSER-SCOPED-ACTIVATION-02` in [WORK-CLAIMS](../../implementation/WORK-CLAIMS.md).

Backend source revision: `ea389fa01408a062f7e527c1188c88b25422b000`.

This source slice adds an explicit synthetic-only activation command to the existing local verification runner. It does not add a production route or change production publisher, consumer, email, permission, migration, frontend, or seeded-harness files. The coordinator independently reviewed the implementation and the repairs before approving the exact nine-path source commit.

## Current verified: source checks

| Check | Result | Practical boundary |
|---|---|---|
| Focused Jest run | Three suites, 140 tests passed | Mocked service/store scenarios and source metadata checks; no database or browser journey proof. |
| Scoped ESLint | Passed for all nine owned files | No new code comments or type assertions were added. |
| Scoped TypeScript | Passed with a 10 GB heap after correcting owned fixture inference and copied-config typing | Includes runner helpers, their focused specs, imported source, and canonical Express declarations. This is not the repository-wide test typecheck. |
| `git diff --check` | Passed | Whitespace validation only. |
| Independent review | Coordinator reviewed the final source and approved commit after the scoped TypeScript pass | Live SQL, startup, HTTP, persistence, and browser acceptance remain separate. |

Focused test command, from `backend`:

```powershell
pnpm exec jest --runInBand --runTestsByPath test/security/build-browser-activation.spec.ts test/security/build-browser-boundary.spec.ts test/security/build-browser-runner.spec.ts
```

Scoped TypeScript used an ignored `.scratch/tsconfig-build-browser-activation.json`:

```json
{
  "extends": "../tsconfig.test.json",
  "compilerOptions": { "incremental": false },
  "include": [
    "../src/**/*.d.ts",
    "../test/helpers/build-browser-*.ts",
    "../test/helpers/run-build-browser-verification.ts",
    "../test/security/build-browser-*.spec.ts"
  ],
  "exclude": ["../node_modules", "../dist"]
}
```

```powershell
node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit -p .scratch/tsconfig-build-browser-activation.json
```

## Command and authorization contract

`POST /__build-verification/activation/dispatch` exists only in the test-created Nest module. Its strict body contains only a UUID `eventId`.

The runner requires process environment variable `BUILD_BROWSER_ACTIVATION_CAPABILITY` to contain 64 lowercase hexadecimal characters before startup. The command requires the matching `x-build-verification-capability` header. The value is neither logged nor returned by an endpoint. A separate process-local capability supplements the existing socket/Host/Origin boundary and real request authentication; it does not replace them.

The route retains global JWT, admission, MFA, rate limiting, and route classification. It declares `AuthorizedInService("BuildBrowserActivation.assertSyntheticOwnerAndEvent")` and `NoTenantTransaction`. The latter allows canonical publisher delivery to use its own tenant transactions rather than borrow the HTTP transaction.

The command requires a human session, no impersonation, an active reserved synthetic account, a selected reserved synthetic organization, and live active Org Owner standing from `MembershipStateService`. The stored organization owner's canonical email must match the actor. Client-supplied owner claims do not create authority. Personal tokens and other principal kinds are refused.

The event is read using both authenticated organization and event ID. Its type, organization aggregate, aggregate ID, payload organization, and initiating user must match the authenticated owner and the canonical setup event. Every invitation recipient must use the reserved email domain. The initial reviewed module selection is exactly Build, and Build must remain enabled. Multi-module dispatch is Deferred pending an explicit reviewed extension; the production onboarding selection contract is unchanged.

Unexpected consumer registration fails closed. A dedicated publisher receives a copied application configuration with dispatch enabled; shared configuration, environment dispatch flags, the registered publisher, workers, and global drains remain disabled. Delivery uses only canonical `flushEvent(orgId,eventId)`, preserving the shared claim, lifecycle, transaction, deadline, retry, inbox, and lease-fence mechanisms.

## Receipt readiness and three-valued constraint gap

Invite-bearing events require the receipt catalog prerequisite before any event claim. Missing or wrong schema returns `BUILD_BROWSER_RECEIPTS_SCHEMA_UNREADY` without publication or mail handoff.

The prerequisite checks expected columns, nullability, creation-time default, primary key, usable referenced composite unique keys, validated same-organization foreign keys, expected historical checks, the stricter validated outcome check, tenant RLS policy, and application-role SELECT/INSERT privileges. Checks use exact catalog projections and constraint deparse expectations. Their live SQL and deparse parity are Current unverified in this source slice.

The historical `1728` outcome check can evaluate to SQL UNKNOWN for refused or delivery-failed rows with a null reason. UNKNOWN passes a PostgreSQL CHECK. Readiness therefore additionally requires `ck_organization_setup_invitation_receipts_outcome_strict`, the complete original four-branch predicate wrapped with `IS TRUE`. The additive migration/schema work is Planned and separately owned; the historical migration is unchanged. An environment containing only the historical check cannot pass the new prerequisite.

The earlier [production catalog evidence](./2026-10-03-production-catalog.md) recorded the receipt table and referenced event composite key as absent. That observation was not refreshed by this source slice and must not be treated as a new database check.

## Invitation and capture truth

Publisher `delivered` does not alone mean invitation activation succeeded. After dispatch, the command reads the exact event's outbox state, the canonical setup consumer's inbox state, and same-event receipt outcomes. Optional consumer failure, missing or mismatched receipts, refused invitations, failed queueing, and invalid referenced invitations produce explicit partial or failed state.

Only successful same-event queued receipts with a bound same-organization reserved invitation recipient can trigger mail handoff. Accepted invitations require no handoff. The existing recipient command runs in a fresh tenant transaction and remains bounded to five pending messages for that same reserved recipient. It is recipient-scoped rather than email-row/event-scoped. Global email retry sweeps and direct consumer invocation are not used.

Commands serialize per organization so different setup events cannot concurrently race that recipient-only handoff in this runner process. This does not establish cross-process exactly-once email delivery. A bounded pending-row existence check exposes transport failures that the existing mail command catches internally. Capture errors and remaining pending mail produce partial state rather than a false completion report.

The response exposes event ID, actual outbox/inbox state, publisher counters, aggregate receipt counts, aggregate capture counts, and explicit error code. It excludes recipients, raw tokens, message bodies, and provider credentials. Existing reserved mailbox capture remains separate. Capture does not prove delivery through a real email provider.

## Current unverified: required remaining evidence

- Execute the exact catalog prerequisite SQL through the real application role on the current target and retain its explicit false/ready result.
- Prove strict-check deparse parity, valid receipt shapes, null-reason rejection, foreign-organization rejection, RLS, privileges, and supporting index behavior in the isolated migration proof environment.
- Independently review additive migration/deployment before the target becomes receipt-ready.
- Start the reviewed runner with the process-local capability and verify the registered route through real HTTP authentication, MFA/admission behavior, synthetic owner checks, foreign event rejection, and missing-schema refusal before claim.
- Verify a synthetic onboarding producer event through canonical delivery, durable exact-event receipts, capture, invitation acceptance, explicit module assignment, authorized landing, and persistence after refresh.
- Collect actual browser console/network and role/tenant evidence, with deployed/source revision parity stated.
- Extend reviewed activation dispatch to multiple enabled modules before using this runner to certify that journey.

No server was started, no migration was applied, and no target verification mutation was executed by this source slice. No compound acceptance criterion or Build TODO was marked complete.
