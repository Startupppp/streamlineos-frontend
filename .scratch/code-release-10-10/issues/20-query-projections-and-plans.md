# 20 — Prove explicit projections, correct indexes and no required full scans

**What to build:** Every read uses a named-column projection served by a tenant-leading index with no required full tenant or table scan and no avoidable sort. The named heavy queries — reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard — are exercised against seeded data rather than reasoned about.

**Blocked by:** 03 — plans taken against an empty or partially bootstrapped database measure nothing.

**Session status 2026-09-03 (COMPLETE — nothing left half-finished):** box 1 stays OPEN and BLOCKED on the same
product decision; no measurement can close it. What changed is that its two decision-free clauses (count paths,
existence paths) are now ENFORCED by a new gate `pnpm check:query-projections` (rc 0, allowance 0) instead of
resting on a hand-scan, and the blocked clause is RATCHETED at 1,441 unprojected reads. Report:
`reports/21b-n-plus-one-gate-blind-spot.md` §5.

**Session status 2026-09-03 (second pass — the `with:` dimension):** box 1 stays OPEN and BLOCKED on the same
product decision, and that verdict is now confirmed from a second, independent axis. But a **decision-free clause
inside it was open and nobody knew**, because `check:query-projections` reads only the TOP-LEVEL keys of a
relational query and is deliberately blind to what a `with:` block ships. Measured with an AST: **198 relation
hydrations carried no `columns:`**, and four of them hydrated a table carrying a bearer token — **two live on the
wire**. Fixed, then enforced at an allowance of 0 by a new gate `pnpm check:relation-hydration` (rc 0), with the
population ratcheted at 186. Report: `reports/20b-relation-hydration.md`.

**Status:** measured; one box open by design and **BLOCKED on a product decision** — but as of 2026-09-03 its two decision-free clauses are ENFORCED by a new gate (`pnpm check:query-projections`, rc 0, count-path allowance 0) and the blocked clause is RATCHETED at 1,441 unprojected reads rather than merely described. Re-confirmed at head
2026-09-03 by an independent recount (296 `findMany` / 550 `findFirst` / 599 bare `.select()` without a projection,
**79–80% of it in held or excluded territory**). The list/count/existence clauses that need no contract decision are
closed and the global-users clause is locked by a spec; the residue is "which list endpoints may return less", which
no further measurement can answer.

**2026-09-03 residual-risk register:** box 1 = **R-5**, ACCEPTED RESIDUAL, blocker DECISION (product / API contract), owner release owner, deadline 2026-09-17. Gate re-verified exit 0 at 1,441/1,441 with count/existence at 0. See `reports/residual-risk-register.md` §3.4.

Reports: `reports/20-query-plans.md`, `reports/20b-relation-hydration.md`. Raw plan trees: `reports/20-query-plans/plans-{large,mid,small}.{json,txt}`.
Harness: `BE/test/perf/{heavy-query-fixtures,seed-heavy-query-load,heavy-query-catalog,heavy-query-catalog-{calendar,notifications,search,dashboard},heavy-query-plan-analysis,measure-heavy-query-plans}.mjs`.

