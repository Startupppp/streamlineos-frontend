# HRMS core Phase 1 expand-contract migration plan

Date: 2026-08-10
Status: **approved and authored as a review-only SQL-managed bundle; not rehearsed, journaled into the root Drizzle chain, or applied**
Applies to: live-tenant HRMS core only

## Non-negotiable safety rules

1. Expand before backfill; backfill before validation; validate before read cutover; contract only under a later approval.
2. Never mutate the production primary for load testing. Rehearse on a point-in-time branch or anonymized production-size fixture.
3. Each database migration is short, restartable, and paired with an explicit compensating migration. Data rollback is feature-flag/read-path rollback; migrated facts are not destructively deleted.
4. This SQL-managed bundle remains outside the drifted root Drizzle journal. Promotion requires the approved hash-bound bundle runner, an exact dependency on root migration `0398`, its own applied-operation ledger, and a separately approved production manifest; never copy the pending journal or placeholder snapshots into the root chain.
5. Never use unbounded `SET statement_timeout=0`. Use short lock timeout, bounded statement timeout, keyset batches, and operator checkpoints.
6. No plaintext PII in SQL output, logs, checkpoints, audit diffs, or reconciliation files.
7. No Payroll calculation, finalized run, payslip amount, statutory figure, or historical subject row is recalculated.
8. No batch below is authorized until the eight decisions in this document are explicitly approved; Batch D also requires the named managed-KMS operating design.

## Approval contract

Canonical approval contract: `HRMS-P1-APPROVAL-2026-08-11-v1`. The eight normative lines below are reproduced verbatim in the schema proposal, live discrepancy report, and `REFACTOR-STATE.md`. Approval must record the contract ID and every decision ID; an omitted item is not approval.

1. **Canonical workforce and legacy compatibility:** approve `organization_people → workers → worker_engagements` as the tenant workforce authority; keep `users` for global authentication and `organization_members` for tenant access/RBAC; retain `hr_people`, `hr_employments`, and finalized HR/Payroll/Recruitment legacy mappings only as one-way tenant-scoped compatibility until Payroll and Recruitment migrate and independent zero-reference proof passes.
2. **Effective workforce history:** approve effective-dated assignment/reporting periods and append-only engagement-state events, including interval-wide cycle prevention and deterministic legacy snapshots; retained current fields are compatibility projections.
3. **Leave ledger and legacy opening balances:** approve the immutable leave ledger as authority and preserve the five live balances as deterministic `UNVERIFIED_LEGACY` opening entries reconciling exactly to 94.20 days; do not recalculate or discard them.
4. **Attendance event model and evidence retention:** approve append-only attendance events and the privacy-first evidence policy: raw location off by default; opt-in encrypted coordinates rounded to at most four decimals for 30 days; longer retention only under a named two-person audited legal hold reviewed at least every 90 days; no bulk export by default.
5. **Hierarchy adjacency plus closure:** approve adjacency as direct-parent truth plus a rebuildable tenant-scoped closure projection for descendant scope.
6. **Private-data separation and managed-KMS envelope encryption:** approve the public/private/sensitive split and managed-KMS envelope encryption; Batch D remains blocked until a separate ADR names and rehearses provider, custody/IAM, tenant/key hierarchy, associated data, rotation/rewrap, recovery/restore, break-glass, deletion, and fail-closed outage behavior; no environment-key/application-keyring fallback is approved.
7. **Zero-error manual reconciliation governance:** approve zero unresolved classifications, mismatches, or PII-attribution items before cutover; no email auto-merge or error threshold; every manual classification or field-precedence decision requires two distinct `AccessService`-authorized reviewers—one organization data owner and one independent HR/security reviewer—using masked, audited PII review and a signed ID-only manifest.
8. **Migration profile plus mandatory API/security/cache/UI pre-canary gates:** approve the organization-sticky expand-contract state machine and require tenant integrity/RLS, object-level `AccessService`/DataScope, safe DTO and sensitive-access audit, tenant/actor/access/scope/profile/wire cache isolation and clearing, exact route/sidebar/action/hook permission, and responsive/accessibility gates before any canonical canary.

## Release and tenant profile

Create one server-owned `hrms_migration_profiles` row per organization:

```text
organization_id PK FK organizations(id) ON DELETE RESTRICT
workforce_read_mode NOT NULL: LEGACY | SHADOW | CANONICAL
workforce_write_mode NOT NULL: LEGACY | DUAL | CANONICAL_WITH_PROJECTION
history_mode NOT NULL: LEGACY | DUAL | EFFECTIVE
hierarchy_read_mode NOT NULL: ADJACENCY | SHADOW_CLOSURE | CLOSURE
hierarchy_write_mode NOT NULL: LEGACY_ADAPTER | LOCKED_COMMAND
attendance_read_mode NOT NULL: LEGACY | SHADOW | EVENT
attendance_write_mode NOT NULL: LEGACY | DUAL | EVENT_WITH_PROJECTION
leave_read_mode NOT NULL: LEGACY | SHADOW | LEDGER
leave_write_mode NOT NULL: LEGACY | DUAL | LEDGER_WITH_PROJECTION
sensitive_read_mode NOT NULL: LEGACY_ADAPTER | SHADOW_ENCRYPTED | ENCRYPTED
sensitive_write_mode NOT NULL: LEGACY | DUAL_ENCRYPTED | ENCRYPTED
minimum_sensitive_adapter_version integer NOT NULL DEFAULT 1 CHECK (minimum_sensitive_adapter_version > 0), non-decreasing
sensitive_plaintext_writes_retired_at timestamptz nullable, immutable once set
profile_revision bigint NOT NULL DEFAULT 1 CHECK (profile_revision > 0)
changed_at, changed_by_platform_user_id, change_ticket, change_reason, rollback_deadline
```

