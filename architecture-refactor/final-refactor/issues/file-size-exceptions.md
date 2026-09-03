# File Size Exceptions — §7 Registry (backend)

Backend files exceeding 500 lines that are **exempt** from the 500-line hard-review limit
per §7 of the shared CLAUDE.md.

`backend/src/scripts/check-file-sizes.mjs` (`pnpm -C streamlineos-backend check:file-sizes`)
reads the `## Exceptions` table below and **fails closed**. A row grants an exception only
when all of the following hold; any failure fails the gate rather than silently granting or
dropping an exemption:

- the row carries all nine columns, none of them blank;
- the path is a concrete file — wildcard and directory-wide entries are rejected by the parser;
- the file exists on disk;
- the recorded line count equals the measured one exactly;
- the file still exceeds 500 lines — **a file that falls to 500 or below automatically loses
  its exception** and the row must be deleted;
- the review date parses as an ISO calendar date.

A path mentioned only in the audit trail below is not an exception; only table rows are read.

The frontend has its own registry at `frontend/scripts/file-size-exceptions.md`, enforced by
the same rules.

---

## CLI scripts: structural scope decision

`src/scripts/**` are one-off CLI utilities, not production application modules. They are not
imported by any module, are never split into sub-services, and the "target 300 without
fragmenting" concern applies to application code rather than self-contained CLI tools. They
are still listed individually below — the scope decision is a reason, never a wildcard.

## Exceptions

| Path (relative to backend repo root) | Lines | Category | Owner | Public interface | Cohesion argument | Alternatives considered | Review date | Removal trigger |
|---|---|---|---|---|---|---|---|---|
| `src/scripts/relocate-org-data.ts` | 767 | CLI script | Platform / DB | `main()` entry point | Top-level conductor for a multi-step data-migration CLI; the phases share one `db` handle and a fixed execution order, and already delegate their table work to `relocation/catalog-tables.ts` and `relocation/copy-org.ts`. | Splitting per phase was tried in the S01 pass and rejected: the phases have no shared interface, so the split produced numbered fragments that had to change together. | 2026-12-01 | Drops to 500 lines or below, or the migration it performs is retired. |
| `src/scripts/seed-enterprise-workspace.ts` | 551 | CLI script | Platform / DB | `main()` entry point | Enterprise-workspace seed that must execute in a fixed order; each block is a distinct seeding phase sharing local bindings and a single `db` handle. | Extracting per-entity seeders was considered and rejected: every block reads ids produced by the block above it, so the extraction would pass a growing bag of ids between mutually dependent files. | 2026-12-01 | Drops to 500 lines or below, or the seed moves to a fixture-driven loader. |
| `src/modules/party/party-mirror-fields.ts` | 552 | Cohesive catalog | Party / HR | `PARTY_FIELD_MIRROR` (const array) | A single mapping array where every row is one field definition; there is no logic to separate, only data. | Splitting by subsystem was rejected: the consumers iterate the whole array, so per-subsystem files would need a barrel that reassembles them, which is a re-export shell. | 2027-03-01 | Drops to 500 lines or below, or the mirror is replaced by a schema-derived projection. |
| `src/modules/organization/core/membership-artifacts.ts` | 3216 | Cohesive catalog | Organization | `MEMBERSHIP_ARTIFACTS` (const array) plus four derived exports | One `as const` array in which each entry is one artifact definition; the tail (`MEMBERSHIP_ARTIFACT_IDS`, `MEMBERSHIP_ARTIFACT_TABLES`, two `artifactsRequiring*` filters) derives from it and is meaningless apart from it. | Splitting by letter range or artifact type was rejected as numbered fragmentation with no shared interface. Generating the catalog from the schema was considered but the artifact set is a policy decision, not a schema fact. | 2027-03-01 | Drops to 500 lines or below, or the catalog becomes table-driven. |
| `src/modules/ai/core/services/crm-scoring.service.ts` | 504 | Cohesive service | AI | `CrmScoringService` (5 public methods) | Five CRM AI scoring methods sharing private prompt-building helpers and a single `AiGatewayService` dependency; the overage is four lines. | A per-score split was rejected: each score would carry a copy of the shared prompt builders or import them from a sibling, and neither buys anything for a four-line overage. | 2026-11-01 | Drops to 500 lines or below, or a sixth scoring method is added — at which point the prompt builders move out first. |
| `src/modules/organization/core/invitation-acceptance.service.ts` | 509 | Cohesive service | Organization | `InvitationAcceptanceService` (accept, decline, supporting privates) | The whole invitation-acceptance lifecycle in one transaction: token validation, concurrent seat reservation, member row creation, magic-link issuance, cache bust and notification dispatch. The private helpers are only meaningful inside that flow and the invariants they enforce are co-located deliberately. | Extracting the helpers to a sibling was rejected: they mutate state the flow later re-reads, so the split would create two files that must change together while losing the invariant co-location. Nine-line overage. | 2026-11-01 | Drops to 500 lines or below, or seat reservation gains a second caller — at which point it moves out on its own. |
| `src/modules/chat/chat-channel-members-implementation.ts` | 522 | Cohesive implementation | Chat | `ChatChannelMembersImplementation` | Channel-membership implementation with shared authorization and membership invariants behind a 45-line Nest facade; every method re-asserts the same membership predicate. | A read/write split was considered and deferred: the write paths re-read through the same authorization predicate, so the split would need the predicate in a third file and gains nothing at a 22-line overage. | 2026-11-01 | Drops to 500 lines or below, or the authorization predicate is extracted for reuse elsewhere. |

