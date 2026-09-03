# 22 — Application security and privacy — current-head audit

**Ticket:** `.scratch/code-release-10-10-v2/issues/22-security-privacy.md` — 1 acceptance criterion (PRD-C003).
**Heads audited:** frontend/root and backend both `66f09164f`, branch `release/code-10-10-v2`.
**Date:** 2026-09-03. **No prior report existed for this ticket; every number below was gathered in this pass.**
**Read-only:** no source file was edited. This report is the only file written.

---

## 0. The criterion, and what it actually asks

> **PRD-C003** — **Authorization/security:** complete v2 ticket 22's live BOLA/IDOR, valid mutating-body,
> same-tenant control, abuse-protection and privacy criteria.

The ticket's own status admits the gap it leaves: *"REMAINS: the individual live-BOLA, mutating-body and
privacy criteria were not re-audited item by item — only observed green as a whole."* PRD-C003 is the
release-level restatement of **PRD-C081** (PRD line 286):

> Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and
> public/share-token paths; cross-tenant misses return 404.

So the criterion decomposes into five dimensions, walked in order in §2: **live BOLA/IDOR**,
**valid mutating body**, **same-tenant control**, **abuse protection**, **privacy**.

---

## 1. What I read, with numbers

### 1.1 Documents
| source | size |
|---|---|
| `issues/22-security-privacy.md` | read in full — 1 criterion, 1 completion-evidence block |
| `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` | PRD-C003 (line 24), PRD-C081 (line 286), §5–§8 context |
| `TRACEABILITY.md` | line 16 — PRD-C003 → ticket 22, sole owner |
| v1 `issues/15-bola-idor-sweep.md` | read in full — 31 KB, 6 boxes, the sweep's whole history |
| v1 `reports/15h-every-object-addressable-route-probed.md` | read in full — the last full live run |

### 1.2 Backend security corpus at head
| population | measured |
|---|---:|
| files under `test/security/` | **63** |
| jest suites under `test/security/` | **44** |
| tests in those suites | **604** |
| lines of security test/harness code | **14,751** |
| suites matching `--testPathPattern=security` (repo-wide) | **56** (768 tests) |
| controller handlers parsed by `route-surface.ts` at head | **3,633** |
| **object-addressable routes** (`pathParams.length > 0`) | **1,929** — DELETE 311 · GET 522 · PATCH 431 · POST 642 · PUT 23 |
| route classification (all handlers) | public 241 · universal 100 · permissioned 3,232 · in-service 60 |
| operations in `openapi.json` | **3,644** across **2,701** paths |
| rate-limit tiers declared (`rate-limit.service.ts`) | **101** |
| GDPR module | **41 files / 9,969 lines / 8 routes** |
| pinned BOLA defects (`live/known-no-404.json`) | **30** — no404 23 · serverErrors 4 · leaks 2 · inconclusive 1 |

The object-addressable denominator **1,929 reproduces 15h's exactly**, so the sweep's denominator has not
moved — but its *membership* has (§2.1).

### 1.3 Live-database work
All against the local `scratch_head_1010` (journal head, 944 tables). Every write was inside a
`BEGIN … ROLLBACK`; nothing was left behind, and the remote Neon branch was never written to.

---

## 2. Per-criterion assessment

### PRD-C003 — status: **PARTIALLY MET**

Walked dimension by dimension.

---

#### 2.1 Live BOLA/IDOR — **NOT MEASURED at head; last real evidence is one commit-generation stale**

**The harness is sound.** `test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts` (886 lines) plus
`live/probe-plan.ts` (321) is the best-built thing in this ticket's territory:

- `score()` (`probe-plan.ts:230`) refuses to grade any route whose own-tenant control did not answer 2xx —
  the anti-vacuity rule that matters most here.
- A 403 is scored `EXISTENCE-ORACLE`, not a pass (`probe-plan.ts:250`).
- `disambiguate()` (`probe-plan.ts:293`) pays for a **third** request with an id belonging to *no*
  organisation, so a handler that answers 200 for everything is `NO-404`, not a false `LEAK`.
- Mutating verbs run the probe **before** the control, so a control DELETE cannot make its own route pass.
- `MIN_SCORED` (default 200) fails the suite if the scored population collapses.
- Every pin in `known-no-404.json` must carry a ≥20-character `_reasons` entry or the suite fails —
  the pin file cannot be padded silently.

**What is missing is the run.** The last full live run is 15h's `bola-head-full.json`: 1,929 routes,
`PASS 681 · NO-404 29 · SERVER-ERROR 6 · LEAK 4 · INCONCLUSIVE 1 · UNPROBEABLE 1,208`, i.e.
**35.3 % probed-and-correct, 2.1 % probed-and-defective, 62.6 % never asked.** Two problems at head:

1. **The artifact is in neither repository.** `find` across both repos for `bola-live*` returns only the two
   spec files. `known-no-404.json:_measured` cites `bola-head-full.json`, which does not exist here. v1
   ticket 15 flagged this ("ARTIFACT WARNING") and it was never fixed. The evidence for the release's
   single largest security claim is unrecoverable from the repositories.
2. **The route set has moved under it.** `8f37e580e` added
   `PATCH` + `DELETE /calendar/events/:eventId/occurrences/:occurrenceStart`; both are in the
   object-addressable set at head (verified by running `objectAddressableRoutes()`), and neither has ever
   been probed. The total stayed at 1,929 only because two other routes left.

**NOT MEASURED, and precisely what would measure it:**
`BOLA_DB=<two-tenant scratch copy> BOLA_LIVE_ARTIFACT=<path> BOLA_LIVE_MIN_SCORED=400 node
./node_modules/jest/bin/jest.js --config ./jest-e2e-seeded.json --forceExit --runInBand
--testPathPattern=bola-live-cross-tenant` — 15h clocked **3,649 s** of wall time against a booted API on a
seeded two-ENTERPRISE-tenant database. That is out of budget with 26 agents on 15 cores, and the seeded
database it needs (`scratch_t15r2`) is not one of the two provided.

**What I could verify statically:** the 11 `/build/:projectId/*` defects that 15h left open as
residual **R-4e are FIXED at head** — `ProjectsMembersService.assertProjectAccess`
(`src/modules/build/core/projects-members.service.ts:113-117`) now resolves the project under `u.orgId`
*before* the `isOrgOwner` / `build:manage` short-circuits, and
`test/security/bola/bola-build-project-binding-404.spec.ts` covers all eleven. The pin file still lists
them (finding F6). The in-scope public defect **R-4f is NOT fixed** (finding F3).

---

#### 2.2 Valid mutating body — **MET**

This was the harness's biggest historical hole (468 routes never asked because the probe sent `{}`), and it
is genuinely closed at head:

- `live/body-synthesis.ts` (410 lines) derives a minimal valid body **and** the required query parameters
  per route from `openapi.json`.
- Every `Outcome` records `bodySource` (`bola-live-cross-tenant.seeded-e2e-spec.ts:163`), so a route probed
  with a synthesised body can never be confused with one probed with `{}`; a schema that cannot be satisfied
  yields `UNPROBEABLE` with its own reason, never a request that will 400 and be counted as asked.
- Each of the three requests gets a *distinct* body (`bodyFor()`, line 623), because a constant body
  collided with `uniq_ticket_labels_org_name` and scored a clean route as `LEAK`.
- There is a harness proof — a control that rejects `{}` must accept the derived body — asserted, not
  assumed (`…seeded-e2e-spec.ts:783`).
- Offline: `bola-body-synthesis.spec.ts` (452 lines) is **green at head** (measured, §3).

---

#### 2.3 Same-tenant control — **MET as a rule, LARGELY UNSATISFIED as a fact**

The **rule** is correct and enforced in code: `score()` returns `UNPROBEABLE` for any control outside 2xx,
so a 404 from an unrouteable path / rejected id / missing permission / disabled module can never be counted
as a pass. `bola-live-probe-plan.spec.ts` (241 lines) unit-tests that classifier independently of the runner.

The **fact** is that at the last real measurement, **62.6 % of the surface had no working same-tenant
control**: 355 controls answered 404, 195 answered 400, 51 answered 500, 43 answered 403, 30 answered 409,
30 answered 402, 12 answered 401. 15h names the binding cause honestly (residual **R-4c**): with
contract-derived bodies the sweep now performs ~1,900 real mutations against one database while its borrow
pool is snapshotted once before the first of them, so it consumes the objects its later routes need.
Control-404 rose 135 → 355 *because* the body synthesis worked.

That is a harness-reach problem, not a product defect — but the criterion asks for same-tenant control
evidence, and the honest reading is that **721 of 1,929 routes (37.4 %) have a demonstrated working
same-tenant control** and the rest do not. NOT re-measured here (same blocker as §2.1).

---

#### 2.4 Abuse protection — **NOT MET. Two live defects, one measured end-to-end.**