- [ ] Every list, count and existence path selects named columns and returns a minimal projection; no full ORM row, global user record or large JSON/blob/vector field is hydrated for these paths.
  - Audited in full: 1,315 `db.query.*.find{Many,First}` sites and 500 bare `.select()` sites across the 33 in-scope module directories, resolved against a relation map built from all 610 `relations()` blocks, then every hit opened and read.
  - Zero findings in three categories: no vector/embedding column on any list path; no bare `.select()` touching global `users`; no `user: true`/`creator: true`/`approver: true`/`assignee: true` anywhere in scope.
  - Fixed 4 files. `build/core/projects-tickets-detail.service.ts` — an unprojected global `users` relation that was also **throwing on every ticket-detail call** (`users` has no `user` relation; Drizzle raises `Cannot read properties of undefined (reading 'referencedTable')` at query-build time). Proved by building and executing the query against `scratch_boot_d`: before `FAIL … referencedTable`, after `BUILD OK … EXECUTED OK rows: 1`. `notifications/notification-providers.service.ts` — the list read `config_encrypted` for 100 rows; `hasCredentials` is now derived in SQL. `finance/controls/audit-surface.service.ts` (3 × `select *`) and `hr/config/hr-email-templates.service.ts` (1 ×) — named projections.
  - **2026-09-02 — the global-users clause and the vector clause are now CLOSED and one is locked by a spec.**
    - Re-audited independently against a relation map built from every `relations()` block: **1,573 `db.query.*.find{Many,First}` sites**, **169 relations to global `users`**, **0 unprojected**, **0 unresolved relation names**. No bare `.select()` reads `users`, `getTableColumns(users)` appears nowhere, and the union of every users projection in the codebase is `id, name, firstName, lastName, email, image, phone, bio, isActive, designation, linkedinUrl, twitterUrl, githubUrl, websiteUrl` — `totpSecret`, `emergencyContact`, `dateOfBirth` and `metadata` appear in none of them.
    - Locked by `BE/src/db/users-relation-projection.spec.ts`, which rebuilds the relation map, fails on any users relation without an explicit `columns`, fails on any projection naming a secret column, and — per the ticket's own anti-vacuous rule — fails if it resolves fewer than 1,000 query sites or fewer than 100 users relations. `jest --runInBand --testPathPattern=users-relation-projection` → **3 passed**. It caught a real false positive while being written (`columns: USER_COLS`, an identifier rather than an object literal, read as unprojected).
    - Vector clause: **0** reads hydrate an `embedding`/`fts` column on a list path after the fixes below. The stake is now measured, not asserted — `kb-chunks-page-50` moves **322,200 bytes** unprojected against **14,600** projected, **22.07x**, identical on large and mid.
  - **The bytes-returned instrument the previous pass said was missing now exists**: `BE/test/perf/measure-projection-bytes.mjs` (`--self-test` 8/8), run as `streamline_app` with the tenant GUC in a rolled-back transaction. It discriminates exactly where `EXPLAIN (BUFFERS)` cannot — `dashboard-recent-activity` is **417 buffers either way** but **1,560 -> 1,080 bytes (1.44x)** on large and 1,880 -> 1,368 (1.37x) on mid. Output `reports/20-query-plans/projection-bytes-{large,mid,tiny}.json`.
  - **13 files fixed this pass** (existence-only reads narrowed to the columns actually consumed, and the KB trash list stopped shipping `content`/`content_text`/`fts`). Typecheck caught four of them where the value was used beyond the guard — `projects-write` needed `name`, `sign-envelope-validation` needed `routingMode`/`expiresAt`, `recruitment-candidate-ai` needed `firstName`/`lastName`/`currentRole`, `kb-pages.update` needed `content` — all widened to exactly those; the heuristic alone would have shipped four runtime bugs.
  - **2026-09-02, third pass — the box was RE-READ against current source rather than taken on the note above, and
    the `count` and `existence` clauses yielded three more real fixes.** The earlier passes scored the box on
    *whole-table* shape (does this `findMany` carry `columns:`) and concluded the residue was all DTO-bound. But the
    box names three path kinds — list, **count** and **existence** — and a count or an existence check has no
    response DTO at all, so narrowing one changes no contract and needs no product decision. Scanning every
    `findMany` with no `columns:` for a result whose *only* use is `.length` found four sites; one is a false
    positive of the scan (`dashboard/dashboard-project.service.ts:66` — the variable the heuristic attributed comes
    from a different query and the `findMany` is the returned list), and **three are real and are now fixed**:
    - `e-sign/sign-envelope-validation.service.ts:42` — `documents.length === 0` ("Envelope has no document") read
      all **17** declared columns of every `sign_documents` row in the envelope, including `sha256Hash`,
      `originalFileKey` and `currentFileKey`. Now `columns: { id: true }, limit: 1`.
    - `e-sign/sign-bulk-send.service.ts:70` — an active-job quota check (`activeJobs.length >= max`) read all **15**
      declared columns of `sign_bulk_send_jobs`, including the `columnMappingJson` **jsonb**. Now
      `columns: { id: true }`.
    - `surveys/survey-participant.service.ts:106` — `remind()` counts non-completed participants and read all **21**
      declared columns of `survey_participants` for every requested id, including the `metadata` **jsonb** and
      **`accessTokenHash`** — the hashed bearer token that grants access to a survey response, hydrated into the Node
      heap to answer a count. Now `columns: { status: true }`, which is the only column the count reads.
    Proof: `pnpm typecheck` **exit 0**; `jest --runInBand --testPathPattern="e-sign|survey"` **exit 0, 34 suites /
    211 tests**; `pnpm check:openapi-coverage` exit 0 (1,371/1,371 mutating ops) and
    `pnpm check:contract-breaking-change` exit 0 (101 published operations) — i.e. measured, not assumed, to be
    contract-neutral.
  - BLOCKED — the remaining clause is *full ORM rows on ordinary list paths*, and it is a **product/API-contract
    decision, not a measurement or a missing instrument**. Re-counted independently at head over all 3,708
    non-spec `src/**` files (previous passes counted only the 33 in-scope module directories, which is why these
    numbers are larger, not because anything regressed): **290** `findMany` with no top-level `columns:`, **499**
    `findFirst` with no `columns:`, **600** bare `.select()`. Narrowing the bulk of these changes a response DTO —
    `hr_form_submissions.formSchemaSnapshot` is what `maskSensitiveData` reads, the audit and event-stream jsonb
    columns are the diff the UI renders, `survey_questions.settings` and `automation_rules.conditions` *are* the
    payload the endpoint exists to return. Two further facts make this a decision and not work anyone can just do:
    - **the residue is concentrated where this release cannot reach it.** `findMany`-without-`columns` by area:
      hr 83 · inventory 37 · e-sign 28 · surveys 23 · support 20 · build 12 · chat 11 · billing 10 · crm 7. Bare
      `.select()`: hr 190 · finance 55 · crm 49 · build 39 · inventory 38 · payroll 37 · billing 31. Inventory and
      CRM are **excluded from this release**; hr, support, build, chat, billing, finance, timesheets, accounting,
      invoices, notifications, workflows and storage belong to another agent's territory. Roughly 80% of the
      population is unreachable from here even with the decision made.
    - **the earlier "PARTIAL" reading was too soft.** There is no further measurement that would close this box —
      `measure-projection-bytes.mjs` already scores any candidate (`kb-chunks-page-50` 22.07x,
      `dashboard-recent-activity` 1.44x where buffers say 417/417). What is missing is a product owner deciding
      which list endpoints may return less than they return today. Recorded as BLOCKED so it is routed as a decision
      rather than left looking like unfinished measurement.
  - **2026-09-03 — re-counted at head and the BLOCKED verdict is confirmed, not carried forward.** An independent
    recount over the same corpus definition (all non-spec `.ts` under `streamlineos-backend/src`, 3,575 files;
    `findMany`/`findFirst` matched by brace-balanced top-level object literal, so a nested `columns:` inside a
    `with:` does not count as a projection): **`findMany` without a top-level `columns:` 296** (was 290),
    **`findFirst` without one 550** (was 499), **bare `.select()` 599** (was 600). Nothing regressed; the drift is
    new code arriving from other lanes during the release, and the `findFirst` delta is the largest because
    existence reads are the cheapest thing to add.
  - **The "roughly 80% is unreachable" claim is now an exact split rather than an estimate.** Bucketing every site
    by owning module: `findMany` **181 in another agent's held territory · 53 in excluded modules (crm, leads,
    deals, contacts, inventory) · 62 open** = 234/296 (**79.1%**) unreachable from this session. Bare `.select()`
    **369 held · 109 excluded · 121 open** = 478/599 (**79.8%**) unreachable. By module, `findMany`: hr 84 ·
    inventory 40 · e-sign 26 · surveys 26 · support 20 · build 12 · chat 11 · billing 10 · crm 7. Bare `.select()`:
    hr 190 · finance 55 · crm 50 · build 39 · inventory 38 · payroll 37 · billing 31 · party 20 · timesheets 20.
  - **2026-09-03 — the two closed clauses are now ENFORCED and the blocked one is RATCHETED. New gate
    `pnpm check:query-projections` (`BE/src/scripts/check-query-projections.mjs`, baseline
    `BE/src/scripts/baselines/query-projection-baseline.json`).** The count and existence clauses were closed by hand
    and **nothing was left enforcing them** — the pass that closed them found `survey_participants.accessTokenHash`, the
    hashed bearer token granting access to a survey response, hydrated into the Node heap to answer a `.length`, and
    there was no reason that could not come back the next day. The gate HARD-FAILS on any unprojected read whose every
    use is `.length`: measured **0** today, allowance **0**. A top-level `columns:` is told apart from one nested inside
    `with:` by brace depth, not by regex. The count rule is deliberately narrow — allowing a bare use as a truthiness
    test measured **211** findings against the hand-scan's 4, because `return rows;` is a bare use too, and a gate that
    fires on 211 sites of which 207 are wrong does not get fixed, it gets an allowance.
    **The blocked clause is ratcheted rather than enforced**, which is the honest thing to do with a clause no
    measurement can close: unprojected reads may not climb while the product decision is outstanding.
    **Independently re-measured for this gate, and it corroborates the recount rather than copying it**: `findMany`
    without a top-level `columns:` **295**, `findFirst` **547**, bare `.select()` **599** (the ticket's own recount:
    296 / 550 / 599), total **1,441**.
    Two defects in the ceiling were found by running it, and both are recorded because they generalise:
    (a) the baseline was first measured on the shared WORKING TREE and read 294/547/600 against HEAD's 295/547/599,
    because two concurrent lanes held uncommitted edits in opposite directions — **a ceiling taken from a dirty shared
    tree is not the number the gate will see**, so it is taken from `git archive HEAD src`;
    (b) three independent per-shape ceilings are unusable in a shared tree for the same reason — one lane projecting
    `chat/chat-channel-list.service.ts` (findMany 295 -> 294) while another adds a bare `.select()` in a new file
    (599 -> 600) trips a per-shape gate while the total is 1,441 either way, **and it is 1,441 because nothing got
    worse**. Enforced on the total, reported per shape so the composition is never hidden; a per-shape gate would have
    been raised by the next person to hit it.
    Bite-proved hermetically — `git archive HEAD src test package.json` into a temp dir, defect planted THERE, never in
    the shared working tree: clean archive **rc 0**; planted unprojected count path **rc 1** naming the site; adding
    `columns:` to that same planted read **rc 0**; removing it **rc 0**; a planted bare `.select()` **rc 1** on the
    total ratchet. `--self-test` 10/10.
    **This does not close the box.** The residue is still "which list endpoints may return less than they return
    today", and no gate can answer that. What changed is that the two clauses needing no decision can no longer
    silently regress, and the one that does is now a measured number with a ceiling instead of a paragraph.
  - **Decision re-affirmed, honestly: this stays BLOCKED and it is not a measurement gap.** Every instrument the
    box could want already exists and already discriminates — `measure-projection-bytes.mjs` (`--self-test` 8/8)
    separates `kb-chunks-page-50` at **22.07x** from `dashboard-recent-activity` at **1.44x** where
    `EXPLAIN (BUFFERS)` reports 417 either way. Running it over another 846 sites would produce a longer list, not
    a closed box. What is missing is a product owner deciding **which list endpoints may return less than they
    return today**, because narrowing the bulk of the residue changes a response DTO: `formSchemaSnapshot` is what
    `maskSensitiveData` reads, the audit jsonb *is* the diff the UI renders, `survey_questions.settings` and
    `automation_rules.conditions` *are* the payload the endpoint exists to return. The three clauses that need no
    such decision — count paths, existence paths, and global-`users`/vector hydration — are **closed**, and the
    last pass proved the point by finding a count path that hydrated `survey_participants.accessTokenHash` to
    answer a `.length`.
  - **2026-09-03, second pass — the box's own gate could not see inside a `with:`, and a decision-free clause was
    open behind that blindness.** `check-query-projections.mjs` reads the TOP-LEVEL keys of a relational query and
    tracks brace depth precisely so a `columns:` nested inside a `with:` does NOT count. Correct for the population
    it ratchets — and it means the relation itself had never been measured by anything. Read against the installed
    driver (`drizzle-orm/pg-core/dialect.js`, `buildRelationalQueryWithoutPK`), **two** shapes ship a whole related
    row: `with: { rel: true }`, and any `with: { rel: { ... } }` whose config has no `columns:` key — `{ where }`,
    `{ orderBy, limit }`, `{ with }` — because that branch falls through to `Object.keys(tableConfig.columns)`.
    The second shape was the majority (102 of 198) and reads like a projected query.
    - **Measured at head with an AST before anything was changed: 198 unprojected relation hydrations**, over 1,735
      `db.query.*.find{Many,First}` call sites and 562 relation entries, with `check:query-projections` **exit 0**
      over all of it. The same scan independently corroborates two closed clauses: **0** unprojected relations to
      global `users` (the existing spec is a regex implementation, this is an AST one, both say 0) and **0**
      vector/embedding columns on any unprojected read.
    - **DATA EXPOSURE — four sites, two live on the wire, now fixed.** `GET /hr/recruitment/jobs/:jobId` returned
      every application's `tracking_token`, and `GET /hr/recruitment/candidates/:candidateId` returned that plus
      every interview's `calendar_sync_token`. Both services `return` the ORM row unmapped and the only global
      interceptor **wraps** rather than strips (checked, not assumed). `tracking_token` is minted as
      `randomBytes(32).toString("hex")` and `GET /public/application-status/:token` is **unauthenticated** and
      resolves the candidate's name, email and job from it alone — so the leak handed any holder of
      `hr:employees:view` a working credential for an external party. `calendar_sync_token` has no reader anywhere
      in `src`. Fixed by **exclusion** (`columns: { trackingToken: false }`), which preserves the rest of the
      response shape and therefore needs no product decision; contract-safety proved by grepping the frontend, where
      the only `trackingToken` consumer is the public apply page reading its own POST response. Commit `18506718`.
    - **MEMORY — three sites where the hydrated row was never read at all, now fixed.** `timesheets.updateEntry`
      hydrated a whole 38-column `tickets` row and through it a whole 21-column `projects` row including its
      `settings` jsonb, and read **zero fields off either**; `workflows.triggerWorkflow` read the latest
      `workflow_versions` row — whose `definitionJson` is the entire workflow graph — to use its `id`;
      `feedbucket-ai.loadSubmission` hydrated widget + project to read `widget.projectId` and `project.orgId`.
      Commit `bc044673`. 191 -> 186.
    - **PAYLOAD — 186 remain, 77 in excluded inventory/CRM, 109 in scope, 52 on list paths.** hr 27 · build 26 ·
      blog 8 · chat 8 · surveys 8 · feedbucket 5 · dashboard 4 · expenses 4 · finance 3 · invoices 3 · tasks 3 ·
      billing 2 · branches 2 · quotes 2 · support 2 · csat 1 · workflows 1. Thirteen of the heaviest were opened and
      read one by one; **ten of thirteen are DTO-bound** (the relation is spread into the returned object) — an
      independent confirmation of the BLOCKED verdict from a different axis, not a repetition of it.
    - **New gate `pnpm check:relation-hydration`** (`BE/src/scripts/check-relation-hydration.mjs`), wired in
      `package.json` and as a BLOCKING step in `.github/workflows/ci.yml`. Hard-fails at an allowance of **0** on an
      unprojected relation onto a credential-carrying table, on one onto global `users`, and on a `with:` key that
      matches no `relations()` declaration (that query raises at build time — the exact defect found live in
      `projects-tickets-detail.service.ts` in an earlier pass). Population **ratcheted at 186**, taken from
      `git archive HEAD`, not from the shared dirty tree. The same credential pattern on the **base** table of a read
      matches 77 sites and is deliberately NOT enforced — most are correct (`webhooks-dispatch` must load the signing
      secret to sign with it; a `survey_collectors.token` IS the shareable link the endpoint returns;
      `webhooks.service.ts` already strips its secret in the response map) — so they are printed as a CANDIDATE list.
      Coverage is ratcheted alongside findings: restricting the scan to `findMany` drops findings 191 -> **69**,
      comfortably under the ratchet, and reds on coverage instead. Bite-proved hermetically in a `git archive HEAD`
      tree, never in the shared working tree — clean rc 0; reverted credential fix rc 1 naming the site; planted
      users hydration rc 1; unresolvable relation name rc 1; one un-projected relation rc 1 (191 -> 192); projecting
      one rc 0 (190); narrowed detector rc 1 on coverage; re-planted at the lowered ratchet rc 1 (186 -> 187).
      `--self-test` **14 checks**.
    - **The gate caught two false-positive classes in itself before reporting a number.** `columns: USER_COLS as
      const` read as unprojected (an `as const` initializer is an `AsExpression`, not an object literal) and produced
      **14 phantom global-users hydrations** against a spec that correctly says there are none — 217 -> 198. And a
      projection shared across files (`SENDER_MEMBERSHIP_WITH_USER`) was invisible to a per-file constant map,
      leaving six chat sites unresolved; all six were correctly projected.
    - **A `tsc` green does NOT prove a `with:` narrowing is safe on three tables.** Proved with a scoped
      `ts.createProgram`: on `candidates` the compiler catches a read of an excluded relation column
      (`TS2339 … 'calendarSyncToken' does not exist`) and passes a kept one, so it IS a safety net; on `jobPostings`
      `job.applications` is a type error under `with: { applications: true }`, under `columns: { trackingToken: false }`
      and under `columns: { id: true }` — **all three identical** — because exactly three tables (`users`,
      `jobPostings`, `scorecardTemplates`) carry **two** `relations()` blocks. Drizzle merges them at runtime
      (`extractTablesRelationalConfig` assigns per relation name) but only one reaches the inferred type, so the other
      block's relations are runtime-live and type-invisible. ROUTED to the schema owner as **REL-DUP**.
    - **Cross-territory, found while wiring: `check:query-projections` and `check:n1-growing-loops` — this box's own
      gate and ticket 21's, both landed today — are in `package.json` and in NO workflow file. They can never run.**
      `check:relation-hydration` was wired into `ci.yml`; those two were left alone because turning on enforcement
      for another lane's ratchet mid-release is a decision, not a fix. Routed as **CI-UNWIRED**.
    - **This does not close the box.** The residue is still "which list endpoints may return less than they return
      today". What changed is that a decision-free clause inside the box was open, invisible to the gate that covers
      the box, and was leaking four bearer tokens.

  **DISPOSITION 2026-09-03 — ACCEPTED RESIDUAL R-5. Blocker: DECISION (product / API contract). Owner: release
  owner. Deadline: 2026-09-17.** Recorded for ticket 41 box 7; register: `reports/residual-risk-register.md` §3.4.
  Blocker re-verified at head, not carried forward: `pnpm check:query-projections` -> **exit 0**, 3,575 files,
  `findMany` 294 · `findFirst` 547 · bare `.select()` 600 = **1,441 against a ceiling of 1,441**, and
  **unprojected COUNT/EXISTENCE paths 0 (allowed 0)**. That is the correct shape for this box: the two clauses
  needing no contract decision are at zero and enforced, and the clause that needs one is ratcheted so it cannot
  grow while the decision is outstanding. There is no measurement left that would close it — what is missing is a
  product owner deciding which list endpoints may return less than they return today.
