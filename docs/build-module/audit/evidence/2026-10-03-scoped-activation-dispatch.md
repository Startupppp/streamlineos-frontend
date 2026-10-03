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

The earlier [production catalog evidence](./2026-10-03-production-catalog.md) recorded the receipt table and referenced event composite key as absent. After the source commit, the coordinator executed the actual `BuildBrowserActivationStore.receiptPrerequisites` catalog query through IAM as `streamline_app`, with PostgreSQL `default_transaction_read_only=on`. The query executed successfully and returned `false`, consistent with the absent prerequisite. No schema, ledger, or business record changed. This verifies the false-result SQL path; positive readiness and strict-check deparse parity remain Current unverified.

## Invitation and capture truth

Publisher `delivered` does not alone mean invitation activation succeeded. After dispatch, the command reads the exact event's outbox state, the canonical setup consumer's inbox state, and same-event receipt outcomes. Optional consumer failure, missing or mismatched receipts, refused invitations, failed queueing, and invalid referenced invitations produce explicit partial or failed state.

Only successful same-event queued receipts with a bound same-organization reserved invitation recipient can trigger mail handoff. Accepted invitations require no handoff. The existing recipient command runs in a fresh tenant transaction and remains bounded to five pending messages for that same reserved recipient. It is recipient-scoped rather than email-row/event-scoped. Global email retry sweeps and direct consumer invocation are not used.

Commands serialize per organization so different setup events cannot concurrently race that recipient-only handoff in this runner process. This does not establish cross-process exactly-once email delivery. A bounded pending-row existence check exposes transport failures that the existing mail command catches internally. Capture errors and remaining pending mail produce partial state rather than a false completion report.

The response exposes event ID, actual outbox/inbox state, publisher counters, aggregate receipt counts, aggregate capture counts, and explicit error code. It excludes recipients, raw tokens, message bodies, and provider credentials. Existing reserved mailbox capture remains separate. Capture does not prove delivery through a real email provider.

## Coordinator runtime evidence and remaining acceptance

### Coordinator real HTTP and persistence checks

The coordinator used the reviewed loopback runner with reserved synthetic owner `owner-20261003-flow02@build-verification.invalid`. The configured IAM application database was used. Commands targeted the new synthetic organization; no existing-organization writes were intentionally issued, and there was no global write census. The test email transport captured the OTP message. Raw codes, magic-link credentials, JWTs, session proofs, environment values, and the activation capability stayed in process memory and are excluded from this report.

| Action | Current verified observation | Remaining scope |
|---|---|---|
| Request OTP, submit wrong code, submit captured code, replay code | Request 200; wrong code 401; correct code 200; consumed-code replay 401 | Provider delivery and browser signup remain unverified. An initial test extractor incorrectly matched a CSS six-digit value; extraction was corrected to the template's code element before the successful request. |
| Verify returned magic link and perform canonical web-session proof exchange | Both returned 200; the real issued session was used, with no direct backend-token minting | Additional principal, MFA, expiry, and revoked-session matrices remain open. |
| Read setup session twice before organization creation | Both 200, virtual ID 0, `not_started`, null start; status had no organization and `ready=false` | No claim of an exhaustive account-level write census. A bounded application-role read confirmed zero active memberships. |
| Submit Build-only owner setup with no invitations | 201, success, a new organization, and an auto-login credential | This is one new-owner journey. Multi-module, invited/member/client, recovery, and quota journeys remain open. |
| Consume auto-login credential and exchange the real new-organization session | Both 200; same user and exact new organization | Browser cookie/session synchronization remains open. |
| Repeat setup status/session, checklist list/Build detail, and employee onboarding GET group | Every GET 200; sorted row digests/counts for actor sessions, organization checklists/items/analytics, and setup stamp unchanged before/after | GET purity is proven for these tracked rows, not every database/cache operation. Inaccessible module/actor and HR-probe matrices remain open. |
| Read exact stored setup producer | Exactly one owner/org/Build/no-invitee producer; `DELIVERED`, zero retries, no stored error; canonical inbox `COMPLETED`, no stored error | It was already delivered before explicit runner dispatch. These rows do not identify the dispatcher host or deployed source revision. |
| Dispatch with wrong capability or a random nonexistent event | Both 403 `BUILD_BROWSER_SYNTHETIC_ONLY` | Foreign existing events, inactive owners, other principal kinds, and simultaneous HTTP commands remain open. |
| Dispatch exact already-delivered producer | 200, completed, `DELIVERED`/`COMPLETED`, zero publisher claims and all zero invitation/mail counts | This verifies protected readback/no-op replay. It does not prove a first claim or local consumer execution. Tracked onboarding rows remained unchanged. |
| Read Build project collection | 200; zero projects in this new synthetic organization | This proves authorized empty collection access only. Project creation/detail/filters and browser remain open. |
| Replay the same owner setup after fresh canonical session exchange | 201, same organization, no new auto-login credential; tracked sessions/checklists/items/analytics/setup stamp and exact setup outbox/inbox/login credential counts and digests unchanged | The replay still performs directory activation and cache invalidation; no global zero-write claim. The first replay attempt used an expired backend token and returned 401; fresh real session exchange succeeded. |