Every new row defaults to legacy reads/writes and adjacency. Internal data modes are never client-selectable. `profile_revision` is a monotonic data-source change token and is never used as an API version. Wire V1/V2 is selected only by the explicit route/client contract; it is not persisted in or switched by the organization migration profile.

Only an MFA-satisfied actor with the exact platform-migration capability resolved by `AccessService` may propose a change. A different actor with the corresponding approval capability must approve the immutable manifest; no role-name, stale-token, or client-supplied check substitutes for `AccessService`. The update uses `WHERE profile_revision = :expected`, increments the revision, and appends a redacted `hrms_migration_profile_events(organization_id,profile_revision,before_modes,after_modes,manifest_hash,proposed_by,approved_by,occurred_at)` row in the same transaction. Ordinary tenant administrators and request headers cannot change or override a profile. `rollback_deadline` is informational until an operator acts; expiry never flips a mode automatically and requires a new two-person manifest.

`hrms_scope_versions(organization_id PK,scope_revision bigint NOT NULL DEFAULT 1)` is separate from profile revision and existing RBAC access revision. Canonical assignment/reporting/membership/lifecycle commands increment it transactionally whenever DataScope can change.

Allowed transitions are per domain and cannot skip a state:

| Domain | Forward | Rollback requirement |
|---|---|---|
| Workforce | `LEGACY/LEGACY -> LEGACY/DUAL -> SHADOW/DUAL -> CANONICAL/CANONICAL_WITH_PROJECTION` | Projection parity must be current before returning reads to `LEGACY`; never pair canonical reads with legacy-only writes. |
| History | `LEGACY -> DUAL -> EFFECTIVE` | Return reads to maintained current projections; retain periods/events. |
| Hierarchy | `ADJACENCY/LEGACY_ADAPTER -> SHADOW_CLOSURE/LOCKED_COMMAND -> CLOSURE/LOCKED_COMMAND` | Legacy adapter must still delegate to the locked command before an adjacency rollback. |
| Attendance | `LEGACY/LEGACY -> LEGACY/DUAL -> SHADOW/DUAL -> EVENT/EVENT_WITH_PROJECTION` | Compatibility sessions must be current; retain events/evidence. |
| Leave | `LEGACY/LEGACY -> LEGACY/DUAL -> SHADOW/DUAL -> LEDGER/LEDGER_WITH_PROJECTION` | Compatibility balances must be current; retain ledger facts. |
| Sensitive | Forward: `LEGACY_ADAPTER/LEGACY -> LEGACY_ADAPTER/DUAL_ENCRYPTED -> SHADOW_ENCRYPTED/DUAL_ENCRYPTED -> ENCRYPTED/ENCRYPTED` | The first move to `DUAL_ENCRYPTED` atomically sets the irreversible plaintext-write-retirement latch. Read rollback is `ENCRYPTED/ENCRYPTED -> SHADOW_ENCRYPTED/ENCRYPTED -> LEGACY_ADAPTER/ENCRYPTED`; before full encryption, `SHADOW_ENCRYPTED/DUAL_ENCRYPTED -> LEGACY_ADAPTER/DUAL_ENCRYPTED`. It never returns to `LEGACY` writes. |

Named database checks reject impossible read/write pairs; the platform transition command locks the row and rejects skipped transitions before the conditional update.

Except for Sensitive, rollback follows the same state machine in reverse, one adjacent state per separately approved and audited profile revision. A canonical domain first returns to its shadow read state while canonical/compatibility projections continue, parity is re-proved, and only then may it return to the legacy read state; write modes step back only after their required projection is current. A direct `CANONICAL -> LEGACY`, `EVENT -> LEGACY`, `LEDGER -> LEGACY`, or `CLOSURE -> ADJACENCY` transition is invalid. Sensitive follows its separate graph above; a named check and transition trigger reject `sensitive_write_mode = LEGACY` after `sensitive_plaintext_writes_retired_at` is set, forbid clearing that latch, and reject any decrease of `minimum_sensitive_adapter_version`.

The authenticated bootstrap endpoint returns only the public contract, never internal modes:

```text
GET /v1/me/hrms-contract | GET /v2/me/hrms-contract -> {
  orgId, wireApiVersion, profileRevision,
  actorUserId, actorMembershipId, accessRevision, scopeRevision,
  capabilityState: LOADED,
  capabilities: Record<CapabilityKey,{ allowed, scope: ALL | TEAM | OWN | NONE }>,
  changedAt
}
```

The requested bootstrap route fixes `wireApiVersion` (`/v1` legacy adapter or `/v2` canonical DTO) and the response echoes that fixed value. At authentication/refresh, the edge validates a CI-signed release attestation containing `clientBuildId` and `hrmsClientContract`, binds both to the server-side session, and discards any browser-supplied internal build header; controllers trust only these session fields. A checked-in release registry defines `minimumSafeV1ClientContract`. Missing, invalid, unknown, or below-minimum contracts receive HTTP 426/code `SAFE_CLIENT_UPGRADE_REQUIRED` before an HRMS response body. The build signal never grants authorization or sensitive fields. The bootstrap is actor-specific and always returns `Cache-Control: private, no-store`, varies on authenticated session/authorization, is dynamically rendered, and is excluded from RSC/TanStack dehydration, persistence, prefetch, and shared/server response caches. Every V2 HRMS mutation sends its observed `X-HRMS-Profile-Revision`. A mismatch fails before mutation with HTTP 409/code `PROFILE_REVISION_CONFLICT`; every response echoes `X-HRMS-Wire-Version` and `X-HRMS-Profile-Revision`. The client then cancels the request namespace, purges it, and refetches its versioned bootstrap, never retrying a different wire contract after a 401/403/409/422/428/5xx. Profile changes publish the new revision through the authenticated session/access refresh path; focus/reconnect also revalidates bootstrap before enabling HR queries.