**F2 — every unauthenticated rate limit is bypassable by rotating `X-Forwarded-For`.** Measured (§3.4):
with a fixed header, 150 requests against a 30-request budget → **120 blocked with 429**. With a rotating
first hop, the same 150 requests → **0 blocked**. `extractClientIp` (`rate-limit.guard.ts:8-13`) and its twin
`resolveClientIp` (`common/http/client-ip.ts:5-10`) both take `x-forwarded-for.split(",")[0]` — the
**leftmost** entry, which is the one a client supplies — and there is **no `trust proxy` setting anywhere in
the backend** (`grep -rn "trust proxy\|trustProxy" src` → 0 hits; `main.ts` never touches the adapter's proxy
config). This is wrong under both deployment shapes: with an appending proxy the leftmost hop is
attacker-controlled, and with no proxy the header should not be read at all.

The existing spec looks like it covers this and does not. `rate-limits-and-brute-force.spec.ts:212` is
titled *"x-forwarded-for spoofing with a list uses the first hop, not the whole header"* and asserts that
**the same** first hop maps to the same bucket. It never asks the attacker's question — a **different** first
hop each request. The one rotation test in the file (line 197) is the authenticated case, which is keyed by
user id and genuinely safe.

**F3/F4 — unauthenticated writes with no limiter, and a limiter that exists but is not wired.**
`rate-limit-coverage.spec.ts:117-127` pins **4 unlimited public writes** by name at head:
`POST /internal/audit` (the fourth `INTERNAL_API_SECRET` route — the other three were limited *precisely*
because a leaked shared secret is otherwise unbounded), `POST /careers/apply` (the tier
`"public:job-apply": 3/hour` is **declared and referenced by no route**), `POST /csat/:surveyId/responses`
(its sibling CSAT controller *is* limited), and `POST /crm/mailboxes/push` (CRM — excluded scope). The spec
records them rather than failing, which keeps the count from growing silently but leaves them open.

**What head does get right here:** unknown/typo'd tiers **deny** (`rate-limit.service.ts:186`, SEC-004),
and that is behaviourally tested, not string-matched. `check:log-secrets` verifies all 101 `@UseRateLimit`
keys exist in `TIERS` over 3,658 files. `auth:login` is declared with no route and the comment explains
why (magic-link + Google are the only credential paths) rather than leaving a phantom limiter.

---

#### 2.5 Privacy — correction, export, erasure, retention, secret handling — **NOT MET. One P0.**

**Surface:** `src/modules/gdpr` — 41 files, 9,969 lines, 8 routes
(`export/me`, `rectification/me`, `export/:personId`, `export-async/me`, `export-async/:personId`,
`export-async/:jobId/status`, `export-async/:jobId/download`, `erasure/:subjectId`).

**Export — correct.** `GdprService.exportSubjectData` (`gdpr.service.ts:20-49`) refuses `scope === "none"`,
requires `all` to export anyone but the caller, and resolves the subject through
`organization_members` bound to `callerOrgId` before touching `users`. The synchronous export declares its
own incompleteness in `exportIncomplete` rather than silently truncating. `POST /gdpr/export-async/:personId`
repeats the scope check at the controller (`gdpr.controller.ts:126-129`). `hr:retention:manage` is declared
non-scopable (`hr-enterprise.permissions.ts:28-34`), so `req.rbacScope` resolves `all` and the checks are
belt-and-braces rather than load-bearing — that is the right direction.

**Correction — correct.** `POST /gdpr/rectification/me` is the caller's own profile only, carries
`@Idempotent("gdpr.rectification.profile-name")`, and has dedicated tenant-isolation and
auth-linked-field specs.

**Erasure — one P0 and a great deal that is right.** `GdprSubjectErasureService.eraseSubject`
(`gdpr-subject-erasure.service.ts:88`) does almost everything correctly: the storage manifest is built
**before** the transaction so a nulled `*_key` column cannot orphan its object; the object-store purge runs
**after** commit, so no provider call sits inside a database transaction; a legal hold blocks and reports;
`drainIds` keyset-drains rather than `LIMIT`-ing (a bare limit would report a partial erasure as complete);
three sinks the file-key catalog cannot reach on its own (`gdpr_export_jobs`, `chat_attachments`,
`support_tickets.requester_email`) are each handled with a comment explaining why the catalog misses them.

**And then `anonymiseGlobalIdentity` (`gdpr-subject-erasure-identity.ts:149-166`) asks the one question the
database will not answer.** It reads `organization_members WHERE user_id = subject AND org_id <> callerOrg`
on `tx` — the request's **tenant** transaction. The RLS policy on that table is
`(org_id = app.current_org_id_or_null()) OR (user_id = app.current_user_id_or_null())`, and on this path
`app.user_id` is **never set** (`set_config('app.user_id', …)` exists in exactly one place,
`with-identity.ts:28`, which this path does not call). Both disjuncts fail for the subject's other-org
membership, the guard sees zero rows, and the global `users` row is destroyed. **Measured, §3.3.**

