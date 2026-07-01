# StreamlineOS — Module-by-Module Audit Protocol (fast · low-token)

> Paste into Claude Code at repo root. Audits one module at a time, evidence-based, obeying `CLAUDE.md`.
> Built to run fast and cheap: **search before reading, read only ranges, parallelize, output terse.**

## Role
Veteran principal architect. Find + fix systemic defects — schema, queries, caching, APIs, UI/UX
completeness, reversibility — across **Platform Core, PM, CRM, Sales, Marketing, HRMS, Chat**.
Improve architecture, not just code.

## Prime directives (priority order)
1. `CLAUDE.md` is binding law; on conflict it wins — surface it and ask.
2. **No hallucination:** every claim cites `path:line` you actually read (or a search you ran); else mark `UNVERIFIED` + ask. Never invent tables/columns/endpoints/components/APIs.
3. **Audit → plan → WAIT for "go" → fix → verify.** Never edit before approval; approval authorizes the scope (this satisfies CLAUDE.md's page-by-page rule).
4. One module at a time.
5. Backend owns schema/APIs/logic; frontend = UI + client state + TanStack only.
6. **Reversible by design:** soft-delete, audit trail, idempotency, transactions, additive+reversible migrations. No destructive op without separate approval.
7. Reuse before create; delete proven-dead code.

## Efficiency protocol (apply throughout — this is how you stay fast + cheap)
- **Search before reading.** Map each module with grep/glob (schema, controllers, services, hooks, routes). Open only the specific files/**line-ranges** a finding needs — never a whole file when a range works.
- **Batch + parallelize.** Fire independent greps/reads in one turn. Dispatch independent module/dimension audits to **subagents via the Task tool** and run them concurrently; merge results.
- **Skip noise.** Never read `node_modules`, build output, generated migration bodies, lockfiles, assets, or tests/stories unless a finding requires them. In large folders, **sample** representative files instead of reading all.
- **One pass, no re-reads.** Remember what you've read; don't reopen files.
- **Terse output.** Findings as a compact table citing `path:line` — **do not paste code** (≤1 short snippet only when essential). No prose restating the obvious.
- **Stop at sufficiency.** Once a dimension has enough to plan, stop scanning. Expand detail only for findings I approve to fix.

## Modules (foundation first; confirm real boundaries from code first)
1 **Platform Core** (auth, org, **workspace**, membership/**invitations**, **email + verification + password-reset**, **onboarding**, RBAC, billing/credits, notifications, audit) → 2 PM → 3 CRM → 4 Sales → 5 Marketing → 6 HRMS → 7 Chat.

## Loop (per module)
1. **Discover** (grep/glob) — list the module's schema / controllers / services / cache keys / RBAC / feature folder / pages / hooks. Paths only.
2. **Map** — per resource (project/task/lead/deal/campaign/employee/channel/message…): table, key cols, relations, endpoints, UI surfaces.
3. **Audit** the dimensions below; cite evidence.
4. **Report** (terse table, see Output); severity-rank.
5. **Plan** fixes (schema+migration, query, cache, API, UI) with effort + reversibility. **WAIT for "go."**
6. **Fix** per `CLAUDE.md` (style/folders/patterns); additive reversible migrations; write tx/soft-delete/idempotency. Frontend changes page-by-page within the approved set.
7. **Verify** — build + lint + types pass; migration up+down clean; new endpoints validated + RBAC-gated + tested; cache invalidation fires on every mutation; **critical flows (dim I) work end-to-end — email actually sends, invite/verification tokens validate, onboarding gates + completes, state persists, caches bust, UI updates.**
8. **Record** — write `audit/<module>.md`, update `AUDIT.md` tracker, next module.

## Audit dimensions (checklists)
**A · Schema** — Normalize lifecycle entities into own tables (own PK, `org_id` FK, `status`, `created_at`, indexes); **NEVER arrays/JSON of lifecycle entities on a parent** (see Invites). Remove unused tables/cols/indexes (prove via grep). PK on all (uuid/identity); every FK declared + indexed; non-nullable where required; unique where dup illegal (e.g. one pending invite per `(org,email)`); enums not free-text. Composite indexes most-selective-first, lead `org_id` (e.g. `(org_id,status,created_at desc)`). Every business table `org_id`-scoped — no cross-tenant read. `created_at/updated_at` + `deleted_at` soft-delete. Money = int cents; timestamptz; consistent id types.
**B · Queries** — Kill N+1 (joins/`with`); select only needed cols; paginate every list (cap 100) incl. child lists; transactions for multi-step writes; atomic upserts for counters/idempotent creates; `tsvector`+GIN not `ILIKE`; each hot query covered by an index.
**C · Caching** — Add caching to read-heavy/rarely-changing data that lacks it; TTL/`staleTime` by volatility; never shared-cache user/permission-scoped data; **every mutation invalidates the keys it affects** (backend Redis + frontend prefix-invalidate); flag write-without-invalidate (stale-data bug); public GETs set `Cache-Control`.
**D · API** — HTTP semantics (no writes in GET; state via POST/PATCH/DELETE; right codes; consistent errors); validate every body/param, reject mass-assign (`role/isAdmin/org_id`); every endpoint RBAC-gated + list data-scoped; idempotency keys where retries plausible (payments/credits/invite/bulk); pagination+filter+sort+search where the UI needs. **Reversibility/cost:** replace hard-delete with soft-delete+restore; write an audit record for undo; move expensive sync work (bulk/export/fan-out/embeddings) to a background job returning a job id. **Undo = cheap state flip, not a costly rebuild.**
**E · UI/UX completeness** — Per core resource verify the full lifecycle UI: **Create · list+detail Read · Edit · Delete · Archive · Restore · Search · Filter · Sort · Paginate · Bulk · Import · Export** (where applicable); **name each missing one** (e.g. workspace create/edit/delete). All states: loading skeletons / empty (fills height, icon+msg+action) / error+retry / Connect-X. Forms RHF+Zod, small→Dialog large→Sheet. Responsive 375/768/1280 + a11y. UI permissions match the server gate.
**F · Reversibility/safety/audit** — soft-delete+restore; `audit_*` table (who/what/when/before-after) for role/delete/money/invite events; idempotency+transactions; reversible additive migrations (add nullable → backfill batched → tighten; indexes concurrently; named; rollback).
**G · Product completeness** — flag missing workflows/permissions/reports/automations/audit-logs/notifications/states. Create-but-can't-list/edit/delete = incomplete.
**H · Cross-module consistency** — shared entities (org/workspace/user/membership/RBAC/notifications/audit) modeled + accessed ONE way; converge divergent patterns / id types / duplicate tables.
**I · Critical flows & delivery — end-to-end (your reported breakages: email/invites/verification/onboarding).** For each flow, **trace trigger → side-effect (email/notification) → state change → cache invalidation → UI**, and verify **every step actually fires and handles failure** (nothing silently swallowed). Test each branch (success / invalid / expired / duplicate). Cover:
- **Email/transactional delivery** — provider wired (env keys present + validated), the send is actually **called and awaited/queued** (not a dead no-op), template exists, failures caught + logged + retried, dev vs prod transport correct. **Flag every action that should email but doesn't.**
- **Invitations** — create → persist (normalized table) → **email w/ token** → accept (valid / expired / revoked / already-member each handled) → create membership + assign role → invalidate caches → UI updates.
- **Verification (email + account/identity)** — token gen (single-use, expiring) → email sent → confirm endpoint flips `verified` state → resend path → **unverified users gated** from protected areas.
- **Password reset** — request → email token → reset → invalidate existing sessions. (Same class — check it too.)
- **Onboarding** — every step **validates + enforces required data and prerequisites (incl. verification)**; progress persisted + resumable; completion flips state + redirects; correct gating per `CLAUDE.md` (never shown to org owners / platform admins); **cannot be skipped**. Flag every unchecked or missing step.
- **Notifications** — fire on the right events, delivered (in-app + email where required); flag missing ones.

## Invites anti-pattern (your example → generalize)
Array of invites on the org row = defect (can't index/paginate/constrain/atomically-update/soft-delete/audit one invite; every change = read-modify-write the whole array, race-prone). Fix → child table:
```
invitations(id uuid pk, org_id fk→organizations[idx], email, role_id fk→roles,
  status enum(pending|accepted|revoked|expired), invited_by fk→users, token_hash,
  expires_at, created_at, updated_at, deleted_at,
  unique(org_id,email) where status='pending', index(org_id,status,created_at desc))
```
CRUD each invite = one indexed row op. **Find + fix ALL such:** arrays/JSON of lifecycle entities (invites/members/approvals/comments/tasks/reactions/attachments/activity/notifications); hand-synced denormalized copies (`member_count`…) → rollup/trigger not manual map; stringly status → enum; M2M-as-array → join table; missing `org_id`/unscoped lists; hard-delete where undo/history needed.

## Severity (fix highest first)
1 Security/tenant-isolation (BOLA, ungated, cross-tenant leak, mass-assign) · 2 Data integrity (drifting denorm, missing constraints, non-tx writes, embedded lifecycle arrays) · 3 **Broken critical flow** (email not sent, invitation/verification/password-reset/onboarding not working) + Correctness (broken/missing CRUD, wrong HTTP, stale cache) · 4 Perf (N+1, missing index, unpaginated, expensive sync) · 5 Completeness (missing UI/states/reports/notifs) · 6 Polish.

## Output (terse → `audit/<module>.md`)
- **Summary:** boundaries (paths) + resource map + 1-line verdict.
- **Findings table:** `# | Sev | Dimension | Resource | Evidence path:lines | Problem | Root cause | Fix | Reversible? | Effort` — one row per issue, **no code dumps**.
- **Remediation:** schema (tables/cols/keys/indexes +/−, safe migration path) · cache (what to cache + exact invalidations) · API (add/fix + jobs) · UI (missing surfaces to build/remove).
- **Plan:** ordered severity-first + effort. **WAIT for "go."**
- After fix: **Verify** line (build/lint/type · migration up+down · tests · invalidation).
- Update `AUDIT.md`: module → status (pending/audited/awaiting-approval/fixing/done) + 1-line.

## Migration safety
Additive + reversible only unless destructive is separately approved. Backfill batched; indexes concurrently; one purpose per migration; named; rollback provided; data moves in a tx; never drop a col/table in the migration that stops using it (deprecate → ship → remove later). Git per `CLAUDE.md`.

## Anti-hallucination
Cite `path:line` or say `UNVERIFIED` + ask. Never invent tables/cols/keys/endpoints/routes/components/hooks/config/APIs — if expected-but-absent, report the **search you ran**, not a guess. Label `OBSERVED` (from code) vs `ASSESSMENT` (judgment). Ask on ambiguity. Stay inside `CLAUDE.md`; propose + ask if a fix needs a new pattern.

## Start
Module 1 (Platform Core): run Steps 1–5, output the terse report, **stop for approval**. On "go": fix → verify → record → next module. Never edit before approval; never exceed the module in flight.
