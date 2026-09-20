# HRMS Agent Runbook

## Assignment Contract

The coordinator must fill every field. A missing exact write set, acceptance
text, or verification command means the packet is not runnable.

```md
Execute HRMS packet <child ID> only.

Outcome: <one observable customer/platform result>.
Acceptance: <exact IDs and copied criterion text>.
Context capsule: <one row from context-capsules.md>.
Read: <exact source/test files and no more than three PRD sections>.
Write: <exact production files; no globs>.
Tests you may write: <exact test files>.
Forbidden: <shared seams and every unlisted path>.
Contract: <route/method, request/response, permission/DataScope, cache, errors>.
Reproduction: <literal command and failing assertion>.
Verify: <literal focused commands>.
External evidence: <follow-up DB/PW/provider/deploy packet or none>.
Stop conditions: <named collision/decision/environment conditions>.
```

Before coding, read root and applicable frontend/backend `CLAUDE.md`. Do not
read the entire HRMS PRD corpus, use Git, edit trackers or `PAGES.md`, run full
suites, broaden the file set, or create local substitutes for shared contracts.

## Browserless Implementation Loop

1. Confirm each allowed path exists or is explicitly marked new and ensure no
   active reservation overlaps it.
2. Read only the capsule, copied acceptance, and named code/tests.
3. Run the reproduction. If it already passes, inspect whether the assertion
   is wrong or source changed; do not manufacture a diff.
4. Add the smallest focused failing test that proves the customer/platform
   outcome. Static contract tests are acceptable for routes/catalogs; use unit
   or controller tests for behavior.
5. Implement inside the exact write set. Preserve current public contracts
   unless the packet grants a new published seam.
6. Cover only applicable negative cases: denied/cross-tenant, malformed input,
   empty/error, concurrency/idempotency, stale/deleted relation, partial result.
7. Run the literal focused commands. Record exit code, test/assertion counts,
   and any warning. Never describe an unrun check as passing.
8. Inspect the exact diff for accidental generated, formatting, dependency, or
   unrelated changes. Do not revert someone else's work.
9. Return the handoff below. Browser/real-DB/provider/deployed requirements are
   `EVIDENCE_PENDING`, not agent failure.

If tests cannot run because dependencies/environment are absent, provide source
proof plus exact unrun command/error and leave the required tier open. Do not
weaken assertions, remove tests, or substitute mocks for a named real DB.

## Required Engineering Contracts

### Frontend

- Route files compose; feature modules own business UI and schemas.
- TanStack queries use the shared scoped key factory and pass abort signals.
- URL state is canonical for search/filter/sort/view/cursor where shareable.
- UI permission checks improve presentation; they do not replace server scope.
- Required labels, schema, request, and conditional UI agree.
- Loading, initial empty, filtered-empty, error/retry, denied, disabled,
  not-found, stale/deleted, and success states are intentional.
- Use semantic tokens and shared components. A second consumer triggers a
  shared-seam request, not copy/paste.

### Backend

- Parse params/query/body with the owned Zod schema before service work.
- Apply tenant + permission + record/DataScope in the data-layer predicate.
- Lists are bounded, projected, deterministically sorted, and cursor-safe.
- Mutations reauthorize transactionally and define idempotency/audit/events.
- Errors use stable safe codes; unauthorized sensitive existence is not leaked.
- Cache invalidation names every affected reader and includes scope dimensions.
- Database invariants stay in schema/migrations; business policy remains in the
  domain owner. No controller/service reaches another domain's private tables.

### Sensitive HR/payroll data

Never log, fixture-snapshot, or return unnecessary compensation, bank/tax,
identity, health/accommodation, case, or document data. Tests use synthetic
values. Exports/downloads require access, audit, expiry, and retention rules.

## Evidence Tiers

| Tier | Proves | Does not prove |
|---|---|---|
| Source | wiring, ownership, static route/schema facts | runtime behavior |
| Unit/component | bounded logic and rendered states | real DB/browser behavior |
| Contract/controller | parsed API and response/error behavior | query plan or deployed integration |
| Database | constraints, RLS/isolation, query plan, transaction/migration | browser UX |
| Browser | history, focus, keyboard, responsive, visible workflow | provider/deployment health |
| Provider/deployed | real integration, monitoring, rollback, soak | unrelated journeys |
| Human sign-off | product/legal/security/accessibility judgment | missing technical evidence |

Evidence is cumulative. A criterion closes only at its declared highest tier.

## Stop and Escalate

Stop the conflicting part and report exact evidence when:

- an unlisted file is required;
- a shared manifest/catalog/key/token/barrel/journal must change;
- source contradicts the frozen decision or copied contract;
- another active agent changed a reserved file;
- a migration/provider/real DB/browser is required;
- test failure is outside the packet; or
- two coherent repair attempts fail.

The escalation names the source location, expected contract, actual behavior,
smallest proposed change, affected packet(s), and whether independent work can
continue. “Need more scope” is not sufficient.

## Handoff Template

```md
Packet: <ID>
Outcome: CODE_COMPLETE | BLOCKED | NO_CHANGE
Changed: <exact files and purpose>
Deleted: <exact files and zero-caller proof, or none>
Acceptance advanced: <IDs; do not claim closed without all tiers>
Source anchors: <file:symbol/line>
Reproduction: <command, exit, failing assertion before>
Verification: <command, exit, test/assertion count after>
Evidence tier: source | unit | contract
Unrun evidence: <DB/PW/provider/deploy/human packets and reason>
Shared-change requests: <exact proposed seam change or none>
Contract deviations: <none or exact conflict>
Residual risks: <specific>
```

The coordinator independently reads the diff and reruns a proportionate check;
an agent narrative alone never changes ledger status.

## Coordinator Review Checklist

- [ ] exact reserved files only; no lost concurrent changes;
- [ ] one outcome and no duplicate owner/schema/component/API;
- [ ] applicable negative cases and sensitive projections covered;
- [ ] commands and outputs match the files/assertions claimed;
- [ ] shared requests brokered before dependent leaves integrate;
- [ ] current frontend/backend revisions recorded;
- [ ] heavy checks queued once for the integrated batch;
- [ ] external evidence packet created where required; and
- [ ] only the coordinator updates ledger/acceptance roll-ups and commits.
