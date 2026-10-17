# Architecture PRD: Build, Chat and Companion reconciliation

**Inputs:** September 26 Build (`213335`, `230544`), September 30 Chat (`231834`), October 2 Build (`184500`) and October 8 Companion (`225504`) reports. **Status:** candidate deltas. Existing Build `ARC-01–16` and `ARCH-*` packages and Companion ADR 0007 are authoritative; this file records report-to-package traceability and gaps needing current verification.

## Build: reported defects and query seams

| ID | Report point | To-do / disposition |
| --- | --- | --- |
| BC-01 | Early Build 1; later 3 | Audit every Ticket writer for mandatory expected version and one increment. Attach to `ARCH-03B-TICKET-COMMAND`; stale version must conflict and leave no effects. |
| BC-02 | Early Build 2; later 8 | Compare roadmap cursor tuple with its sort and revive or replace the dead keyset path. Test ties, insertions, deletions, forward/backward pages. `ARCH-07-COLLECTION-QUERIES`. |
| BC-03 | Early Build 3 | Verify filtered board-count keys include the exact filter and actor scope; invalidate after every relevant mutation. |
| BC-04 | Early Build 4 | Existing `ARCH-06-WIRE-CONTRACTS`; confirm enum generation and backend/frontend parity on the current revision. |
| BC-05 | Early Build 5 | Compare activity action domain with wire and display handling; unknown future actions must have a safe display fallback without silently accepting invalid writes. |
| BC-06 | Early Build 6 | Source assignee options from reachable members with bounded search, not a page of projects; test revoked and cross-project members. |
| BC-07 | Early Build 7 | Measure Ticket predicate query plans and index use on representative tenant size; change SQL only for a confirmed plan or cost issue. |
| BC-08 | Early Build 8; later 2 | Consolidate project reachability behind the accepted scoped-read interface and measure the reported waterfall. Test cross-tenant, client grant and revoked project membership. |
| BC-09 | Early Build 9, 11, 12 | Conditional cleanup: keep only a caller-backed seam. Remove pass-through modules, dead candidates and wide barrels after import graph, build and compatibility proof. |
| BC-10 | Early Build 10 | Measure report query freshness and mutation invalidation by query key; avoid broad invalidation while preserving newly changed records. |
| BC-11 | Later Build 1 | Check the three reported tables for effective RLS under the application role. A grant without a policy must fail the release gate; test direct SQL across tenants. |
| BC-12 | Later Build 4 | Make event versions one monotonic domain across all producers, or version the envelope explicitly. Test ordering, replay and duplicate delivery. `ARCH-15-EFFECT-RUNTIME`. |
| BC-13 | Later Build 5 | Trace hide-completed from saved view through wire to custom statuses. Verify server filter and count agree. |
| BC-14 | Later Build 6 | Reproduce swallowed transaction error; return failure when the write rolled back and emit neither success receipt nor side effect. |
| BC-15 | Later Build 7 | Existing `ARCH-03B-TICKET-COMMAND`; compare activity, audit, notifications, invalidation and outbox effects across UI, bulk, import, AI and automation. |
| BC-16 | Later Build 9–10 | Existing `ARCH-07-COLLECTION-QUERIES` and `ARCH-09-FRONTEND-WORKFLOWS`; test 100-row search limits, shared list states and browser behavior before factoring UI. |
| BC-17 | Later Build 11–12 | Repair any security gate that reports coverage for an unused method; put stable database invariants in migrations only after data audit and rollback plan. |

The October 2 report's sixteen recommendations are already mapped one for one to `docs/build-module/architecture/08-deep-module-reconciliation.md` and `docs/build-module/implementation/18-architecture-work-package-registry.md`. Do not create sixteen duplicate checkboxes here. Implementation uses those packages, with the specific regressions above as acceptance cases.

## Chat: interface work