## Planned migration batches

Names below are semantic placeholders; numeric prefixes are allocated at implementation.

### Batch A — catalog/source parity and preflight registry

Forward:

- synchronize Drizzle declarations for the live `org_id` columns, composite FKs, indexes, and RLS-visible fields on `roster_entries` and `onboarding_template_steps`;
- register live SQL-only constraints such as `excl_worker_engagements_overlap` and effective-date exclusions in schema-vs-live tests;
- create a migration-preflight view or read-only script that reports missing/duplicate constraints by OID/name/definition;
- keep every SQL-managed Phase 1 table behind the explicit `hrms-phase1-sql-managed.ts` barrel, outside the normal Drizzle generation barrel; execute the reviewed bundle only through its hash-allowlisted runner with root-0398 dependency, catalog fingerprints, and a separate applied-state ledger;
- do not recreate already-present production objects.

Rollback:

- revert source declarations/tests only if they are proven incompatible; do not drop correct live tenant constraints.

Gate:

- source declarations match `pg_catalog` on a clean rebuild and the live branch;
- the migration tool remains idempotent when the live object already exists.

### Batch B — migration profile, canonical links, and versions

Forward schema:

- add nullable `organization_person_id` to `hr_people`;
- add nullable `worker_id` and `worker_engagement_id` to `hr_employments`;
- create `hr_person_legacy_map`, `hr_employment_legacy_map`, and `hr_workforce_reconciliation_items`;
- make the employment map carry the mapped legacy person and canonical organization-person keys; composite FKs plus a deferred consistency trigger must prove `hr_employments.person_id -> hr_person_legacy_map -> workers.organization_person_id` for every mapped engagement;
- create/backfill exactly one legacy-default `hrms_migration_profiles` row per organization, append-only `hrms_migration_profile_events`, and `hrms_scope_versions`, with checks, least-privilege grants, platform-only revision guard, and audit coupling defined above;
- add `row_version` and nullable actor/archive columns to the retained mutable aggregate roots;
- reuse existing `command_fences` for bounded HTTP replay/request-hash protection; do not create `hr_command_receipts`;
- add tenant candidate keys and missing tenant columns as nullable where live tables truly lack them.

`command_fences` may expire and therefore cannot prove permanent domain idempotency. Each time-partitioned append-only domain creates its own hash-by-organization locator beside its fact table in Batches E/F, with permanent command/source uniqueness and no response body or PII. Every component of each command/source key is `NOT NULL`; imports allocate deterministic ordinals, so PostgreSQL uniqueness cannot be bypassed with `NULL`. Locator and fact insert in one transaction, so a retried source fails uniquely even after its command fence expires. Engagement state events are not time-partitioned and carry the same non-null permanent uniqueness directly.

Online mechanics:

- add metadata-safe constant defaults only where PostgreSQL can avoid a rewrite;
- otherwise add nullable, backfill, set default, add `CHECK (column IS NOT NULL) NOT VALID`, validate it separately, promote to `NOT NULL`, then remove the helper check; this avoids an avoidable second heap scan on supported PostgreSQL versions;
- use ordinary transactional indexes under bounded statement/lock timeouts for this first wave: audited HR tables are tiny and new target tables are empty. Current migration-integrity tests explicitly reject `CREATE INDEX CONCURRENTLY` inside any transaction-managed bundle;
- writer-readiness deploy precedes `NOT VALID` FKs.

Rollback:

- turn off dual/canonical modes;
- retain populated links/maps and existing command fences;
- drop only empty, unused additive objects after a dependency check;
- versions may remain harmless even if conditional writes are disabled.

### Batch C — effective workforce history

Forward schema:

- create `worker_assignment_periods` with composite tenant FKs and exclusion constraint;
- create `worker_reporting_lines` with composite tenant FKs, self-manager check, and exclusion constraint per line type;
- create append-only `worker_engagement_state_events`;
- require non-null command scope, command ID, and effect ordinal on every state event; deterministic legacy snapshots use their migration batch/source as the command identity;
- add nullable compatibility projection linkage/current-event columns to `worker_engagements`.

Exclusion constraints cannot be concurrent or `NOT VALID`. Create them on the new empty tables before backfill, then insert only prevalidated batches. Preserve the existing `[from,to)` convention.

Rollback:

- switch reads to retained `worker_engagements`/legacy HR data;
- stop new canonical writes only after replaying canonical-only commands into compatibility projections;
- keep historical periods/events; never delete them as rollback.

### Batch D — private and sensitive storage

Forward schema:

- create private profile, address, emergency contact, bank account, identifier, medical, case-record, document/version, tag, and link tables;
- add tenant-composite FKs, restrictive deletion behavior, row versions on mutable metadata, and direct RLS policies;
- add ciphertext/key-version/data-version/masked/HMAC columns for managed-KMS envelope encryption only;
- add retention expiry and legal-hold fields;
- create and own the partitioned append-only `hr_sensitive_access_events`, its future-partition procedure/template, mutation guards, and least-privilege grants. Batch G must not recreate it.

Precreate the current and next three monthly sensitive-access partitions before any sensitive route is enabled. A least-privilege scheduled owner builds from the allowlisted template and verifies bounds, RLS, grants, and mutation guards; alert below two future partitions. There is no default partition. If audit coverage is unavailable, the reveal/export/sensitive mutation fails closed with `HRMS_AUDIT_PARTITION_NOT_READY` in the same transaction.