The replay snapshot contained one actor setup session, one Build checklist, two checklist items, two onboarding analytics rows, one setup producer, one canonical setup inbox row, and one organization-bound login credential. The checklist list additionally returned virtual `kb` and `chat` checklists with null IDs for the platform's universal surfaces; that is not evidence of paid product activation. Build's checklist remained `not_started` with durable IDs, while the organization setup session was completed. Employee onboarding remains a separate journey.

#### Delivery provenance

Independent source review traced `completeSetup` to an atomic producer insert followed by directory/cache publication and an outbox wake signal. The reviewed runner overrides the sole registered outbox worker and sets shared dispatch/in-process worker flags to `false`. Its enabled dedicated publisher is called only by the explicit scoped command, whose claim excludes `DELIVERED`. Checklists and the completed setup session are materialized by the setup consumer, not the ordinary owner request.

The producer was already delivered before the coordinator invoked the scoped command, so this observation must not be attributed to that later command. A separate dispatcher sharing the production database is a plausible explanation. The schema stores no worker host identity; database timestamps and completed state alone cannot prove which process/revision executed it. Deterministic local-consumer acceptance needs an isolated target or separately supported worker exclusion, plus process-attributed logs. No deployed worker was disabled or altered for this test.

### Current unverified: remaining checks

- Verify the positive catalog prerequisite result after independently reviewed schema application; the current-target false result is recorded above.
- Prove strict-check deparse parity, valid receipt shapes, null-reason rejection, foreign-organization rejection, RLS, privileges, and supporting index behavior in the isolated migration proof environment.
- Independently review additive migration/deployment before the target becomes receipt-ready.
- Verify untested real HTTP MFA/admission states, inactive/non-owner/principal denials, foreign existing events, missing-schema refusal before an invite-bearing claim, concurrent commands, and first-claim provenance. Runner startup and the specific authenticated HTTP actions above are already recorded.
- Verify a synthetic onboarding producer event through canonical delivery, durable exact-event receipts, capture, invitation acceptance, explicit module assignment, authorized landing, and persistence after refresh.
- Collect actual browser console/network and role/tenant evidence, with deployed/source revision parity stated.
- Extend reviewed activation dispatch to multiple enabled modules before using this runner to certify that journey.

The implementation agent did not start a server, apply a migration, or execute a target mutation. After independent review and commit, the coordinator started the local reviewed runner with a secret process-only capability delivered through stdin. Its loopback health returned HTTP 200. Health does not verify protected-command authentication, activation, or invitation acceptance. No compound acceptance criterion or Build TODO was marked complete.

## Delivery checklist

- [x] Record the named evidence, its source or runtime scope, and the remaining verification limits in this report.

Unfinished implementation and release acceptance remain tracked in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). This checked item records evidence capture only.