The repository already knows the right shape: `org-membership-access-revocation.ts:321-343` asks the
identical question and wraps it in `runOutsideTenantContext(() => withIdentity(this.db, memberUserId, …))`.
`org-lifecycle.service.ts:95` and `org-purge.service.ts:118` likewise reach it through `withIdentity`.
**Three of the four cross-org membership reads in the codebase are context-correct; the GDPR one is not.**

**Retention — measured green, small denominator.** `check:retention-coverage` at head: 14 high-growth
tables, **8 covered** (each naming a `Cron*RetentionService`), **6 KEEP-FOREVER** with a stated statutory
reason, **0 uncovered**. Caveat: the gate's population is "tables over 1 MB on the connected database" —
14 of 944 — so it is a real result over a small corpus, not a statement about the schema.

**Secret handling — green.** `check:log-secrets` (3,658 files) and `check:hardcoded-secrets`
(16,099 files, 0 committed credentials) both pass; `.env` is gitignored in both repos and only `.env.example`
is tracked. `check:public-object-urls` passes with five declared, reasoned exemptions.
`common/db/bulk-update.ts` — the `sql.raw` finding the ticket says it hardened — **is genuinely hardened at
head**: cast type names must match `POSTGRES_TYPE_PATTERN` *and* be a type the target table's own Drizzle
columns declare (`scopeFor`/`assertPostgresType`, lines 80-102), and every identifier must be a real column
(`assertKnownColumn`, line 104).

---

## 3. Measurements taken in this pass

### 3.1 `test/security` — **RED at head**
```
node ./node_modules/jest/bin/jest.js --runInBand --testPathPattern="test/security/" --silent
Test Suites: 1 failed, 43 passed, 44 total
Tests:       1 failed, 603 passed, 604 total
```
Repo-wide: `--testPathPattern="security"` → **1 failed, 55 passed, 56 total; 767/768 tests.**
The ticket's headline claim ("0 failed / 604 passed / 604 total (44 suites)" and
"56 suites / 768 tests / 0 failures") **does not hold at head.**

Failure: `test/security/bola/bola-body-id-binding.spec.ts:127` — `expect(counts.operations).toBe(3642)`,
received **3644**.

### 3.2 The cause, confirmed independently
```
python3 -c "…json.load(open('openapi.json'))…"  ->  3644 operations across 2701 paths
git show 8f37e580e  ->  "regenerate openapi.json for two agents' contract changes"
new path: /calendar/events/{eventId}/occurrences/{occurrenceStart}  ->  patch (with requestBody), delete
```
Not a stale jest cache — the contract really grew by two operations and the pin was not moved.

### 3.3 RLS blinds the GDPR global-identity guard — **proved**
Run against `scratch_head_1010` inside `BEGIN … ROLLBACK`, reusing two existing organisations and one
synthetic user with a membership in **both**:
```
OWNER (RLS bypassed) sees other-org memberships:                              1
APP ROLE tenant=orgA, app.user_id UNSET -> other-org memberships visible:     0     <-- the guard's view
CONTROL app.user_id=subject -> visible:                                       1     <-- what withIdentity buys
SANITY app role can see its OWN org membership:                               1     <-- the query works
```
`SET LOCAL ROLE streamline_app` (`rolbypassrls = f`), `set_config('app.organization_id', orgA, true)`,
`app.user_id` deliberately unset — the exact context `eraseSubject`'s transaction runs in.
Policy read from the live catalog: `tenant_isolation` on `public.organization_members`,
`(org_id = app.current_org_id_or_null()) OR (user_id = app.current_user_id_or_null())`,
`relrowsecurity = t`, `relforcerowsecurity = f`. `public.users` has **no** RLS (`relrowsecurity = f`),
so the destructive `UPDATE` itself is unimpeded.

### 3.4 `X-Forwarded-For` rotation defeats the limiter — **proved**
Driving the real `RateLimitGuard` + `RateLimitService` (no Redis, in-memory path), tier `auth:magic-link`,
effective limit 30:
```
FIXED    X-Forwarded-For: 150 requests -> 120 blocked with 429
ROTATING X-Forwarded-For: 150 requests ->   0 blocked with 429
```

