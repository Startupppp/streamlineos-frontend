# E-sign local certification — DOC-003

This certification records **local automated proof only**, reconciled on **2026-09-10**.
Backend reference: **`75ec87be3fcefd0490b2b93634ca6eaebc051e93` plus current changes**, supplied
by the release coordinator. Root/frontend reference:
**`96d4ef1a5e2d7d6e9ff3a2bafd197f800043e037` plus current changes**. No clean-tree, deployed
provider, privacy or legal certification is claimed.

## Executed acceptance

The exact commands, exit codes and disjoint totals are in the
[current KB/Documents consolidation, section 8](./KB-DOCUMENTS-CERTIFICATION-2026-09-09.md#8-current-source-local-consolidation--2026-09-10):
backend KB/e-sign/security acceptance **143 suites / 1,107 tests**, and frontend KB/Documents
acceptance **17 suites / 139 tests**, all passing. The backend total combines KB, e-sign and
the additional security checks; it is not an e-sign-only test count. The final e-sign projection
and type-owner adjustment was verified again by **2 suites / 27 tests**, not added to those totals.

| Concern | Current executable/local evidence | Boundary of this proof |
| --- | --- | --- |
| Signing authorization | `sign-public-preview-authentication.spec.ts`, `sign-envelope-get-authz.spec.ts`, `sign-envelopes-list-scope.spec.ts`, `sign-certificate-download-scope.spec.ts`, envelope-child BOLA suites | Mocked object access and permission scopes; real database policies not rerun |
| Failed authentication, concurrency and audit trail | New `sign-authentication-durability.spec.ts`, **5 tests** | Real service, token hashing, audit writer, tenant helper and tenant-aware proxy; in-memory transaction/row-lock seam |
| Token revocation and terminal states | `sign-state.spec.ts`, `bola-esign-scope-sweeps-and-token.spec.ts`, public-token security suite | Local state and authorization behavior; no external signing session |
| Completion replay/provider boundary | `sign-envelope-completed-consumer.service.spec.ts`, `sign-integrations-after-commit.spec.ts`, tenant isolation specs | Idempotent consumer/after-commit behavior with provider collaborators mocked |
| PDF and certificate integrity | Existing source stores source-document SHA-256 and final PDF hash, and binds certificate/audit access to envelope scope | **Real PDF generation, finalization replay and integrity checks were not rerun against a current DB** |

## Reproduced and repaired defect

`SignPublicService.authenticate()` previously wrote `failedAuthAttempts`, `authLockedUntil`
and `authentication_failed`, then threw `ForbiddenException` within `withRecipientSession()`.
That helper opens `runInTenantTransaction`; `createTenantAwareDb` routes the writes into that
transaction. The thrown exception rolled them back, so repeated wrong codes never reached the
five-attempt recipient lockout and left no failed-authentication audit record.

The regression command was:

```text
pnpm exec jest --runInBand --runTestsByPath src/modules/e-sign/sign-authentication-durability.spec.ts src/modules/kb/wiki/kb-media.service.spec.ts src/modules/kb/wiki/kb-media-ledger-compensation.spec.ts
```

Before the production fix it exited **1** with **2 failed / 43 passed**: the one-attempt check
expected `1` but received `0`; the five-attempt check expected `5` but received `0`. Successful
authentication was the passing control. The same new tests pass in the final module run.

The first repair returned a failure outcome from the tenant transaction, let the counter and audit
commit, and threw the same 403 afterwards. A subsequent concurrency regression exposed a second
defect: eight simultaneous wrong codes all read the old counter and only counted as **one** attempt;
a correct code racing the fifth failure was incorrectly fulfilled. Running the new durability suite
before the concurrency repair exited **1**, with **2 failed / 3 passed**. The failures were
`Expected: 5, Received: 1` and a fulfilled outcome where a rejection was required.

Authentication now locks the recipient row matched by **org, recipient ID and token hash** using
`SELECT ... FOR UPDATE`, reads current state after acquiring that lock, and then evaluates expiry,
revocation and lockout. The selection projects only the twelve fields authentication needs. The
same transaction persists the count and audit before the failed outcome is translated to 403.
Eight simultaneous wrong-code requests now stop at the fifth attempt; a correct code queued behind
that fifth failure sees the newly committed lockout. Successful authentication still resets earlier
failures. All five regression cases pass. The previously internal session-state union now lives
beside the other signing state types in `sign-state.ts`; the public service stays at **496 lines**.
HTTP success/error contracts and database schema are unchanged.

The concurrency regression models transaction commit/rollback and queued row locks in memory.
It does **not** claim to exercise real PostgreSQL concurrency. The current public HTTP caller
has no ambient tenant transaction because public authentication bypasses JWT user attachment;
calling this method inside a future outer tenant transaction would require rechecking the
failure-commit boundary.

Source fingerprints captured during the **2026-09-10** acceptance run:

| File under backend | SHA-256 |
| --- | --- |
| `src/modules/e-sign/sign-public.service.ts` | `e102add2ae697ed5d0ec487da2149345875b4a906697c18f729321d4d33eaaa7` |
| `src/modules/e-sign/sign-authentication-durability.spec.ts` | `cd0879c0e4d031bb3bc98d10436f218c4e741c244af775ba2560943eb52d9670` |
| `src/modules/e-sign/sign-state.ts` | `a51159ba3eac929107f361d236e1bbb6eba0a49021ffe428ad03950566f04842` |

## Outstanding DB, browser and deployed proof

The existing `src/modules/e-sign/__tests__/e-sign-signing-flow.e2e-spec.ts` covers required
fields, complete signing, certificate/final-PDF creation, repeated finalization, token expiry,
void/revocation, decline, watermarking and cross-tenant reads. **It was not run here**: it needs a
fully migrated disposable database. It also starts the application and writes fixture records, so
running it against the configured outdated remote database is not an acceptable substitute.

Next acceptance must run that suite and the current KB database/seeded suites in an isolated,
fully migrated environment with storage/email mocked; then execute deployed storage, delivery,
replay/outage and retention/legal-hold drills against approved provider sandboxes. Provider
regions, retention, disclosure and privacy approval require named human approval. These
requirements remain explicit in **DOC-004**. Browser signing and Documents accessibility remain
**DOC-002**; the coordinator found no browser connection. No provider message, email, payment or
signature was transmitted during this certification.

Typechecks/builds/cycle checks belong to the coordinator's integration record. Jest does not
replace them, and this artifact does not assert their results.