Batch D remains blocked after architectural approval until an operational ADR names the KMS provider, key/tenant derivation and custody, rotation/rewrap procedure, recovery escrow/drill, access policy, deletion schedule, metrics, and fail-closed outage behavior. Writer deployment must encrypt new values before backfill, and associated-data behavior plus recovery must pass rehearsal. Every sensitive transition is a profile-revisioned two-person event. Deployment and rollback admission query active profiles and reject a build whose sensitive-adapter contract is below `minimum_sensitive_adapter_version`; runtime also fails closed rather than serving a tenant with an unsupported adapter.

Rollback:

- legacy wire routes call an authorized canonical decrypting/masking adapter; they do not read or refresh global plaintext compatibility columns;
- pre-existing plaintext is read-only and separately permissioned/audited; ambiguous tenant attribution blocks Batch D for every potentially affected tenant, and canonical routes never use an unresolved value;
- never decrypt/copy canonical sensitive data back into global plaintext as a compensating migration;
- retain encrypted rows and access audit, and forbid deployment rollback to any binary that lacks the canonical decrypting adapter. Sensitive rollback changes the wire/read adapter, not the encrypted storage authority.

### Batch E — leave ledger authority

Forward schema:

- create partitioned `worker_leave_ledger_entries`, hash-partitioned `worker_leave_entry_locators`, hash-partitioned `worker_leave_reversal_links`, and `worker_leave_balance_projections` exactly as defined in the schema proposal;
- partition facts by `effective_date`; each row has composite key `(organization_id,effective_date,entry_id)` and a transactionally inserted locator with permanent command/source uniqueness;
- locator and fact use reciprocal deferred FKs; every locator command/source key part and both reversal endpoints are `NOT NULL`;
- deferred checks make `entry_type = REVERSAL` equivalent to exactly one reversal link, forbid self-links and reversal-of-reversal chains/cycles, and require the same worker/type/period with an exact negated delta;
- add constrained provenance (`VERIFIED_SOURCE | UNVERIFIED_LEGACY`), source, worker/engagement, exact numeric delta, and actor constraints;
- add composite FKs and tenant/date indexes;
- add nullable canonical worker/engagement links to legacy requests where needed.

Before backfill, a bounded read-only preflight records source min/max effective dates and the exact distinct source months, applies the approved date registry, and creates/verifies every required historical fact partition; out-of-policy ranges or excessive partition counts require a new operator approval. Also create the current and next three monthly partitions before enabling writers. A least-privilege scheduled partition operator creates the next partition from an allowlisted recipe, then verifies bounds, RLS, composite FKs, semantic and mutation triggers, and effective grants before use. Alert when fewer than two future partitions remain. There is no default partition: an uncovered date fails closed with stable code `HRMS_PARTITION_NOT_READY` instead of silently bypassing controls. Fixed hash partitions are created with their parent in the reviewed SQL bundle; range leaves come only from the signed explicit-month manifest.

Backfill:

- map each legacy subject to exactly one canonical worker;
- after explicit approval, create deterministic `LEGACY_OPENING_BALANCE` entries for the five live rows;
- mark provenance `UNVERIFIED_LEGACY`, source row ID, migration batch, and effective date;
- rebuild projections and require exact per-row and total reconciliation to 94.20 days;
- append historical request-derived entries only where status, amount, and ordering are deterministic; any ambiguity blocks that tenant rather than becoming an accepted error.

Rollback:

- switch reads to maintained legacy balances;
- retain immutable ledger facts;
- never issue reversal events merely because the read feature flag rolled back.

### Batch F — attendance events

Forward schema:

- create monthly partitions for `attendance_events`/`attendance_event_evidence`, hash-partitioned `attendance_event_locators`/`attendance_correction_links`, and normalized `attendance_evidence_legal_holds` exactly as defined in the schema proposal;
- each event uses composite key `(organization_id,business_date,event_id)` plus a transactionally inserted locator whose command/source key parts are all `NOT NULL`; reciprocal deferred FKs prevent locator/fact orphans, while evidence stores the event ID/date and references the immutable fact;
- corrections append a new event with an all-or-none `corrects_event_id/corrects_business_date`; the hash link enforces at most one direct correction per original and deferred checks require exactly one target for `CORRECTION`, none otherwise, the same tenant/worker/engagement, and a non-correction original, thereby forbidding self-links and correction chains/cycles. Originals are byte-immutable. Evidence is unique per event, may expire independently, and cannot outlive or re-parent its event;
- create session and daily projections;
- create partial unique open-session invariant;
- add canonical worker/engagement links to compatibility attendance rows;
- add retention indexes/jobs metadata for evidence.

After timezone-registry resolution and before backfill, a bounded read-only preflight records source min/max business timestamps/dates and exact derived months, then creates/verifies every required historical event/evidence partition; ambiguity, out-of-policy range, or excessive partition count blocks for operator approval. Also create current plus the next three monthly partitions before enabling writers. The same least-privilege scheduled operator/template contract verifies bounds, RLS, FKs, evidence-retention rules, append-only guards, and grants before use; alert below two future partitions. Do not create a default partition. Missing coverage fails closed as `HRMS_PARTITION_NOT_READY`; fixed hash locator partitions are created with the parent.