### 3.5 Gates run (all green unless noted)
| gate | result |
|---|---|
| `check:tenant-relationships` (owner URL) | 681/681 journal entries on target; 214 single-col FKs; **0 actionable** |
| `check:audit-log-privileges` (non-owner URL) | `{"role":"streamline_app","isAppRole":true,"updateRevoked":true,"deleteRevoked":true,"triggerPresent":true}` |
| `check:retention-coverage` | 14 high-growth / 8 covered / 6 keep-forever / **0 uncovered** |
| `check:log-secrets` | 3,658 files, 101 TIERS entries, 23+18 redactor names — OK |
| `check:hardcoded-secrets` | 16,099 files, **0** committed credentials |
| `check:public-object-urls` | OK — no upload path mints a permanent public URL |
| `check:authz-deny` | pass. **925 / 3,237 gated handlers (29 %) carry a declared deny test**; uncovered 2,312 vs ratchet 2,441 |
| `check:route-access-contract` (FE) | 26 nav sources, 204 permission keys, 633 `x-permission` — pass |
| `check:permission-binding` (FE) | 2,386 bindings checked, 13 held-back and accounted, **0 unaccounted** — pass |

### 3.6 Frontend transport hardening (read, not fuzzed)
`frontend/next.config.ts:156-205` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, conditional HSTS
(`max-age=63072000; includeSubDomains; preload`), COOP/CORP, and a CSP with `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'` and **no `unsafe-inline`/`unsafe-eval` in production**
(`buildContentSecurityPolicy`, line 40). Two hardening notes, neither a finding: there is no
`frame-ancestors` directive (XFO `DENY` covers every current browser), and `connect-src` includes the bare
scheme-source `wss://`, which permits any WebSocket origin.

---

## 4. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| F1 | **P0** | `streamlineos-backend/src/modules/gdpr/gdpr-subject-erasure-identity.ts:153` | GDPR erasure destroys a multi-org user's global identity: the "does another membership survive?" guard is RLS-blind |
| F2 | **P1** | `streamlineos-backend/src/common/ratelimit/rate-limit.guard.ts:11` | Every unauthenticated rate limit is bypassed by rotating `X-Forwarded-For`; no `trust proxy` anywhere |
| F3 | **P1** | `streamlineos-backend/src/modules/public/public.controller.ts:238` | `POST /public/intake/:projectId` — unauthenticated write into any tenant's project, addressed by a sequential integer, and a platform-wide project-id existence oracle |
| F4 | **P1** | `streamlineos-backend/src/common/ratelimit/rate-limit-coverage.spec.ts:117` | Three in-scope unauthenticated/secret-gated writes carry no limiter at all; `public:job-apply` is declared and wired to nothing |
| F5 | **P2** | `streamlineos-backend/test/security/bola/bola-body-id-binding.spec.ts:127` | `test/security` is red at head (3,642 vs 3,644); two new calendar operations, one with a body, were never swept for body-id binding |
| F6 | **P2** | `streamlineos-backend/test/security/bola/live/known-no-404.json:8` | The BOLA ratchet pins 11 build routes that are fixed at head, and cites an artifact present in neither repository |
| F7 | **P2** | `streamlineos-backend/test/security/public-token-controls.spec.ts:56` | The public/share-token security suite is 100 % source-string matching — it cannot fail on a behavioural regression |
| F8 | **P2** | `streamlineos-backend/src/modules/gdpr/gdpr-subject-erasure.spec.ts:455` | The erasure guard's "bite proof" injects a row RLS makes unreachable, so it is green over exactly the F1 defect |

### F1 — P0 — GDPR erasure destroys a multi-org user's global identity
**`gdpr-subject-erasure-identity.ts:153-164`** (reached from `gdpr-subject-erasure.service.ts:184`,
route `POST /gdpr/erasure/:subjectId`, `gdpr.controller.ts:180`).

**Failure scenario.** Alice is a member of Org A and Org B. Org A's HR admin (holding
`hr:retention:manage`) calls `POST /gdpr/erasure/<alice>`. `eraseSubject` runs inside the request's tenant
transaction (`this.db` is the tenant-aware proxy, `tenant-db.ts:16-23`, so `db.transaction` becomes a
savepoint on the connection whose `app.organization_id` is Org A). `anonymiseGlobalIdentity` asks for
Alice's memberships outside Org A. Under the `organization_members` RLS policy with `app.user_id` unset,
that query returns **0 rows** (measured, §3.3). The guard reports "no surviving membership" and the shared
global `users` row is rewritten: `email` → `erased-<hash>@erased.invalid`, `name`/`firstName`/`lastName` →
`"ERASED"`, `phone`/`dateOfBirth`/`image`/`bio`/social/`metadata` → `null`. `sessionsService
.revokeAllForUser` then kills Alice's Org B sessions. **Alice loses her identity and her ability to sign in
to Org B, and Org B's admins have no record of why.** The operation is irreversible and the audit row
written names only Org A.