---

## Audit trail

- **2026-08-31** — Initial enumeration (lane Q6). Frontend: zero files over 500 lines. Backend: 6 files over 500. `access.service.ts` (640 lines) split into `access-error-utils.ts`, `denied-modules.resolver.ts`, `access-policy.ts` and `access.types.ts`.
- **2026-08-31** — Final inventory (lane L34). Backend: 7 files over 500 — 5 registered, 2 new. CLI scope decision formalised. The PRD's "88 backend and 22 frontend files over 500 lines" is wrong by orders of magnitude.
- **2026-08-31** — Over-300 ratchet raised 392 → 394 with cause (`chat-message-timeline.service.ts` 239 → 322, `hr-import.service.ts` 300 → 304, `build-openapi-document.ts` 296 → 302), all correctness work rather than growth.
- **2026-09-02 (ticket 37)** — The registry was made to fail closed, and re-measuring every row against disk found **seven of twelve entries stale**. The old gate only checked that a path appeared in a table row with at least seven cells, so none of this was visible:
  - **Five files had fallen to 500 lines or below and kept an exception they no longer needed** — `src/modules/access/access.service.ts` (registered 510, measured 486), `src/modules/gdpr/gdpr-export-worker-implementation.ts` (966 → 405), `src/modules/hr/analytics-plus/hr-analytics-plus.service.ts` (502 → 494), `src/modules/hr/lifecycle/onboarding-views.service.ts` (521 → 496) and `src/modules/notifications/notification-routing.service.ts` (671 → 472). All five rows were removed; the gate now removes the exemption automatically by failing on the next stale row.
  - **Two files had grown past their recorded figure** — `membership-artifacts.ts` (registered 2496, measured 3216: the catalog grew by 720 lines under an exception nobody re-measured) and `chat-channel-members-implementation.ts` (506 → 522). Both re-measured and re-justified.
  - Four unregistered files over the limit were **split by cohesive responsibility rather than registered**: `gdpr-subject-erasure.service.ts` 653 → 244, `ai-gateway-runner.helper.ts` 527 → 211, `storage.service.ts` 509 → 389 and `cron-hr-retention.service.ts` 504 → 317. See `reports/37-file-cohesion.md` for the extraction seams and the before/after spec runs.
  - Every surviving row was rewritten to the nine-column record §7 asks for: exact path, measured lines, category, owner, public interface, a concrete cohesion argument, alternatives considered, review date and removal trigger.

---

## The over-300 ratchet (backend) — 2026-09-03

`src/scripts/check-over-300.mjs` is a **separate** gate from the 500-line registry above and reads
**nothing** from this document. Its `## Exceptions` table cannot hold an over-300 file: the table
fails closed on any registered path measuring 500 lines or fewer ("exception no longer needed"), so
a 301-line file added there would red `check:file-sizes`. Everything in this section is therefore
prose on purpose, and the parser ignores it — `check-file-sizes.mjs`'s own self-test asserts that a
path mentioned only in prose grants nothing.

### What was actually wrong, measured rather than assumed

The gate was red at head: **406 files over 300 against a baseline of 394 (rc=1)**. It had been
characterised elsewhere as "the one unjustified historical raise". Measured against the history,
that characterisation is **wrong in both halves**, and the truth is worse in one way and better in
another:

- There is exactly **one** raise in the gate's history, `c3f0b73d` (392 → 394), and it **is**
  justified: the commit message names the three crossings with before/after line counts, and the
  audit trail above records them. It is not an unjustified raise.
- It **undershot**. Measured hermetically with `git archive c3f0b73d src` into a scratch tree and
  running that commit's own gate against it: **395 files over 300, baseline 394, rc=1**. The commit
  that "fixed" the gate shipped it red by one. The gate was last genuinely green at `f613bb3d`,
  where it was created at 392 against a measured 392 (rc=0).
- So the 12-file gap decomposes as **1 undershoot + 11 net new crossings**, not "12 unjustified
  baseline points". The churn underneath is much larger than the net: **42 files crossed 300 and 31
  fell back below it** between `c3f0b73d` and head. There is no identifiable set of "the twelve
  files" to fix — any twelve-plus reductions are equally valid.

### How it was made green — downward only

The baseline moved **394 → 392**, and the count moved **406 → 392** to meet it. Fourteen files were
split along a responsibility seam. Every extraction is a move of exported plain functions (or, for
the fence store, a second implementation class), so no Nest provider, module registration, DI
constructor or public method signature changed; `check:module-di` stays clean and no importer of
any of the fourteen services needed an edit.