Decision 4 adopts this privacy-first evidence policy: raw geolocation collection is off by default; when an explicitly enabled tenant policy has a documented attendance purpose and employee notice, the durable attendance fact stores only geofence ID, pass/fail, fixed accuracy bucket, and fixed distance bucket. Optional dispute evidence may retain encrypted coordinates rounded to at most four decimal places plus device/source metadata for 30 days; tenants may shorten but not lengthen that default. A normalized legal-hold aggregate can pause purge for a named case only through two distinct `AccessService`-authorized approvers, a reason, expiry/review date, optimistic row version, and immutable audit, and must be reviewed at least every 90 days. Raw evidence and legal holds receive no broad application grants in the base wave; exact KMS/reveal/retention/hold functions activate only after the separate ADR. Raw evidence has no bulk export by default, and every view/reveal is purpose-bound and audited. A daily purge deletes expired evidence plus expired hold control only and alerts on backlog; statutory attendance facts/totals and audit history follow their separate retention schedule.

Backfill:

- derive events from each legacy session and each JSON break in deterministic order;
- derive business date using the approved per-column/timezone registry;
- ambiguous timezone or impossible event sequences enter reconciliation, not default UTC;
- compare rebuilt first/last punch, worked minutes, break totals, and open/closed state to legacy rows.

Rollback:

- return reads to the still-dual-written legacy projection;
- retain events and evidence; do not mutate the audit trail.

### Batch G — hierarchy closure and audit

Forward schema:

- create `org_unit_closure` and its ancestor index;
- backfill reflexive and ancestor/descendant rows in tenant-scoped batches;
- introduce the locked move command; all active legacy `/hr/org` team/location writes must delegate to it, legacy hard-delete becomes canonical archive, and shadow compare recursive CTE vs closure;
- create hash-partitioned `hr_audit_event_sources` plus monthly `hr_audit_events` partitions, reciprocal deferred FKs, restrictive grants, future-partition recipes, and mutation-rejection triggers; Batch D exclusively owns `hr_sensitive_access_events`;
- copy legacy audit rows using deterministic legacy keys and redacted diffs.

Before copying legacy audits, a bounded read-only preflight records source min/max timestamps and exact source months and creates/verifies every required historical HR-audit partition; out-of-policy ranges or excessive partition counts require operator approval. Also precreate current plus the next three monthly partitions. The scheduled owner/template verifies bounds, RLS, grants, and mutation guards before use and alerts below two future partitions; no default partition exists. A command whose transactionally required audit partition is missing fails closed as `HRMS_AUDIT_PARTITION_NOT_READY`.

Rollback:

- switch hierarchy reads to adjacency and rebuild closure later;
- audit has no destructive data rollback.

### Batch H — constraints and canonical read cutover

Forward:

- add existing-table composite FKs/checks as `NOT VALID` after compatible writers are live;
- validate each constraint separately under monitored load;
- attach unique constraints to ordinary prevalidated indexes in this first wave; any future concurrent build follows the separately approved online-DDL path below;
- switch cohorts through `SHADOW` to `CANONICAL` only after parity gates pass;
- stop email-based runtime linking;
- make legacy HR write routes call canonical Workforce commands;
- make Recruitment offer/hire handoff call the same Workforce command before any affected tenant leaves legacy mode;
- prohibit every canonical/compatibility writer from projecting tenant employment, placement, lifecycle, compensation, tax, bank, or private fields into global `users`; V1 reads use tenant-scoped adapters instead;
- keep compatibility projections for at least two releases and through Payroll/Recruitment migration.

Rollback:

- move each non-sensitive domain through the allowed adjacent states in reverse under separate two-person profile events: canonical to shadow first, re-prove compatibility parity, then shadow to legacy; Sensitive uses its irreversible encrypted-write-floor graph and never returns to plaintext writes;
- keep canonical-with-projection/dual writers until the legacy projection is current, then step the write mode back only when its transition guard passes so forward retry remains possible;
- drop a new unvalidated constraint only when it blocks rollback, without reverting cleaned data.

### Batch I — contract, separate irreversible approval

Not authorized by Phase 1 approval. Preconditions:

- repository search, database dependency queries, telemetry, and runtime access logs prove zero legacy readers/writers;
- Payroll and Recruitment have migrated;
- finalized payroll compatibility is verified;
- at least one full stability window and restore rehearsal passed;
- the user approves the exact drop list and restore point.

Only then may old columns/tables be renamed, guarded read-only, and eventually dropped. Audit/ledger facts are never dropped as rollback.

## Application deploy order

1. **Observability first:** correlation IDs, migration-profile metrics, shadow mismatch counters, DB query timing, and PII-free migration telemetry.
2. **Source parity:** Batch A plus clean-rebuild/catalog tests.
3. **Schema expansion:** create all approved non-sensitive B/C/E/F/G parents, fixed hash leaves, constraints, locators, and guards with every profile still at legacy defaults; then create exact range leaves from the hash-bound approval manifest before any writer. The hash proves exact manifest identity and is not a digital signature. Batch D remains blocked on its KMS ADR; no read or writer switches occur.
4. **API and compatible-writer wave:** introduce the Workforce command boundary, permanent source uniqueness, tenant reference validation, conditional versions, transactional outbox/audit, and compatibility projectors. Remove the SEC-030 write-on-read; enforce SEC-031 DataScope; split SEC-032/SEC-060 DTOs; make SEC-036 termination tenant-only; require tenant employment proof for SEC-037; make SEC-045 dependencies fail closed; use one stable error mapper.
5. **Caching wave:** ship bootstrap/profile/access/scope revisions, V1/V2-separated actor/tenant query namespaces, exact mutation invalidation, cancellation, logout/401/org-switch clearing, and sensitive no-store/purge behavior.
6. **UI wave:** use the backend capability manifest for exact server routes, sidebar/actions/query gates and safe entitlement states; provide self-service `/me/*`, shared responsive/accessibility/list/error/confirmation conventions, and remove direct duplicate data layers.
7. **Resumable reconciliation/backfill:** build maps, periods, snapshot events, opening entries, attendance facts, and closure from approved manifests; zero unresolved rows is mandatory.
8. **Private-data migration:** only after Decision 6 and the named KMS ADR, then repeat its API/cache/UI gates before any sensitive cutover.
9. **Dual-write and shadow modes:** enable one approved tenant/domain at a time, including the legacy hierarchy-write adapter before closure shadowing.
10. **Canary then full canonical reads:** only after every pre-canary and validation gate; internal tenant, approved low-risk cohorts, then full cohorts.
11. **Legacy freeze and contract:** each requires its stated gates; contract remains a separate irreversible approval.

