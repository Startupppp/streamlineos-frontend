# Organization setup disposable migration proof

Status: Current verified focused PostgreSQL proof with five unresolved defects. Full migration-chain and application/browser verification remain Current unverified.

Claim: `BLD-MIGRATION-SCRATCH-PROOF-02`, reserved at outer `d35c76017`. Source review snapshot: outer `82e0df5e091edd90d0ddf7ad8afac25c6990c698`, backend `ea389fa01408a062f7e527c1188c88b25422b000`. Root independently reviewed and approved the five source/test paths; backend source commit `47527950919d68770ebd6b7980d347711e11a166`.

## Current verified evidence

- Initial read-only IAM administrative catalog checks confirmed LOGIN, CREATEDB, maintenance CONNECT, `template0`, and a distinct application role without superuser/RLS bypass. These inventory calls created no database; the later authorized scratch execution is recorded below.
- The receipt table and outbox organization/event key were absent at the observed production catalog snapshot. This observation does not establish migration application or deployment parity.
- A read-only PostgreSQL SELECT over synthetic VALUES confirmed `REFUSED` and `DELIVERY_FAILED` with NULL reasons evaluate UNKNOWN under the historical CHECK. The later isolated application-role INSERTs confirmed both malformed shapes were accepted.
- `node --test src/scripts/__tests__/organization-setup-migration-proof.test.mjs`: 16 tests passed. These exercise URL/role/identity/cleanup rejection, exact approval before connecting, preexisting-database refusal without mutation, initialized current-run cleanup, refusal with unrelated sessions and no DROP, source hash seals, exact fragment extraction, no whole-fragment ledgering, nonconnecting CLI plan, and bounded diagnostics.
- Scoped ESLint for all five new files passed. No source comments or type assertions were added. These `.mjs` files are outside the production TypeScript graph; no new TypeScript gate was required or claimed.

The initial new test invocation failed because the guard modules did not exist. This is new-feature red/green evidence, not a reproduced application regression. Pure tests and stubbed connection guards do not prove PostgreSQL DDL, locking, IAM database CONNECT, or cleanup execution.

## Source inventory and working hashes

| File | Lines | SHA-256 |
|---|---:|---|
| [CLI runner](../../../../backend/src/scripts/organization-setup-migration-proof.mjs) | 51 | `1f2b43d8bf3f4cb15e34fc9507328206a4d06e8a5df37ac8fce8d99d7880409c` |
| [Target and manifest guards](../../../../backend/src/scripts/lib/organization-setup-proof-target.mjs) | 187 | `7a3ae732f77510d0ec875023ceedc2f0abbecfb7da033b555acf918814779238` |
| [Immutable baseline and executor](../../../../backend/src/scripts/lib/organization-setup-proof-baseline.mjs) | 145 | `c7328425f37c870360f6ba6427d4ba694a689fa42cf958226c08647cddf66664` |
| [PostgreSQL cases](../../../../backend/src/scripts/lib/organization-setup-proof-cases.mjs) | 320 | `186028446fb3f1a198dc24751a6d66b439ad52b0db0c3d332e78daed6bc1e215` |
| [Pure guard tests](../../../../backend/src/scripts/__tests__/organization-setup-migration-proof.test.mjs) | 192 | `f41a6014491ecb37cbd84827a8b2836d343a74abf568cb52fef51c3691154b41` |

## Execution boundary

The default CLI prints a plan without connecting. Execution requires both `--execute` and `--approve-database=scratch_build_migration_<run-id>`, with an exact 24-character lowercase hexadecimal run ID. Only the existing configured admin/application roles and server are used. IAM authentication is required. The scratch database is created from `template0`, never a production template or data clone.

Before creation, the runner checks maintenance identity, admin capability, restricted application authority, and absence of the exact database name. Before scratch grants it rechecks physical database OID and owner. Before each mutation transaction it verifies current database, OID, owner, executing role, restricted application role, process ID, and the durable `proof.run_manifest` row. Database URLs, IAM tokens, exception messages, business records, and query bind values are never emitted.

Cleanup checks the durable manifest, closes owned clients, verifies the physical database/owner again, and requires zero database sessions. It uses no FORCE drop or session termination. An unexpected case failure attempts this same guarded cleanup and reports its exact controlled failure if refused. A startup failure before durable manifest initialization closes clients and requires manual inspection; it does not guess ownership and drop a database. A process crash can leave an isolated proof database, which needs separately reviewed recovery.

The initial source-construction slice made no database changes. After the exact source/evidence commits and independent root review, the authorized execution below created and removed only its unique scratch database.

## Authorized scratch execution

Reviewed backend commit: `47527950919d68770ebd6b7980d347711e11a166`. Initial evidence commit: outer `4531f53cf`. Run ID: `ecee168be7b2bdaa1913511b`; exact database: `scratch_build_migration_ecee168be7b2bdaa1913511b`.

The dry plan completed with `execute:false`. The subsequent execution supplied the matching `--approve-database`, used template0 and synthetic-only fixtures, and completed 62 PostgreSQL checks: 57 passed and five failed. Exit code 1 truthfully preserved those failures. The proof scope stayed `invitation-fragment-0965-and-receipts-1728`; `wholeChainVerified` and `applicationRuntimeVerified` remained false.

| Failed check | Expected | Observed |
|---|---|---|
| Equivalent invitation key during receipt upgrade | Reuse one equivalent key | `1728` created a duplicate equivalent invitation index |
| REFUSED with NULL reason | SQLSTATE `23514` | INSERT returned `NO_ERROR` |
| DELIVERY_FAILED with NULL reason | SQLSTATE `23514` | INSERT returned `NO_ERROR` |
| Receipt invitation child index | Valid `(org_id,invitation_id)` index | No supporting index |
| Receipt rollback after a preexisting outbox key | Preserve the previously owned key | Historical rollback removed the key |