- [x] The named heavy queries run against a production-shaped seed with plans captured.
  - `node test/perf/measure-heavy-query-plans.mjs --org={large,mid,small}` → **36 queries × 3 tenant sizes**, all eight named categories covered. Seed: 3 orgs, 66,613 calendar events (9,507 recurring), 140,360 event attendees, 266,400 notifications, 13,320 kb chunks, 18,500 `build.tickets`.
- [x] Plans are taken as the application role with tenant context set, never as the database owner, so real authorization predicates are included.
  - The runner exits 1 unless `rolbypassrls = false` and `rolsuper = false`, and proves RLS is live before every session by checking that `SELECT count(*) FROM calendar_events` with no GUC raises `42501`. Printed on each run: `role streamline_app · bypassrls=false · no-GUC read denied 42501 · database scratch_boot_d`.
- [x] Seed first, then measure. A baseline taken on an empty database is not a baseline.
  - `scratch_boot_d` held **0 organizations** at session start. `seed-scratch-e2e.mjs` then `test/perf/seed-heavy-query-load.mjs` → the table above, in 468s. Both report every failed section and exit non-zero (two of my own SQL bugs were caught that way).
- [x] Run `VACUUM ANALYZE` after any table rewrite before trusting a count or a plan.
  - In `seed-heavy-query-load.mjs`, over all ten touched tables, before any count or plan is read: `[468.1s] VACUUM ANALYZE complete.`