**Precondition, stated honestly.** This bites when the application connects as a role **without**
`BYPASSRLS`. Today `backend/.env` points `DATABASE_URL` at `neondb_owner`, and the file's own comment says
so: *"RLS policies are inert under the owner … APP_DATABASE_URL is deliberately unset."* So it does not fire
in the current dev deployment. It fires the moment tenant isolation is turned on for real — which is what
`CLAUDE.md:49-50`, `check:audit-log-privileges`, `check:module-lifecycle` and v2 ticket 34's cutover all
require. A defect that activates precisely when the intended security posture is enabled is a P0 for this
release, not a latent note.

**Proposed fix.** Ask the question in the context that can answer it, using the template the repo already
has at `org-membership-access-revocation.ts:335`: hoist the surviving-membership check out of
`anonymiseGlobalIdentity` into `eraseSubject` **before** the transaction, as
`await runOutsideTenantContext(() => withIdentity(this.db, subjectUserId, (tx) => …))`, and pass the boolean
in. Then add a seeded assertion (not a fake-db one) that runs as `streamline_app` with the org GUC set and
proves the global row survives when a second membership exists — the current unit spec cannot see this.

### F2 — P1 — rotating `X-Forwarded-For` defeats every unauthenticated rate limit
**`rate-limit.guard.ts:8-13` and `:30`**, and the identical helper at **`common/http/client-ip.ts:5-10`**.

**Failure scenario.** An attacker sends `POST /auth/magic-link` (or `/auth/email-otp`, `/auth/register`,
`/public/intake/:projectId`, `/public/forms/:token/submit`, `/billing/webhook`, …) with
`X-Forwarded-For: 198.51.100.<i>` incrementing per request. Each value is a fresh limiter bucket, so the
declared 3/min becomes unbounded. Measured: **150 requests, 0 blocked** (§3.4), against 120 blocked with a
fixed header. This removes the only abuse control on magic-link issuance (an email-flood / user-enumeration
amplifier), on registration, and on every `@Public()` write.

**Proposed fix.** Set the Express trust-proxy setting explicitly in `main.ts` to the deployment's real hop
count (`app.set("trust proxy", <n>)`) and derive the identifier from `req.ip` alone, deleting the raw header
read from both `extractClientIp` and `resolveClientIp`. Where no proxy is present, `trust proxy` must be
`false` and the header must not be consulted at all. Then invert the existing spec: add a test that rotates
the first hop and asserts the 429 still arrives — the current
`rate-limits-and-brute-force.spec.ts:212` asserts the opposite-signed property and reads as coverage.

### F3 — P1 — `POST /public/intake/:projectId` is an unauthenticated cross-tenant write and an enumeration oracle
**`src/modules/public/public.controller.ts:238-248`**, service at **`src/modules/public/intake.service.ts:14-19`**.

**Failure scenario.** The route takes a sequential integer project id through `ParseIntPipe` with no token
and no per-project "public intake enabled" flag. `app.resolve_project_org_id` is `SECURITY DEFINER`
(confirmed: `prosecdef = t`) and returns `org_id` for **any** project in `build.projects`, bypassing RLS.
A project id that exists answers **201**; one that does not answers **400 "Invalid request"**. So an
unauthenticated caller (a) enumerates which project ids exist across the entire platform by walking
integers, and (b) writes an `intake_items` row into **any tenant's** project, unauthenticated. Every sibling
public form on the same controller — `forms/:token`, `lead-form/:token`, `nps/:token`,
`vendor-portal/:token`, `external-referral/:token` — is addressed by an unguessable token instead. The
5/hour limiter is the only brake, and F2 removes it.

**Proposed fix.** Address the intake form by an unguessable per-project token, exactly as the five sibling
routes on the same controller already do, and return the same status for a token that does not resolve as
for one that does not exist. If the integer route must survive for existing embeds, gate it on a
`projects.public_intake_enabled` flag and make the not-enabled and not-found answers identical.

### F4 — P1 — three in-scope unauthenticated writes have no limiter; one declared tier is wired to nothing
**`src/common/ratelimit/rate-limit-coverage.spec.ts:117-127`** pins them at head.

**Failure scenario.** `POST /careers/apply` — the tier `"public:job-apply": { limit: 3, windowSecs: 3600 }`
exists in `TIERS` (`rate-limit.service.ts:131`) and **no route references it**, so an unauthenticated caller
floods any organisation's ATS without limit. `POST /csat/:surveyId/responses` is unlimited while its sibling
`support-csat.controller.ts` is limited at 5/hour, so survey results are trivially ballot-stuffed.
`POST /internal/audit` is the fourth `INTERNAL_API_SECRET` route; the other three were limited *because* a
leaked shared secret is otherwise unbounded, and a leaked secret here floods the audit log — the one table
whose integrity `check:audit-log-privileges` exists to protect. (`POST /crm/mailboxes/push` is the fourth
pin and is CRM, out of scope.)