## Wire API and optimistic-concurrency contract

V1 preserves legacy route names, IDs, and safe field shapes; canonical IDs are additive named fields and never replace a legacy integer `id`. It does **not** preserve the unsafe salary/private payload: before shadow mode, every V1 base list/detail DTO deliberately stops serializing salary, bank, tax, medical, emergency, and private fields, and moves authorized reads to separate audited endpoints. This security correction outranks wire compatibility. Only a session-bound, valid, allowlisted client contract at or above `minimumSafeV1ClientContract` may call V1 and it still receives only the safe DTO; missing, invalid, unknown, or older contracts receive 426 before a response body. V2 uses explicit canonical string IDs and safe DTOs. Both versioned route families and bootstraps are deployed before any V2 client release, and clients select one explicit family rather than having the migration profile silently change a response shape. Both remain available until Batch I.

| Frontend/backend/profile | Result |
|---|---|
| Old frontend + new backend + any pre-contract data mode | A valid session-bound contract at/above the minimum receives the safe V1 adapter; missing/invalid/below-minimum attestation gets 426 `SAFE_CLIENT_UPGRADE_REQUIRED` before an HRMS body. Internal canonical reads may not change safe V1 fields/IDs. |
| New frontend + new backend + wire V1 | Supported; use only the V1 cache namespace. |
| New frontend + new backend + wire V2 | Supported after bootstrap and capability gates; use only V2 keys. |
| New frontend + old backend without bootstrap | Release blocked; the new frontend is never deployed first. |
| Stale profile revision during request | Cancel/purge/re-bootstrap; do not retry against another API version. |
| Binary rollback after sensitive cutover | Only adapter-capable builds are eligible; an older plaintext-reading binary is forbidden. |

Mutable-resource reads return an `ETag` derived from resource ID and `row_version`. Update/transition/delete commands require `If-Match`; absence returns HTTP 428 with code `PRECONDITION_REQUIRED`, and a stale value returns HTTP 409 with code `ROW_VERSION_CONFLICT`. The stable envelope is `{ statusCode, code, message, correlationId, details: { resource, id, currentVersion } }`; it contains no provider or PII detail. The client never blindly retries: preserve unsaved input, cancel optimistic state, refetch the exact resource, and offer compare/reapply. Profile updates use the same precondition rule over `profile_revision`.

## Capability and client-cache contract

The bootstrap capabilities are computed by `AccessService` from membership, module entitlement, DataScope, and the current workforce/reporting graph. One checked-in route/capability manifest drives backend guards and frontend route, sidebar/command-palette, action, and hook `enabled` gates. It includes exact sensitive reveal/export and member-management capabilities. Self flows use `/me/*`; admin HR routes never substitute for self permissions. The client is `LOADING` before a successful bootstrap, enters fail-closed `ERROR` on failure, and accepts only a `LOADED` response; loaded with no modules/permissions means none enabled.

Every tenant-owned HR query key is:

```text
[streamlineos, hrms, orgId, actorUserId, actorMembershipId,
 accessRevision, scopeRevision, profileRevision, wireApiVersion, domain, resource, params]
```

`accessRevision` bumps for RBAC/module changes. `scopeRevision` bumps for membership, assignment, reporting-line, engagement-lifecycle, or other DataScope changes. Mutation-to-key tests list every affected projection; direct component query implementations are removed before canary.

- Org switch, logout, terminal 401, actor change: abort in-flight requests first, purge all prior actor/tenant HR queries and mutations, clear credentials, then navigate. A 403 never triggers contract fallback.
- Access/scope revision or capability loss: abort and purge permission-shaped plus sensitive namespaces before refetching bootstrap.
- Profile revision or an explicit client wire-family change: abort and purge the old namespace; V1 and V2 data are never copied or seeded into each other.
- Sensitive masked or revealed responses use `Cache-Control: private, no-store`, are excluded from Next/RSC caching, dehydration, persistence, and prefetch, and use client `staleTime: 0`/`gcTime: 0`; purge on unmount, revision, org switch, logout, and 401. Every reveal/export is access-audited.

Pre-canary closure also requires: AccessService-only checks and tenant reference validation; scoped onboarding/task/document/attendance/leave routes; server-derived approvers; bounded/rate-limited audited exports; short-lived document URLs; awaited/outbox audit; consistent HR entitlement ownership; and zero direct legacy hierarchy writers. UI gates consolidate the hierarchy surface, use server aggregates/quota and cursor search, lazy/virtualized workforce views, queued exports, shared confirmation/list/error/pagination states, one hook per resource, responsive accessible tabs/actions, exact self routes, and split over-cap files. V2 list/composed endpoints must be cursor-bounded and screen-shaped before full canonical reads.

## Resumable backfill design

No BullMQ/job queue is available. Use an operator-run CLI with:

- explicit tenant allowlist;
- keyset cursor `(organization_id,id)`, never offset;
- advisory job lock and one active run per task;
- short transaction per batch;
- checkpoint table recording task, tenant, cursor, counts, checksum, status, and code version;
- deterministic command/migration IDs and `ON CONFLICT` idempotency;
- configurable batch size and pause;
- halt thresholds for p95 latency, DB CPU, WAL volume, replica lag, lock wait, and error rate;
- dry-run and reconciliation-only modes;
- counts and keyed checksums only in logs.