| ID | Report point | To-do |
| --- | --- | --- |
| CH-01 | 1 | Select one Chat Alert owner; trace create/read/dismiss and notification delivery through it. Verify duplicate and revoke behavior. |
| CH-02 | 2 | Route tests through the production module interface, including provider/realtime adapters; delete pass-through mocks that certify unreachable code. |
| CH-03 | 3 | Split message-panel logic by actual workflow seam only where it reduces caller knowledge; preserve composer, history, scroll, search and realtime behavior. |
| CH-04 | 4 | Centralize channel membership decision for message read/send, channel list, search and realtime subscription; verify direct, private, public and revoked membership. |
| CH-05 | 5 | Map Chat mutation effects to precise query keys; prove read/edit/delete/reaction updates converge across open panels. |
| CH-06 | 6 | Put reconnect, ordering, duplicate event and missed-message recovery behind one realtime interface. Test offline and tab-resume paths. |
| CH-07 | 7 | Conditional cleanup after import and test-surface census; deletion is not a standalone user value. |
| CH-08 | 8 | Add missing backend interface facts identified by the report only after checking the current DTO and generated contract. Preserve versioned compatibility. |

## Companion: accepted owner decision and verification

ADR 0007 selects the Ask OS Toolset. The pet owns the friendly presentation and prompt policy; Ask OS owns actor, Toolset, conversation, proposals and confirmation. Documents owns retrieval/citation; Build owns exact BUG count; Calendar/Notifications own reminder identity. No pet-only action engine or second ledger is authorized.

| ID | Report point | Current disposition and to-do |
| --- | --- | --- |
| CP-AR-01 | Documents grounded answers | Source path now exists as `searchDocumentContext`; [ ] prove provider turn, one credit/transcript, cited answer, citation replay and revoked access in a browser. Follow `docs/pet/capability-inventory.md`. |
| CP-AR-02 | Exact BUG count | Source path now exists as `countTickets`; [ ] prove scoped total, state groups, filter link, tenant/role isolation and browser answer against live Build data. |
| CP-AR-03 | Reminder identity | Trace reminder create, schedule, dedupe, cancel and notification receipt through Calendar/Notifications; verify pet wording against actual state. |
| CP-AR-04 | Lightweight idle shell | Measure idle JavaScript/animation and activated panel on desktop/mobile; verify reduced motion, hidden tab, keyboard and voice cleanup. |
| CP-AR-05 | Companion write exposure | Source review map and confirmable self/CRM actions exist; [ ] verify every exposed write has owner preview, explicit confirmation, fresh access check, idempotency and receipt. Keep unreviewed keys unavailable. |

## Closure

### Execution checklist

- [ ] BC-01 Ticket concurrency
- [ ] BC-02 roadmap pagination
- [ ] BC-03 board count keys
- [ ] BC-04 generated enum parity
- [ ] BC-05 activity action contract
- [ ] BC-06 assignee options
- [ ] BC-07 Ticket query plans
- [ ] BC-08 project reachability
- [ ] BC-10 report invalidation
- [ ] BC-11 Build RLS
- [ ] BC-12 event versions
- [ ] BC-13 custom-status filtering
- [ ] BC-14 transaction failure translation
- [ ] BC-15 command effects
- [ ] BC-16 collection search and UI
- [ ] BC-17 gate and schema invariants
- [ ] CH-01 Chat Alert owner
- [ ] CH-02 test surface
- [ ] CH-03 message-panel module
- [ ] CH-04 channel membership
- [ ] CH-05 invalidation
- [ ] CH-06 realtime recovery
- [ ] CH-08 backend interface facts
- [ ] CP-AR-01 citable context journey
- [ ] CP-AR-02 exact BUG count journey
- [ ] CP-AR-03 reminder identity
- [ ] CP-AR-04 idle shell performance
- [ ] CP-AR-05 write exposure

An HTML finding is not a current defect until reproduced. Record source revision, actual interface and caller, test path, database/role/browser evidence, migration and rollback where applicable. Separate source-present, tested, deployed and live-user evidence.