**Proposed fix.** Wire `@UseGuards(RateLimitGuard) @UseRateLimit("public:job-apply")` onto
`CareersController.apply`; add a `csat:submit` tier matching the support sibling's 5/hour; add an
`internal:audit` tier at the same order as `webhook:email` (600/60). Then tighten
`rate-limit-coverage.spec.ts` so the allowlist can only shrink.

### F5 — P2 — the security suite is red at head, and two operations were never swept
**`test/security/bola/bola-body-id-binding.spec.ts:127`.** `expect(counts.operations).toBe(3642)` against a
contract that now holds 3,644. The pin is doing its job — it noticed — but nobody moved it, so ticket 22's
recorded evidence ("0 failed") is false and the two new operations
(`PATCH`/`DELETE /calendar/events/{eventId}/occurrences/{occurrenceStart}`, the PATCH carrying a request
body) have never been checked for body-id binding. **Fix:** re-run the enumeration, update the three pinned
counts with the id-shaped-field deltas, and confirm the new PATCH's body ids are read back under the
caller's org.

### F6 — P2 — the BOLA ratchet is stale and cites an artifact that does not exist
**`test/security/bola/live/known-no-404.json`.** Eleven `/build/:projectId/*` entries (5 `no404` GETs, 2
`no404` POSTs, 4 `serverErrors`) are fixed at head — `projects-members.service.ts:113-117` resolves the
project before the owner/`build:manage` short-circuits, and `bola-build-project-binding-404.spec.ts` covers
all eleven with refusal-class assertions. The suite reports healed pins rather than failing, so this is not
a false red; it is stale evidence that will mislead the next reader into hunting fixed defects. Worse,
`_measured` names `bola-head-full.json`, which `find` locates in neither repository — the raw evidence for
"681 of 1,929 probed and correct" cannot be re-derived. **Fix:** commit the artifact (or a per-route digest
of it) into `test/security/bola/live/`, and delete the eleven build pins in the same commit that re-runs
the sweep.

### F7 — P2 — the public/share-token security suite cannot fail on a behavioural regression
**`test/security/public-token-controls.spec.ts`** — 150 lines, ~13 tests, self-described as *"Static
verification … reads source files as strings."* Every assertion is a regex over source text:
`expect(guardSrc).toMatch(/expiresAt/)` passes on a comment; `toMatch(/gt\s*\(|isNull\s*\(/)` passes on any
predicate over any column; `expect(rateLimitSrc).toMatch(/SEC-004/)` asserts that a **comment** exists. The
underlying controls are in fact correct (`agent-token.guard.ts:58-59` really does bind
`isNull(revokedAt)` and `or(isNull(expiresAt), gt(expiresAt, now))`), so nothing is broken today — but
public/share-token paths are one of the six surfaces PRD-C081 enumerates, and this is the suite that claims
them. Ticket 22 swept exactly this shape out of `webhook-url-guard`, the CSRF leg and `upload-controls`
(which is now genuinely behavioural, with a CONTROL test at line 392) and left this one. **Fix:** drive the
guard and the token service the way `upload-controls.spec.ts:331-392` drives the storage controller —
an expired token must be refused, a revoked one refused, the 11th token refused, and a control valid token
accepted.

### F8 — P2 — the erasure guard's bite proof is green over the F1 defect
**`src/modules/gdpr/gdpr-subject-erasure.spec.ts:455`** — *"(bite proof) globalIdentityAnonymised is false
when subject has another membership"* — works by setting `otherMemberRows = [{ id: 99 }]` on a fake `Db`.
That is the row RLS guarantees the real database will never return (§3.3). The mechanism comment even
describes the neuter correctly; it is the *fixture* that is impossible. Line 723's
*"revokes sessions even when the subject still has memberships in other orgs"* describes a state that
cannot occur in production for the same reason. **Fix:** move both to a seeded spec that runs as
`streamline_app` with the tenant GUC set; the fake-db version should be kept only as a unit test of the
branch, retitled so it no longer claims to be a bite proof.

---

## 5. What head already gets right