Subjects are processed tenant-by-tenant with a zero-error rule: any failed or ambiguous row pauses that domain for that tenant, and no severity threshold can waive it. Each resolution entry records its own canonical record IDs, decision/reason codes, integrity hashes, organization data-owner `prepared_by`, independent HR/security `approved_by`, and timestamps; the two actors must be distinct and `AccessService`-authorized. A PII-free signed batch manifest binds those entries to tenant/profile revision, source snapshot/checksums, code/schema versions, and signature—never field values. The CLI verifies every entry plus the batch signature and refuses backfill/cutover when any item is unresolved, any checksum changed, any item lacks both approvals, or both approvals belong to one person.

## Validation gates

### Identity

- the complete subject union is classified: all current memberships/users, organization people, workers/engagements, legacy HR rows, Payroll subjects/finalized mappings, Leave/Attendance/onboarding/lifecycle subjects, and Recruitment hire/handoff subjects;
- every workforce/legacy subject has one approved canonical map, and every access-only/person-only classification has explicit two-person approval; there are no reviewed-but-unresolved exceptions;
- the current eight active memberships and three organization-person rows remain visible through V1 unless an organization data owner explicitly approves their access-only/person-only classification; canonical cutover cannot silently remove a current employee-list row;
- no canonical person/worker/engagement maps to multiple legacy subjects unexpectedly;
- no automatic email-only merge occurred;
- worker number, status, placement, dates, and manager mismatch report is empty or individually approved;
- all links remain within the same organization.
- Recruitment offer/hire handoff invokes Workforce for the cohort, and write-path instrumentation/schema tests prove zero tenant-employment projection into global `users`.

### Tenant integrity

- all child rows join one same-tenant parent;
- zero orphan references;
- all intended composite FKs are valid in `pg_constraint`;
- RLS read/write integration tests pass for tenant A/B and the non-owner application role;
- schema source and live definitions match normalized catalog definitions.

### Effective history

- zero overlapping primary assignments or same-type reporting lines;
- current projections equal the period effective today;
- current placement fields match the final approved period;
- every lifecycle status change has one state event after writer cutover.

### Leave

- per worker/type/period projection equals `SUM(delta_days)`;
- five legacy rows reconcile exactly and total 94.20 after approved opening entries;
- command/reversal uniqueness violations are zero;
- concurrent approve/cancel tests yield one legal transition and one ledger effect.

### Attendance

- one open session maximum per tenant/worker;
- event replay matches legacy daily totals/open state;
- business-date comparison passes across midnight/DST/timezone fixtures;
- correction appends and never changes prior event bytes;
- evidence rows expire without deleting attendance facts.

### Sensitive data and audit

- decrypt(encrypt(value,AAD)) round-trips; wrong tenant/subject/key version fails closed;
- plaintext scans across logs/new columns return zero;
- base employee responses contain no sensitive fields;
- every reveal/export produces an access event;
- application role cannot update/delete audit or ledger facts.

### Append-only, partition, and baseline integrity

- each state/leave/attendance/audit fact has exactly one permanent locator where applicable; each locator resolves to one existing partition row, and a retry after `command_fences` expiry inserts zero new facts;
- bounded source min/max plus exact distinct-month manifests exist for every historical leave, attendance/evidence, and audit backfill; a routing dry run proves every source row has a verified target partition before insertion, with zero default-partition routes;
- every reversal/correction resolves its target ID and partition key, one direct reversal exists at most, correction bytes are new, and original fact bytes/checksums never change;
- every evidence row references its attendance event and partition key; retention deletion removes evidence only;
- application and migration runtime roles cannot update/delete/truncate append-only parents or children; mutation triggers/grants exist on every current and newly created partition;
- pre-backfill legacy counts, min/max IDs, keyed checksums, projection totals, and relevant row hashes are captured. Post-backfill legacy baselines are unchanged, canonical replay matches them exactly, locator/fact counts agree, and a deterministic rerun produces zero additional facts.

### API, capability, and frontend isolation

- the complete V1/V2 and versioned-bootstrap matrix passes with exact DTO snapshots and stable 426/428/409 envelopes;
- V1 security-regression tests prove unsafe fields are absent for every role; valid minimum client attestation receives only the safe DTO, while missing, forged, unknown, and below-minimum attestations receive 426 without an HRMS response body;
- tenant A/B, actor A/B, access/scope/profile revision, org-switch, logout, 401, and capability-loss tests prove cancellation and namespace purge before refetch;
- the actor-specific bootstrap is `private,no-store`, never dehydrated/persisted/prefetched, and cross-actor/server-cache tests prove one actor's capabilities are never served to another;
- every audited route/nav/action/hook derives from the same capability manifest, unauthorized hooks issue zero requests, loaded-empty modules expose none, and sensitive responses are absent from base DTOs, RSC/dehydrated state, persistence, and browser caches;
- sensitive profile-transition and deployment-admission tests reject an incompatible backend/rollback binary and prove a profile revision purges all sensitive client namespaces.

### Performance

- capture `EXPLAIN (ANALYZE,BUFFERS)` on a production-size branch for the ten Phase 0 probes and new canonical queries;
- record query count/DB time/p50/p95 for the ten screens after instrumentation;
- assert no N+1 on canonical detail/list/scope queries;
- record index sizes/scans after a representative soak; never drop an index from tiny live zero-scan data.

## Rollback matrix