- [x] Row-level security defeats GIN and trigram indexes and post-filters ANN search; where that changes the plan, it is recorded as a constraint rather than treated as a defect.
  - Trigram, 18,500 `build.tickets`, 18 matching rows: owner (`BYPASSRLS`) → Bitmap Index Scan on `idx_tickets_title_trgm`, **106 buffers, 18 rows read**; `streamline_app` + GUC → **Seq Scan, 393 buffers, 18,500 rows read** (18,482 removed by filter); via `app.search_ticket_ids` → **72 buffers, 18 rows read**. `~~*` is not `LEAKPROOF`.
  - ANN, same k=20 query, three tenant shares: large (90%) chooses `idx_kb_chunks_embedding_hnsw` and reads 20–23 rows; mid (9%) declines it and reads all **1,200** org chunks; small (0.9%) declines it and reads all **120**. The HNSW index carries no `org_id`, so it orders the whole table and RLS filters afterwards. Recorded as a property of single-index ANN under tenant RLS.
  - Recorded as a third constraint: `notifications` is partitioned on `created_at` and no read filters on it, so every plan is an `Append` over **48 partitions** and the floor grows one partition per month.
- [x] An `OR` with a semi-join, and a partial index facing an `OR` with an outside branch, are both measured rather than assumed — the rewrite is not always faster, and buffer counts decide it.
  - `EXISTS(role_assignments)` broadcast fan-out vs the "drive from the selective side" rewrite: **302 vs 302** buffers on large (identical plans — the planner already does the transform), **38 vs 47** on mid, **5 vs 14** on small. Rewrite rejected.
  - READ-section `(is_read = true OR id <= watermark)` against the partial `idx_notifications_unread_count` vs a `UNION ALL` of two indexed branches: **563 vs 594** (large), **513 vs 543** (mid), **128 vs 152** (small). Rewrite rejected.