- **The BOLA classifier is the best-designed thing in this territory.** A 403 is a finding, not a pass; an
  ungraded same-tenant control is `UNPROBEABLE`, never a pass; a third absent-id request separates a real
  disclosure from a route that never resolves its path object; `MIN_SCORED` fails a collapsed run; every
  pin needs a written reason or the suite fails. 15h's bite proof (planting a `ForbiddenException` in
  `AccountingLedgerService.getJournalEntry` in a temp tree, exit 0 → exit 1) proves the detector across a
  real process boundary.
- **Body synthesis is complete and self-proving** — 1,362/1,362 JSON-bodied operations get a derived body,
  `bodySource` is stamped on every outcome, and the "empty body 400 → derived body 2xx" proof is asserted
  rather than assumed.
- **The eleven `/build/:projectId/*` defects are genuinely repaired** and covered by refusal-class
  assertions, not status-code assertions.
- **`sql.raw` in `bulk-update.ts` is properly fenced** — cast names must be types the target table's own
  Drizzle columns declare, identifiers must be real columns, both derived at import time from the schema
  and never from a request.
- **The API carries no ambient cookie credential**, so CSRF is structurally impossible rather than
  defended (`secrets-cookies-and-keys.spec.ts:247-275`).
- **Unknown rate-limit tiers deny** rather than allow (SEC-004), tested behaviourally.
- **GDPR export and rectification enforce scope correctly**, and the export declares its own incompleteness
  instead of silently truncating.
- **The erasure sequencing is careful in every respect except F1**: manifest before the transaction, purge
  after commit, keyset drains rather than bare limits, three catalog-invisible sinks handled explicitly,
  legal hold honoured.
- **`upload-controls.spec.ts` is behavioural** — allowlist, size limit at the exact byte, quota before the
  object store, magic bytes before the scan, scanner-unavailable fails closed, and a CONTROL case proving
  the denials are not a blanket 404.
- **Tenant-isolation infrastructure is clean at head**: `check:tenant-relationships` 0 actionable over 214
  single-column FKs, `check:audit-log-privileges` confirms UPDATE and DELETE are revoked from the app role
  with the tamper trigger present, `check:retention-coverage` 0 uncovered, `check:hardcoded-secrets` 0 over
  16,099 files, and `.env` is gitignored in both repos.
- **Frontend transport headers are production-grade** — no `unsafe-inline`/`unsafe-eval` in production CSP,
  `object-src 'none'`, `base-uri`/`form-action` locked to self, HSTS with preload, XFO DENY, COOP/CORP.

---

## 6. Blocked on infrastructure

1. **The live BOLA/IDOR re-run at head.** Needs a two-ENTERPRISE-tenant seeded scratch database (15h used
   `scratch_t15r2`, a `TEMPLATE scratch_t15` copy with 8 organisations), a booted API on the non-owner role,
   a placeholder `AUTH_SIGNING_KEYS` keyring, and ~1 hour of exclusive wall clock. Neither
   `scratch_head_1010` nor `scratch_cold_1010` carries the seeded tenants, and the run is far outside the
   26-agent laptop budget. **This is the single largest unmeasured item in the ticket.**
2. **`t15-own-tenant-500.seeded-e2e-spec.ts`** — the 88-route own-tenant-500 replay (26 were still open at
   15f). Same seeded-database blocker.
3. **`gdpr-export-cross-module-privacy.seeded-e2e-spec.ts`** — the cross-module export privacy check. Same
   blocker.
4. **End-to-end HTTP confirmation of F2 and F1.** Both were proved at the layer where the decision is made
   (the guard for F2, the SQL policy for F1) rather than through a booted API. Closing them properly needs
   the same seeded stack as (1).
5. **`check:alert-ack`** remains unrunnable platform-wide (needs a real `ALERT_WEBHOOK_URL` and a human
   acknowledgement); not specific to this ticket.

---

## 7. Verdict

**PRD-C003 is PARTIALLY MET and must not be ticked.**

- **Valid mutating body** — met.
- **Same-tenant control** — the rule is enforced in code and unit-tested; as a fact, only 37.4 % of the
  object-addressable surface has a demonstrated working control, and that number is one commit-generation
  stale.
- **Live BOLA/IDOR** — not re-measured at head; the last real artifact is absent from both repositories and
  its route set no longer matches head. Eleven of its open defects are fixed; one in-scope public defect
  (F3) is not.
- **Abuse protection** — not met. F2 removes every unauthenticated limit; F4 leaves three in-scope writes
  with none at all.
- **Privacy** — not met. F1 is a P0 cross-tenant identity destruction that activates exactly when the
  release turns tenant isolation on, and the spec that should catch it (F8) is green over it.

The ticket's own recorded evidence ("`test/security` … 0 failed / 604 passed"; "56 suites / 768 tests /
0 failures") is **false at head** — both runs are one suite red (F5).