- `src/common/idempotency/command-fence-store.ts` 304 → 212 — the in-memory store implementation left for `command-fence-store-memory.ts`; the file held two independent implementations of one interface.
- `src/modules/gdpr/gdpr.service.ts` 301 → 160 — six inline per-source queries sharing one cap/truncation protocol left for `gdpr-sync-export-fetchers.ts`, matching the pattern the module already uses for its async export (`gdpr-export-fetchers-*.ts`). This is the 301-line service the review flagged, and it was the right call: it was orchestration, authorization and table-shape knowledge in one file.
- `src/modules/activities/activities.service.ts` 302 → 249 — keyset timeline read to `activities-timeline.ts`, away from the write lifecycle.
- `src/modules/hr/lifecycle/hr-dashboard-reports.service.ts` 303 → 140 — attendance analytics to `hr-dashboard-attendance.ts`; headcount, time-to-fill and attendance were three unrelated reports in one service.
- `src/modules/hr/workflows/hr-workflow-engine.service.ts` 305 → 239 — the scheduled overdue sweep to `hr-workflow-overdue-sweep.ts`, away from the request-path start/act lifecycle.
- `src/modules/hr/time/work-logs.service.ts` 311 → 246 — CSV serialisation to `work-logs-export.ts`.
- `src/modules/email/email-outbox.service.ts` 307 → 214 — the retry/dead-letter drain to `email-outbox-retry.ts`, away from request-path enqueue.
- `src/modules/module-access/user-permission-grants.service.ts` 302 → 246 — membership resolution to `user-permission-grants.helpers.ts`, beside the existing `module-access.helpers.ts`.
- `src/modules/ai/core/services/chat-history.service.ts` 304 → 242 — conversation-scoped message paging to `chat-conversation-messages.ts`; the file carried two persistence grains.
- `src/modules/inventory/quality/quality-inspections.service.ts` 309 → 207 — stock disposition to `quality-disposition.ts`, away from inspection state.
- `src/modules/inventory/purchase-orders/po.service.ts` 305 → 233 — the PO state machine to `po-lifecycle.ts`, away from CRUD.
- `src/modules/billing/core/billing-payment-activation.ts` 309 → 209 — the three post-activation bookkeeping recorders to `billing-activation-recorders.ts`.
- `src/modules/hr/governance/labor/labor.service.ts` 308 → 248 — labor cases to `labor-cases.ts`; one service owned three entities, against §7's "name the entity service for the entity".
- `src/modules/timesheets/core/timer.service.ts` 317 → 258 — pause/resume/stop/discard to `timer-transitions.ts`, away from the read path.

Proof: `node src/scripts/check-over-300.mjs --self-test` rc=0 (15 passed);
`node src/scripts/check-over-300.mjs` rc=0, **392 of 3606**, baseline 392.
`pnpm check:spec-typecheck` rc=0 · `pnpm typecheck` rc=0 · `pnpm check:cycles` rc=0 (5,647 files,
no cycle) · `pnpm check:module-di` rc=0 · `pnpm check:kebab-case` rc=0 ·
`pnpm check:import-direction` rc=0 · `pnpm check:db-call-count` rc=0.

### Files over 300 that were deliberately NOT split, and why

§7 allows a cohesive catalogue to stay whole rather than fragment. These four are the strongest
cases in the current over-300 set, and each has **already been split by domain** — splitting further
would produce numbered fragments behind a re-export shell, which §7 calls out as worse than one
honest file. They stay counted in the 392; recording them here is a decision, not an exemption, and
the gate has no exemption mechanism to abuse.

- `src/modules/notifications/notification-events.catalog.ts` (301) — one flat `NotificationEventDefinition[]` plus the derived `NOTIFICATION_EVENT_MAP`, `EVENT_KEY_SET` and `isNotificationEventKey`, which are meaningless apart from it. Seven per-domain catalogues (chat, build, accounting, hr, ownership, knowledge, security-support) have **already** been extracted into siblings; what remains is CRM plus the derivation tail. The next split would be by letter range.
- `src/common/cache/cache-invalidation-matrix.ts` (301) — the same shape: four per-domain entry arrays (finance, inventory, rbac-auth, crm) are already siblings, and the file is the remaining namespace rows plus the concatenation. Consumers iterate the whole array.
- `src/modules/rbac/role-templates-crm-hr.constants.ts` (312) — a permission catalogue, which §7 names explicitly as allowed to exceed even 500 rather than split artificially.
- `src/modules/crm/import/import-entities.ts` (302) — an entity/field mapping table behind eight one-line accessors, already re-exporting `./import-fields`; there is no logic to separate, only data.

### Left open

- The **frontend** twin is also red and was not in this pass's scope: `pnpm -C frontend check:over-300` reports **520 against a baseline of 519, rc=1** — one file above. Same ticket-41 blocking shape, different territory.
- `pnpm check:file-sizes` is red at head on two files neither split nor owned here — `src/modules/support/core/support-tickets.service.ts` (520) and `src/scripts/check-declaration-column-drift.ts` (534). Both measured identically at the commit before this pass, so they are pre-existing: either register them with the nine-column record or bring them under 500.