## Defects found, not fixed (owners outside this ticket)

- **P1** `unified-inbox.service.ts:232,379` key notifications on `user_id`, which no index covers: **10,240 buffers / 23,401 rows read** for a count the membership-keyed equivalent answers in **39 buffers / 451 rows**, same result. Re-keying needs a `membership_id` backfill + `NOT NULL` first or it silently drops rows. This is also why `db:check-read-budgets` breaches `dashboard-personal-notifications-count` at 11,042 blocks against a 3,000 ceiling.
- **P1** `app.search_kb_chunk_ids` uses `AS MATERIALIZED`, so the HNSW index is unreachable: **36,882 buffers** on the large org vs **1,379** for the same body without the CTE. ~3.0 buffers per chunk, linear, at all three sizes. Dropping the CTE is a strict improvement (migration territory).
- **P1** `calendar-reminder-sweep.service.ts:61` caps recurring candidates at `LIMIT 200` with **no `ORDER BY`** over a predicate that admits the org's whole history — 8,369 of the large org's 8,569 recurring events are never considered, nondeterministically.
- **P1** `calendar-conflict.service.ts:56` accumulates every keyset page with no overall cap: **8,653 rows** for one 7-day free/busy check on the large org.
- **P2** Indexes specified in the report for tickets 08/05b: a partial `(org_id, start_date) WHERE rrule IS NOT NULL` on `calendar_events`, a covering `(org_id, start_date) INCLUDE (end_date, rrule, recurrence_end)`, and `(org_id, updated_at DESC, id) WHERE deleted_at IS NULL` on `build.tickets` (today's dashboard tile seq-scans 19,587 rows to return 10).
- **P2** `db:check-read-budgets`'s `forbid-seq-scan` assertion fires on 60- and 90-row tables where a seq scan is correct. Four of its five dashboard failures are vacuous; it needs a minimum-rows guard.
- **P2** `seed-scratch-e2e.mjs` prints "All sections completed without errors" while emitting 18 `WARN payroll_line_item … violates not-null` — some `warn()` calls never reach the `errors` array, and `payroll_line_items` is left at 0 rows.

## Environment note

`scratch_boot_d` was cold-rebuilt by a concurrent agent after these measurements were captured (637 → 645 ledger rows, every seeded table back to 0, `streamline_app` grants dropped). The plans are checked in; re-running them needs a re-seed on a clean target, and the report gives the exact command sequence.
