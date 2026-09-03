# 15g — the e-sign module, and the sweep extended from the path to the body

Owner: e-sign module + BOLA harness. Repo: `streamlineos-backend`.
Territory held: `src/modules/e-sign/**`, `test/security/bola/**`, `src/test/sql-predicate.ts`.
Two commits: `54c8555f` (e-sign) and `6fc7a55f` (body/query sweep) — SHAs confirmed with
`git show --stat`, both holding only the files named below.

Everything here was measured on this machine on 2026-09-03. The database is the local
`scratch_perf_seed` (journal head, 8 organisations); `DATABASE_URL` was never touched and no R2
bucket was contacted.

---

## Part A — the e-sign module

Report 15e closed three envelope-child list routes and `GET /sign/documents/:documentId/preview`.
It did not sweep the rest of the module, and the triage pass before it recorded e-sign as **not
touched**. This pass read all 12 controllers (50 files, 8,595 lines), all 20 services, and the
public signer-token surface.

### E1 — `POST /sign/envelopes/:envelopeId/ai/summarize` ignored the caller's envelope scope · **FIXED**

`sign:envelope:view` is the only scopable key in the e-sign catalog. `SignAiService.summarizeDocument`
bound `orgId` and nothing else, so a member whose `sign:envelope:view` resolves `own` could hand any
`envelopeId` in the organisation to the model and read the agreement's terms back as a summary.

This is the register #15 shape and the exact shape 15e closed for the source-PDF preview. It was
missed for the same reason: the route reads a *different* table (`sign_documents` through the AI
service) and the earlier detectors ask a per-route question that the org predicate already answers.

Cross-tenant it was never a leak — the org predicate ran. **It is a within-tenant scope escalation,
and the object it hands over is the text of an executed contract.**

Fixed by resolving `resolveEnvelopeViewScope(access, u)` in the controller and asserting the envelope
with `mustGetVisibleEnvelope`. The scope is a **required** parameter, so an unscoped summarize is
unrepresentable rather than merely discouraged, and the refusal reuses the missing-envelope message,
so out of scope, out of tenant and absent are one answer.

### E2 — both admin sweeps ran across every organisation on the platform · **FIXED**

```
POST /sign/admin/run-reminder-sweep    -> SignEnvelopeSweepsService.runReminderSweep()
POST /sign/admin/run-expiration-sweep  -> SignEnvelopeSweepsService.runExpirationSweep()
```

Neither took an `orgId`. `runExpirationSweep` selected `sign_envelopes` by status and `expires_at`
with **no tenant predicate**, then expired the recipients and the envelope. `runReminderSweep`
selected by status and `reminder_enabled`, then **minted a fresh signing token for every recipient it
touched and emailed it**.

Read literally, a holder of `sign:admin:manage` in any organisation expires another tenant's
envelopes and mails that tenant's external signers a new signing link.

**It is not that bad at head, and the reason matters.** Both are reached only from an HTTP handler,
and `createTenantAwareDb` routes `this.db` to the request's tenant transaction, so RLS confines the
read. Measured on `scratch_perf_seed`:

```
sign_envelopes  relrowsecurity=t  policy tenant_isolation: (org_id = app.current_org_id())
```

So the defect was live only in the code, not in the answer — the database was carrying an
authorization decision the application had not made. `backend/CLAUDE.md` §4 says every endpoint
taking a resource id re-asserts access at the data layer; a sweep with no org predicate is one boot
configuration away from being a real cross-tenant write, and nothing in the source says so. `orgId`
is now **required** on both, and the candidate read, the recipient revocation, the token rotation and
the envelope status write all carry it.

### E3 — `POST /sign/templates/:templateId/publish-public-form` 500s on a slug another tenant holds · **FIXED**

`uniq_sign_public_forms_slug` is a **global** unique index — correctly so, the slug is a public URL
and the namespace belongs to the platform. `publishPublicForm` pre-checked it with
`findFirst({ where: eq(signPublicForms.slug, input.slug) })`.

RLS makes that check blind. Both halves proved against the database, each inside a transaction that
was rolled back:

```
-- half 1: the pre-check cannot see another tenant's row
BEGIN; insert org1's form at slug 't15-collide-slug';
       set_config('app.organization_id', <org2>); SET LOCAL ROLE streamline_app;
       SELECT count(*) FROM sign_public_forms WHERE slug='t15-collide-slug';   ->  0
ROLLBACK;

-- half 2: the insert then breaks the global index
ERROR:  duplicate key value violates unique constraint "uniq_sign_public_forms_slug"
```

So the 400 never fired and the **23505 escaped as a 500** — and 500-vs-201 told the caller whether a
slug is taken somewhere else on the platform, which is the oracle the 404 contract exists to prevent
and which `backend/CLAUDE.md` §3 names by SQLSTATE ("Catch 23505 → ConflictException (409), never an
unhandled 500").

The insert is now the only authority and both cases answer the same **409**, which the contract
already declares for this operation. A 23505 raised by any other constraint still propagates — the
catch is `isUniqueViolationOn(err, "uniq_sign_public_forms_slug")`, not a blanket swallow, and two
tests pin that.

### E4 — the watermark policy's scope target · **FIXED** (found by Part B, listed here for cohesion)

`sign_watermark_policies.scope_id` is a polymorphic pointer discriminated by
`scope_type ∈ {tenant, template, envelope}`, and it carries **no foreign key**. `create`/`update`
wrote the caller's `scopeId` straight into the row. Now resolved under the caller's org — 404 on a
miss, and `tenant` scope rejects a scope id instead of silently keeping one.

Not a disclosure: the policy is consumed through `envelope.watermark_policy_id` under an org
predicate, so a foreign `scope_id` was inert. It was a stored dangling cross-tenant reference.

### What the signer-token surface actually does — swept and CLEARED

`@Public() /public/sign/:token/**` is the most dangerous part of the module by construction: a
signing link is meant to work for someone outside the organisation. Eleven routes. Read in full and
pinned by nine executable assertions, all of which pass **before and after** this pass — they are
characterisation, not repair, and the report says so rather than claiming a fix.

- **A token is bound to one envelope.** `withRecipientSession` resolves the recipient by
  `signing_token_hash` and the envelope by `recipient.envelope_id`; every child read binds the
  envelope or the recipient. `getDocumentPreview` refuses a `documentId` attached to another envelope
  and mints no signed URL for it. `setFieldValue` refuses a `fieldId` belonging to a different
  recipient of the *same* envelope and issues no update.
- **It expires.** `tokenExpiresAt` is checked directly in `deriveState`, and `send`,
  `applyRecipientOutcome` and `submitPublicForm` all set it — it is never left null, so the check is
  never vacuous. Envelope-level expiry is separately swept into `status = 'expired'`. Revocation
  (`tokenRevokedAt`) closes the session while the expiry is still in the future, and `complete` and
  `decline` both set it.
- **It cannot be enumerated into a session.** The token is `randomBytes(32)` — 256 bits — stored only
  as a hash, and an unknown token is a 404. Worth recording that the rate limiter is keyed
  `${token}:${ip}`, so it does **not** bite on token enumeration (a new token is a new bucket); it
  does bite on the thing that matters, brute-forcing the access code or OTP for one known token,
  where the key is stable and `MAX_AUTH_ATTEMPTS = 5` locks the recipient out for 15 minutes.
- **RLS backs it.** `sign_recipients` and `sign_public_forms` carry
  `org_id = current_org_id_or_null() OR <token column> = current_public_token_or_null()`, and
  `withPublicToken` sets that GUC to the hash. The public path is the only one that can read those
  rows without an org.

### Deliberately not changed

`SignEnvelopesService.getFull` answers **403** for an in-org envelope outside the caller's scope.
That is a same-tenant refusal (the org predicate runs first, so another tenant's id is already a
404), it matches the chat rule, and `sign-envelope-get-authz.spec.ts` pins it. `GET
/sign/reports/summary` is org-wide under the non-scopable `sign:audit:view` — judged correct in 15e
and unchanged.

---

## Part B — the sweep extended to the request body and the query string

### The gap

Every sweep before this one probes the object id in the URL **path**. A route that correctly 404s on
`/things/:otherOrgThingId` can still accept `{"thingId": <otherOrgThingId>}` in the same request and
act on it, because the tenant predicate was written for the path parameter. `tenant-binding.ts` —
the existing static detector — cannot see it: it asks a **per-route** question and awards
`org-predicate` as soon as *any* read in the handler binds a tenant, which the path parameter's own
predicate always does.

### How the routes were enumerated — so the numbers reproduce

1. `openapi.json`, the committed contract (`check:openapi-coverage` exit 0, 1,371/1,371 mutating
   request schemas), is read. Every operation under a GET/POST/PUT/PATCH/DELETE key is counted:
   **3,613**.
2. Each operation's `application/json` request-body properties and its `in: query` parameters are
   collected, and the ones whose NAME matches `/(?:^|[a-z0-9])(Id|Ids)$/` are kept.
3. `orgId`/`organizationId`/`tenantId` (**12**) and
   `userId`/`actorId`/`createdById`/`authorId`/`currentUserId`/`requesterId` (**95**) are split off.
   Those are the tenant selector and the actor selector `CLAUDE.md` §5 forbids a client to send about
   itself; the question about them is "why is this accepted at all", not "is it resolved".
4. What remains — **1,047 fields (809 body, 238 query) on 667 operations** — is joined to its handler
   through `operationId`, which Nest emits as `<ControllerClass>_<handler>`, and traced field by
   field into the services the handler calls.

Reproduce with `pnpm exec jest --runInBand --testPathPattern=bola-body-id-binding`; the spec pins
every number in this section, so a drift fails rather than being re-narrated.

### Result

| verdict | body | query | total |
|---|---:|---:|---:|
| `org-predicate` — resolved under the caller's org | 247 | 35 | **282** |
| `object-assertion` — handed to a `mustGet*`/`assert*` resolver | 9 | 0 | **9** |
| `filter-in-org-query` — used only as a predicate inside an org-bound query | 6 | 89 | **95** |
| `path-parameter` — the same name is also a path segment, already swept | 3 | 0 | **3** |
| **`written-unresolved` — reaches a row as a reference, never read back** | **209** | 0 | **209** |
| `unresolved` — used, but no tenant binding found | 146 | 28 | **174** |
| `never-read` — the DTO declares it and no reachable code reads it | 184 | 85 | **269** |
| `handler-not-found` — a blind spot, named individually | 5 | 1 | **6** |

**209 findings**, all in the body. `filter-in-org-query` is a pass and not a fudge: a foreign id used
as a predicate inside a query that also binds `org_id` matches no row, so it narrows rather than
widens.

### The discriminator that makes the 209 actionable

A **composite tenant foreign key** — `(org_id, x_id) → t(org_id, x_id)`, which `backend/CLAUDE.md` §3
mandates — makes the same source shape harmless: another organisation's id cannot land, the write
fails. So the 209 were cross-checked against `pg_constraint`, not judged from source alone. Query:

```sql
WITH fk AS (
  SELECT c.conrelid::regclass::text AS tbl,
         array_agg(a.attname ORDER BY k.ord) AS cols,
         c.confrelid::regclass::text AS reftbl, c.conname
  FROM pg_constraint c
  JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum,ord) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
  WHERE c.contype = 'f'
  GROUP BY c.oid, c.conrelid, c.confrelid, c.conname)
SELECT ... CASE
  WHEN <the fk containing this column also contains org_id> THEN 'composite-tenant-fk'
  WHEN <the column is in some fk>                           THEN 'bare-fk'
  ELSE 'no-fk' END
```

Result over the **172 distinct (table, column) pairs** behind the 209 findings, committed at
`backend/test/security/bola/live/body-id-integrity.json` and asserted by the spec:

| integrity | columns | what a cross-tenant id does |
|---|---:|---|
| `composite-tenant-fk` | **92** | cannot land — the insert fails |
| `bare-fk` | **17** | **lands**, and an id belonging to nobody raises 23505 instead → the two answers differ, an **existence oracle** |
| `no-fk` | **58** | **lands silently**, and so does a nonexistent id |
| `schema-qualified-not-checked` | 5 | the table is in the `build` schema, so the unqualified lookup missed it — not a verdict |

### The findings worth acting on

**Class 1 — `bare-fk` to a tenant-owned table (7 sites).** A cross-tenant id lands AND the reply
distinguishes "exists somewhere" from "does not exist".

| route | field | column → reference | owner |
|---|---|---|---|
| `POST /calendar/events` | `linkedDealId` | `calendar_events.linked_deal_id → deals` | calendar |
| `POST /calendar/events` | `linkedLeadId` | `calendar_events.linked_lead_id → leads` | calendar |
| `POST /timesheets/rates` | `clientId` | `timesheet_rates.client_id → clients` | timesheets |
| `POST /inventory/stock/transfers` | `toWarehouseId` | `inv_stock_transfers.to_warehouse_id → inv_warehouses` | **inventory — EXCLUDED** |
| `POST\|PATCH /inventory/warehouses` | `branchId` | `inv_warehouses.branch_id → org_units` | **inventory — EXCLUDED** |
| `POST /blog/admin/posts` | `categoryId` | `blog_posts.category_id → blog_categories` | blog (vendor-global content, no `org_id`) |

`POST /inventory/stock/transfers` is the worst of them read as a product statement: a stock transfer
whose destination is another organisation's warehouse. It is excluded from this release and is
recorded, not fixed.

**Class 2 — `bare-fk` to global `users` (17 sites, systemic).** `users` is global identity, so the
key cannot be composite; the tenant question there is membership, not referential integrity. Every
one of these lets a row in your organisation name a person in another one as assignee, owner,
manager, incumbent, inspector or hiring manager — `hr` (9), `inventory` (3), `crm` (3), `surveys`
(1), `tasks` (1). The fix shape is one membership resolution, not a migration. Owner: each module.

**Class 3 — `no-fk` (58 columns, 71 sites).** No integrity at all, so no oracle either, but a
cross-tenant reference lands and stays. Concentrated in `build` (29), `crm` (9), `inventory` (9),
`hr` (5), `sign` (5), `goals` (4). Build, CRM and inventory are other territory or excluded.

**Class 4 — the detector's own noise, named so the next reader does not chase it.**
`payment_manual_methods.upi_id` is a UPI address, not an object id. `sign_fields.group_id` is a
caller-chosen radio-group label. `sign_envelopes.source_entity_id` and `ai_feedback.entity_id` are
the grandfathered polymorphic display pointers §3 permits — stored, never resolved, never used to
fetch. These are `written-unresolved` by name shape and are correct as data.

### What was fixed in Part B

Only `sign_watermark_policies.scope_id` (E4 above) — the one finding inside the territory this
session holds. **209 → the ratchet is set at 209** and the two watermark sites moved to
`org-predicate`, which is what took the count from 211 to 209.

### Why this detector is not vacuous

The rule the whole thing turns on: **an occurrence inside `insert().values({…})` or
`update().set({…})` never counts as authorization**, no matter what else is in the literal. A write
literal routinely carries `orgId` beside the foreign id — `.values({ orgId, contactId:
input.contactId })` is the `CrmConsentService.record` defect verbatim — so a detector that looks for
`orgId` anywhere near the field reads that defect as safe. Seven fixture tests pin the rules,
including that exact pair (unbound with the resolution absent, bound with it present), the
destructuring hop most services use (`const { accountId } = query`), the whole-DTO spread
(`.values({ orgId, ...input })`) where the field is never named at all, and the filter case.

---

## Bite proofs

Both were run in a hermetic temp tree built with `git archive HEAD src test openapi.json`, never in
the shared working tree.

```
# Part A — pre-fix src, new spec
jest --testPathPattern=bola-esign-scope-sweeps-and-token
  HEAD src   -> exit 1, 10 failed / 15 passed
  fixed src  -> exit 0, 25 passed / 25

# Part B — pre-fix src, new spec
jest --testPathPattern=bola-body-id-binding
  HEAD src   -> exit 1, 3 failed / 16 passed
               written-unresolved 211 (expected <= 209), resolved 384 (expected >= 386),
               watermark scopeId "written-unresolved" (expected "org-predicate")
  fixed src  -> exit 0, 19 passed / 19
```

The 10 Part-A failures are exactly the E1 (4), E2 (5) and E3 (1) assertions. The nine signer-token
assertions pass in **both** directions — correctly, because that surface was already sound, and the
report says so rather than counting them as repairs.

## Gates

| command | exit | number |
|---|---|---|
| `pnpm typecheck` | **0** | 0 errors (run twice, once per commit) |
| `pnpm check:spec-typecheck` | **0** | passed |
| `pnpm check:openapi-coverage` | **0** | 1,371/1,371 mutating request schemas |
| `pnpm check:route-classification` | **0** | 0 undeclared |
| `pnpm check:scope-application` | **0** | every resolved DataScope reaches a predicate |
| `jest --testPathPattern="e-sign\|esign\|security/bola"` | **0** | **34 suites / 439 tests**, all green |
| `jest --testPathPattern=bola-esign-scope-sweeps-and-token` | **0** | 25/25 |
| `jest --testPathPattern=bola-body-id-binding` | **0** | 19/19 |

**Not run:** lint, `next build`, the repo-wide jest suite, the live 1,921-route HTTP sweep. Part B is
static plus a schema cross-check; it is **not** an HTTP probe, and no claim here rests on one.

`test/security/appsec/*` and `upload-controls` were left alone — the 8 known failures there belong to
another owner and none of them is inside the patterns above.

## Files changed

```
src/modules/e-sign/sign-ai.service.ts
src/modules/e-sign/sign-ai.controller.ts
src/modules/e-sign/sign-envelope-sweeps.service.ts
src/modules/e-sign/sign-envelopes.service.ts
src/modules/e-sign/sign-admin.controller.ts
src/modules/e-sign/sign-templates.service.ts
src/modules/e-sign/sign-watermark.service.ts
src/modules/e-sign/__tests__/e-sign-services-tenant-isolation.spec.ts
src/test/sql-predicate.ts                                    (added `not in`, which notInArray renders)
test/security/bola/bola-esign-scope-sweeps-and-token.spec.ts (new, 25 tests)
test/security/bola/body-id-binding.ts                        (new, the analyzer)
test/security/bola/bola-body-id-binding.spec.ts              (new, 19 tests)
test/security/bola/live/body-id-integrity.json               (new, the pg_constraint measurement)
```

Evidence artifact: `reports/15g-body-id-findings.json` — all 1,047 bindings and the 209 findings with
their table, column and integrity verdict, so the numbers can be audited without re-running anything.

## Cross-territory findings, not fixed

- **`POST /calendar/events` stores another organisation's `dealId`/`leadId`** on an event through a
  bare FK. Owner: calendar module. Fix: resolve both under `orgId` before the insert.
- **`POST /timesheets/rates` stores another organisation's `clientId`** through a bare FK. Owner:
  timesheets module.
- **17 sites store another organisation's user as assignee/owner/manager.** Owner: each module
  (hr 9, inventory 3, crm 3, surveys 1, tasks 1). Needs a membership resolution, not a migration.
- **Inventory and CRM — excluded from this release**, recorded with the exclusion named: 9 + 9
  `no-fk` sites, 6 + 3 `bare-fk` sites, including the stock transfer whose destination warehouse is
  never resolved.
- **Build — 29 `no-fk` body ids**, the largest single block. Owner: build module owner.
- **6 operations have no resolvable handler** and are a blind spot rather than a pass:
  `FinanceAuditController_export`, `CrmAiController_meetingPrep`,
  `SettingsController_{create,update}GitConnection`, `SurveyParticipantsController_import`,
  `TimesheetBillingController_export`. Named in the spec so the blind spot cannot grow silently.

## Honest gaps

- Part B is **static plus a schema cross-check, not an HTTP probe.** It says what the source does and
  what the database would refuse; it does not say what a booted API returns. A live body probe is the
  natural next step and it now has a target list of 209 instead of 3,613 operations.
- The **174 `unresolved`** are not triaged individually. They are a weaker signal than the 209 —
  the field is used but no binding was found within the trace depth — and each needs a human read.
- The **269 `never-read`** fields deserve a separate look for a different reason: a DTO property that
  no reachable code reads is either dead contract surface or a field the service drops silently.
- **E2's severity rests on a reading of `createTenantAwareDb` plus the measured RLS policy, not on a
  booted request.** The claim "RLS confined it at head" is inferred from the policy text and the
  proxy's source; it was not exercised against a running server.
- The first commit (`54c8555f`) is missing the `Co-Authored-By` trailer. Amending it would have meant
  rewriting a tip that other agents were committing onto, and amend is not one of the two git verbs
  this session is allowed, so it was left and is recorded here instead.