Positive and negative companion checks passed for all four valid receipt outcomes; wrong-org event/invitation/member links rejected `23503`; malformed emails/outcomes/reasons rejected `23514`; wrong-tenant write, absent tenant context, and application UPDATE/DELETE rejected `42501`. Real independent application connections deduplicated receipt replay to one persisted row.

Cold prerequisite creation, sequential and real concurrent proof-executor apply-once, INCLUDE preservation, and alternate-key prerequisite reuse passed. Nine malformed canonical-key cases rejected `P0001` without ledger writes. The actual conflicting lock test produced `55P03`, left no index/ledger residue, then retried successfully. A nonunique canonical outbox key rejected `42830` atomically. The malformed existing receipt table was refused by postconditions without a success ledger row.

Exact original receipt SQL replay rejected duplicate policy `42710`; guarded prerequisite rollback rejected `P0001` while retaining its key. Dependent-FK receipt rollback rejected `2BP01` and preserved the table/index transactionally. Invitation cascade removed only linked receipts; ordinary receipt rollback retained parent organizations/events and the shared invitation key. The twelve-statement `0965` fragment never gained a whole-migration ledger row.

The runner reported `droppedCurrentRunDatabase:true`. A fresh independent IAM READ ONLY catalog query confirmed the exact proof database no longer existed. The same read confirmed production still had neither the receipt table nor the outbox organization/event index. No production schema, ledger, or business fixture was changed. The two-organization fixture establishes bounded correctness and lock behavior; it does not establish large-data performance or complete cold bootstrap.

## Baseline and proof scope

The fixture extracts the exact organizations/members/invitations CREATE statements and organization foreign keys from immutable `0000`; global users and their unrelated authentication schema are outside the focused baseline. It applies sealed `0305`, `0310`, `0314`, `0335`, `0346`, `0374`, `0784`, `0785`, and `0927` SQL in dependency order. These fixture steps are recorded only in `proof.applied_steps`, not presented as a complete cold journal.

Exact whole migrations `0941a` and `1728` use their original SQL/hash/timestamp and atomic ledger writes under a proof-local transaction advisory lock. Essential receipt columns, original validated constraint definitions, tenant policy, and application grants must match before a receipt success row is recorded. The advisory lock belongs to this proof executor; it does not establish concurrency safety for existing deployment appliers.

`0965` execution is explicitly its twelve invitation statements 84–95, extracted from the sealed 147-statement file. Its parent hash is `f61132d4e4baff8215f12c52a302eff74ef90a0aa369af220a33cf3ca5180d06`. The fragment is recorded as a fragment in `proof.applied_steps`; the whole migration is never inserted into `drizzle.__drizzle_migrations`.

Full `0965` needs 44 relations and an inherited `gl_accounts` constraint; rollback also references `payment_providers`. Full strict cold/upgrade replay, both supported migration runners, AppModule runtime, outbox publication, invitation activation, and browser behavior remain separate open gates. The legacy focused runner's historical `0768` chain failure is not refreshed by this fixture proof.

## Prepared PostgreSQL cases

- Cold canonical key creation, sequential apply-once, concurrent proof-executor apply-once, valid INCLUDE key retention, and equivalent alternate-key reuse.
- Canonical nonunique, reversed, partial, expression, three-key, deferrable, relation-name collision, wrong-table, and invalid-canonical/valid-alternate rejection with no ledger residue.
- Bounded conflicting write-lock failure and successful retry; nonunique outbox canonical-key rejection and atomic rollback.
- Existing malformed receipt table rejected by required postconditions before ledger success.
- Valid receipt outcomes, invalid emails/outcomes/reasons, same-org event/invitation/member foreign keys, RLS read/write isolation, missing tenant context, and denied application UPDATE/DELETE.
- Independent application connections replay the same receipt with conflict handling; exactly one row persists.
- Direct historical receipt SQL replay refuses the duplicate policy; proof executor replay skips one ledger identity.
- Invitation cascade, receipt rollback preserving parents/shared invitation key, dependency-blocked rollback atomicity, guarded prerequisite rollback, and preexisting outbox key ownership behavior.

## Findings that must stay failed

The runner collects failed checks and exits nonzero; successful cleanup does not turn them into passes. All five failures listed above were reproduced in real PostgreSQL and remain unresolved by this claim.

Root approved future additive identities `ck_organization_setup_invitation_receipts_outcome_strict`, wrapping the historical four-branch predicate in `IS TRUE`, and `idx_organization_setup_invitation_receipts_org_invitation` on `(org_id,invitation_id)`. They are outside this claim. Historical `1728` remains immutable. Isolated INSERT/index RED is now recorded; repair requires its separate claim and review.

## Tracking

- [x] Refresh ownership and repository rules; preserve unrelated changes.
- [x] Inspect IAM capability and migration dependencies using read-only access.
- [x] Implement unique current-run target, durable identity guards, source seals, and truthful fragment boundaries.
- [x] Pass 16 pure tests and scoped lint without database execution.
- [x] Obtain independent source review and commit the exact claimed files.
- [x] Authorize and provision the exact named scratch database.
- [x] Execute PostgreSQL cases, record SQLSTATE/count evidence and actual cleanup outcome.
- [x] Reproduce NULL-reason and child-index RED.
- [ ] Reserve and verify additive repairs and upgrade/rollback ownership decisions separately.
- [ ] Verify official migration runners, full chain, deployment, and browser activation separately.

## Delivery checklist

- [x] Record the named evidence, its source or runtime scope, and the remaining verification limits in this report.

Unfinished implementation and release acceptance remain tracked in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). This checked item records evidence capture only.