| Stage | Rollback action | Data policy |
|---|---|---|
| Schema expansion | Disable feature; optionally drop only empty/unreferenced objects | Never delete populated facts |
| Dual write | Switch reads to legacy; keep dual/projection writes until parity, then follow the allowed transition | Keep canonical rows |
| Backfill | Stop CLI and resume from checkpoint | No bulk delete |
| Constraint validation | Drop only the new constraint if necessary | Keep repaired data |
| Sensitive cutover | Use the canonical decrypting/masking adapter through either wire version | Never re-plaintext encrypted data; reject incompatible old binaries |
| Assignment cutover | Read maintained current projections | Keep periods/events |
| Leave cutover | Read maintained legacy projection | Keep ledger entries |
| Attendance cutover | Read maintained legacy sessions | Keep events/evidence |
| Hierarchy cutover | Read adjacency | Rebuild/ignore closure |
| Audit | No destructive rollback | Append-only retention |
| After legacy freeze | Replay only non-sensitive compatibility projections under a two-person manifest | Never replay sensitive values into plaintext |
| After contract | Point-in-time restore/forward repair only | Separate irreversible gate |

## Lock and operational risks

| Operation | Risk | Mitigation |
|---|---|---|
| `ADD COLUMN` | Brief `ACCESS EXCLUSIVE` | Metadata-safe shape, short lock timeout, retry window |
| Concurrent index | Invalid inside transactional Drizzle migration | Not used in this first wave; future use requires the separately tracked runner below |
| `NOT VALID` FK/check | Brief lock; new writes enforced immediately | Compatible writer first; short lock timeout |
| `VALIDATE CONSTRAINT` | Full scan and parent lock | Separate scheduled step; monitor replicas/latency |
| Exclusion constraint | Not concurrent/`NOT VALID` | Create on empty new table; prevalidate inserts |
| Encryption backfill | CPU/KMS/WAL | Small batches, key-version metrics, branch rehearsal |
| Timestamp conversion | Semantic corruption | Sidecar/new table and explicit conversion registry |
| Partition creation/attachment | Parent lock | Precreate future partitions and validate bounds |
| RLS/`FORCE RLS` | Traffic denial if context wrong | Policy integration tests and application-role canary |
| Cascade to restrict | Existing orphans/blockers | Add/validate restrictive FK before removing old FK |

## Online DDL boundary

The existing Drizzle migration integrity test forbids `CREATE INDEX CONCURRENTLY`. SQL-managed Phase 1 files are also transactional through their separate hash-allowlisted runner and use ordinary indexes because audited existing HR tables are tiny and target tables are empty. They never write or copy placeholder metadata into the Drizzle journal. Any future large existing-table online index is blocked until separately approved.

That future operation must use a crash-safe non-Drizzle runner with an allowlisted exact SQL hash, advisory lock, bounded timeouts, autocommit per online statement, and its own `online_ddl_operations` record (`operation_id`, object, SQL hash, expected catalog definition, state, attempts, timestamps, last error, operator/approver manifest). It verifies before/after catalog state, resumes `PLANNED/RUNNING/VERIFYING` work, detects/cleans only its own invalid index, and marks `COMPLETE` only after definition validation. It never writes the Drizzle journal; a later short journaled migration may attach a verified index-backed constraint.

## Authored migration artifacts after approval

Each database forward SQL has a companion `.down.sql` or an explicit refusal guard where reversal would discard data. The approved implementation wave authors and reviews these artifacts in deployment order. The SQL-managed HRMS bundle never writes the Drizzle journal; operator CLIs have their own hash-bound manifests and operation records:

1. schema/live parity declaration tests;
2. migration profile, workforce links/maps/reconciliation, and version columns;
3. assignment/reporting/state-event schema plus permanent command/source uniqueness; expiring `command_fences` remain an optional snapshot reference rather than a historical FK;
4. leave ledger/locator/projection partitions and their future-partition operator;
5. attendance event/locator/evidence/projection partitions and their future-partition operator;
6. hierarchy closure and immutable HR audit;
7. private/sensitive schema and sensitive access audit, only after the separately approved managed-KMS ADR;
8. tenant FK/check validation migrations;
9. operator CLIs and validation reports.

Forward application and rollback use separate strict approval manifests. A rollback manifest binds every applied file's exact operation ID, forward SQL hash, original apply-manifest hash, root/database/role/server identity, every down-file hash, and one contiguous rollback endpoint. The runner holds the bundle advisory lock, rejects unbound active or complete operations, and processes only the approved reverse suffix, one transaction per file. Each down file validates and locks its exact `COMPLETE` operation before any DDL, changes it to `ROLLED_BACK` only after all DDL succeeds, and verifies both the retained ledger and the rolled-back catalog before commit. Reapplication advances that exact identity through `ROLLED_BACK -> RUNNING -> VERIFYING -> COMPLETE` with an incremented attempt; a failed reapplication is durably `FAILED` and requires renewed approval.

The exact SQL and rollback are reviewed batch-by-batch before production execution. Approval of all eight decisions permits authoring the non-sensitive additive first wave; Batch D still waits for its named KMS ADR. No approval here permits running migrations against production without showing the generated SQL, dry-run result, backup/restore evidence, and target cohort.

## Stop gate

The additive schema source, review-only `0000-0004` SQL bundle and rollbacks, catalog preflights, schema-bundle runner, partition planner, and signed leave-opening verification tooling were authored after the eight-decision approval. They remain non-executable against production until a disposable production-size clone passes forward, rollback/refusal, partition, RLS, privilege, resume, reconciliation, and restore rehearsals and the exact production manifests receive separate approval. Batch D remains blocked until its named KMS ADR is separately accepted. Production mutation status remains **none**.
