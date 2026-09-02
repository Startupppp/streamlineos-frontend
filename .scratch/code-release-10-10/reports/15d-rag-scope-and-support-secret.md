# 15d — RAG object-level scope, and the support inbound secret

Session S4d. BE = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`.
Closes the two defects ticket 15's sweep confirmed and 15b/15c could not reach:
`KbSearchService.retrieveTopArticles` behind `POST /kb/ask`, and the three problems on
`support_channels.inbound_secret`. Territory: `kb/retrieval/**`, `modules/support/**`,
`test/security/**`. No migration, no schema, no other module.

---

## 1 — RAG retrieval applies no object-level DataScope

### What was true before

`GET /kb/search` narrows on the article owner below scope `all`
(`kb-search.service.ts:88-95`, added by 15b). `retrieveTopArticles`, the retrieval path behind
`POST /kb/ask` **and** the research-brief graph, applied space membership, article restrictions
and page visibility — but **no article-owner DataScope at all**. It did not take a scope
parameter, so there was nothing to forget: the concept was absent.

Both callers put the returned `contentText` straight into a prompt
(`kb-ask.service.ts:97-104`, `kb-research-brief.graph.ts:125`), which is the exact case the
constitution names: *"a chunk is disclosed the moment it enters the context window."*

### The ACL question, answered before choosing a fix

The brief asked whether the ACL already sits on the chunk row. **Partly.** `kb_article_chunks`
carries the **page** ACL (`page_visibility`, `page_project_id`, `page_created_by_id`,
`page_created_by_membership_id`) plus `acl_revision`, with a partial index
`idx_kb_chunks_org_page_acl`. It carries **no article owner** — adding one would be a migration,
which is ticket 08's.

It does not need one. `articleVectorCandidates` **already joins `kb_articles`**, because the
`acl_revision` equality that ticket 29 built is a join condition
(`kb-candidate.service.ts:93-98`). `articleKeywordCandidates` queries `kb_articles` directly. So
the owner predicate lands on a table that is already in both queries, against the existing
composite index **`idx_kb_articles_org_owner_actor (org_id, owner_membership_id)`**. **Zero new
joins, zero new columns, zero migrations** — asserted (`innerJoin(` count is still exactly 2).

### What changed

New `src/modules/kb/retrieval/kb-article-owner-scope.ts` (22 lines) holds the single predicate
builder:

```ts
articleOwnerScopeFilter(scope, user): SQL | null
  "all"  -> null                       (no narrowing)
  "none" -> sql`false`
  else   -> eq(kbArticles.ownerMembershipId, actingMembershipId(user.principal))
            ... and sql`false` when the principal has no acting membership
```

`search()` (the direct read) and retrieval now both build the predicate from that one function,
so "the same object-level visibility the direct read endpoint enforces" is true **by
construction**, not by two implementations agreeing. The four-scope identity is asserted.

`KbSearchService` **resolves the scope itself** rather than accepting one:

```ts
async articleOwnerFilterFor(user) {
  const articleScope = await resolveKbArticlesViewScope(this.scopes, user);
  return articleOwnerScopeFilter(articleScope, user);
}
```

That is the deliberate asymmetry with `search()`, which takes its scope from the controller.
`retrieveTopArticles` has two callers today and will have more; a parameter can be forgotten or
passed `"all"`, an internally-resolved scope cannot. **`kb-research-brief.graph.ts` needed no
change and is fixed anyway** — which is the point. `AccessService` is `@Global()`, so this is a
constructor parameter and no module wiring.

The filter is pushed into **three** places, all before or at candidate selection:

| Where | Query |
|---|---|
| `articleKeywordCandidates` | the FTS candidate select on `kb_articles` |
| `articleVectorCandidates` | the ANN chunk select, on the already-joined `kb_articles` |
| `retrieveTopArticles` hydration | the select that actually reads `content_text` |

plus `KbAskService.resolveVisibleArticles`, the citation re-verification, which had the same gap.
Nothing is filtered after retrieval and nothing is asked of the model.

### The performance guard was not touched

`kb-candidate.service.ts:27`'s `SET LOCAL hnsw.iterative_scan = relaxed_order` is unchanged and
still executes before the ANN query — asserted twice, once on the source ordering and once by
observing the statement actually run on the retrieval path. Ticket 12's finding stands: it is a
correctness guard, not a tuning knob.

### Proof

`test/security/bola/bola-rag-object-scope.spec.ts` — **18 tests**, built on
`kb-rag-fake-db.ts`, a stand-in that compiles each query's **real** WHERE with drizzle's own
`PgDialect` and then answers it from fixtures the way Postgres would for the owner column. So the
headline assertion is behavioural, not a source-text restatement:

- an asker at scope `own` gets **only** their own article back, and `VICTIM-SECRET-TEXT` reaches
  no `contentText`;
- through the whole `POST /kb/ask` path, **the prompt handed to the AI gateway contains the
  asker's article text and never the other one**, and no citation names it;
- **the same asker at `all` still receives both**, and the owner of both still gets both text
  fragments in the prompt — the guard is not a blanket denial;
- every article-touching predicate binds membership `7` and **never** binds `99`, read off the
  compiled query's own bound parameters;
- scope `none` refuses **in the SQL** (`false` in every article predicate), not after retrieval;
- a principal with no acting membership resolves to a refusal, never to `all`.

**Mutation-tested, executed twice:**

| Mutation | Red |
|---|---|
| A — `retrieveTopArticles` passes `null` to the candidates and drops the hydration push (the literal pre-fix state) | **6 of 18**, including "a non-owner's answer context never contains the other article's text" |
| B — `KbCandidateService` ignores the filter it is handed | **4 of 18**, including "the candidate queries carry the predicate, so the victim's chunk is never a candidate" |

Both restored and re-verified byte-identical (`diff -q` against the pre-mutation copy).
Every SAME-TENANT / not-a-blanket-denial assertion stayed green under both.

### How much this bites today — stated honestly

`kb:articles:view` is in `UNIVERSAL_MEMBER_PERMISSION_GRANTS` at scope **`all`**
(`rbac/permissions/role-defaults.ts:6`), and `applyUniversalGrants`
(`access/access-policy.ts:166-175`) takes `broadest(existing, grant.scope)`. **So an ordinary
human-session member resolves `all` no matter how a role or per-person grant narrows them**, and
the predicate is a no-op for them — on the direct read exactly as much as on RAG. The gate bites
for: `account-only` principals; `personal-token`/`agent-token` principals whose ceiling excludes
the key (`access-principal-scope.ts:24-29`); and members with the `kb` module denied, where
`stripDeniedModules` removes the key and the scope resolves `none`.

That floor is deliberate — root CLAUDE.md §8 makes KB reading platform core — so this is not a
defect I am reporting, it is the reason the fix is a *parity* fix rather than a live-hole fix.
The constitutional property the ticket names is *"binds the same object-level visibility the
direct read endpoint enforces"*, and that is now true for every principal kind. **See finding 3
below**: if the product ever wants article scope to bite for members, the universal grant is the
thing to change, and both endpoints will follow with no further work.

---

## 2 — `support_channels.inbound_secret`: three problems, all closed

### 2a — constant-time comparison

Was `channel.inboundSecret !== providedSecret` (`support-channels.service.ts:106`), which
short-circuits at the first differing byte. New `support-inbound-secret.ts` (45 lines):

```ts
inboundSecretMatches(stored, provided)
  -> reduce BOTH sides to `sha256:<64 hex>` (71 chars, always)
  -> timingSafeEqual on equal-length buffers
```

Reducing both sides to a digest before comparing removes the unequal-length case entirely rather
than handling it, so **the length of the presented secret is not observable at all** — asserted
by checking that `hashInboundSecret` returns one width for inputs of length 0, 1, 48 and 10,000.
`constantTimeEquals` still handles unequal lengths defensively and does so **without an early
return that skips the work** (`timingSafeEqual(left, left)` then `false`) — asserted on the
source, because the branch is unreachable by construction and cannot be reached behaviourally.

There is a behavioural discriminator for the naive fix, too: a `timingSafeEqual` over raw
secret buffers throws `RangeError` on unequal lengths, which reintroduces the length oracle as an
error shape. The spec asserts `inboundSecretMatches` **returns false without throwing** for
inputs of every other length.

### 2b — hashed at rest, with no migration

The column is `text` and stays `text`. What changed is the *format* written into it:

- `createChannel` stores `hashInboundSecret(secret)` and returns the **plaintext once** — the
  create response is now the only place the credential exists. This is the invitation-token rule
  (root CLAUDE.md §5, "hash-only at rest") applied to the same class of credential.
- `listChannels` selects `columns: { inboundSecret: false }` — the column never leaves the server
  on a read at all.
- `verifyInboundSecret` **dual-reads**: a stored value with the `sha256:` prefix is compared as a
  digest; a stored value without it is a pre-hash row and is digested at read time. That is what
  makes this migration-free — **existing channels keep working with no backfill and no
  redeployment of anyone's webhook relay.**
- Rotation, because hashing removes the ability to look the secret up again: `PATCH
  /support/channels/:channelId` gained an optional `rotateInboundSecret: boolean` on the
  **existing** `.strict()` schema. No new route, no new permission key, no contract-registry or
  OpenAPI entry — `check:route-classification`, `check:contract-registry`,
  `check:contract-breaking-change`, `check:openapi-coverage` and `check:operation-ids` are all
  still exit 0.

**REQUIREMENT FOR TICKET 08 (owns `migrations/`) — one data migration, no DDL.** Rows written
before this change still hold plaintext. They verify correctly, so nothing is broken, but they
are not yet hash-only at rest. The backfill is one statement and is safe to run at any time
because the dual-read already accepts both forms:

```sql
UPDATE support_channels
SET inbound_secret = 'sha256:' || encode(digest(inbound_secret, 'sha256'), 'hex')
WHERE inbound_secret IS NOT NULL
  AND inbound_secret NOT LIKE 'sha256:%';
```

(`pgcrypto` is already a cold-build extension per backend CLAUDE.md §3.) It is **irreversible for
the operator** — after it runs, a channel whose secret was never written down must be rotated
through the PATCH above. That is the intended property, and it is why I implemented the rotation
path rather than leaving the seam open. Everything up to the migration is done; nothing in the
code depends on the backfill having run.

### 2c — the pre-authentication rate limit

Was `this.rateLimit.check("support:inbound-email", orgId)` **before**
`verifyInboundSecret` on all three inbound routes, and `("support:chat-widget", orgId)` on the
chat widget start. An anonymous caller who knows an org id — which appears in that org's own
public surfaces — could exhaust the victim's inbound quota and stop its real support mail.

Now, on all four:

```
pre-auth :  rateLimit.check(tier, clientIp(req))     <- caller cannot choose this
            verifyInboundSecret(orgId, kind, secret)
per-org  :  rateLimit.check(tier, orgId)             <- only reachable with the credential
```

`clientIp` is the repository's own helper shape, copied from
`whiteboard-sharing.controller.ts:43` (`x-forwarded-for` first hop, then `req.ip`, capped at 100
chars). The per-org quota is **kept**, not deleted — rate-limiting before authentication is right
for DoS protection; keying that limit on the victim was the inversion.

### Proof

`test/security/bola/bola-support-inbound-secret.spec.ts` — **20 tests**. The one that matters:

> *an anonymous flood naming another org consumes no part of that org's quota* — five failed
> anonymous requests naming `org-victim` produce **5** counts on the attacker's IP bucket and
> **0** on `org-victim`'s.

plus: the presented secret verifies against the **stored digest** (not a stored plaintext); the
secret a channel is created with verifies against what was actually persisted; a legacy plaintext
row still verifies and still refuses a near-miss; an unknown org and a wrong secret are the same
`UnauthorizedException` (no existence oracle); the per-org check runs strictly **after**
`verifyInboundSecret` resolves, read off jest's invocation order.

**Mutation-tested, executed three times:**

| Mutation | Red |
|---|---|
| C — restore `channel?.inboundSecret === providedSecret` | **3 of 20** (constant-time guard, and both "verifies against the stored digest" behavioural tests) |
| D — store the plaintext instead of the digest | **1 of 20** ("stores only a digest and hands the plaintext back exactly once") |
| E — re-key the pre-auth limits on `orgId` | **5 of 20**, including the anonymous-flood test |

All restored and re-verified byte-identical.

### The three KNOWN-OPEN pins are now FIXED regression guards

`bola-public-org-selector.spec.ts` pinned all three defects by name. An assertion that encodes a
vulnerability cannot go green and stay honest, so each is **inverted** rather than deleted, as
15c did for its own pins:

| Was | Now |
|---|---|
| `KNOWN-OPEN: the secret comparison is not constant-time` | `FIXED: the secret comparison is constant-time` |
| *(none — the plaintext-at-rest finding had no pin)* | `FIXED: the inbound secret is hashed at rest` |
| `KNOWN-OPEN: the pre-auth rate limit is keyed on the caller-supplied org id` | `FIXED: the pre-auth rate limit is keyed on the caller's own address` |

`a wrong secret and an unknown organization are indistinguishable` kept its property and was
re-expressed against the new call.

---

## 3 — Confirm-and-report items

### `PLATFORM_ADMIN_USER_IDS` is unset — **intended, and documented as intended**

Verified rather than assumed. It is **absent from the live `.env`** (no key at all, not an empty
value) and present-but-empty in `.env.example`, where the repository's own comment reads:

> *"…are outside every organization's permission catalog, so no org owner, org admin, role grant
> or delegation can reach them. **Unset means nobody, which is the correct default.**"*

`env.validation.ts:42` maps empty to `undefined`; `platform-operators.ts:36` parses `undefined`
to an empty set; `isPlatformAdmin` is false for every user. So `/blog/admin/*` is reachable by
nobody in this deployment. **That is the correct fail-closed default and it is intended.** The
only thing worth the orchestrator's attention is operational, not a defect: whoever operates the
vendor blog must be added to that variable in the production environment, and until then the
five admin routes are inert. 15c's assertion that a user *on* the list does hold the keys is what
keeps "gated" distinguishable from "dead".

### `user-ops-bulk-update.spec.ts:93` — **surfaced, not flipped**

Read and confirmed at current source. `bulkUpdateUsers` (`user-ops.service.ts:170-183`) narrows
the caller's `userIds` with `inArray(organizationMembers.userId, userIds)` under
`eq(organizationMembers.orgId, orgId)`, keeps `tenantUserIds`, and returns
`{ success: true, updated: scopedIds.length }` — the **owned subset count**, 200. The spec, titled
*"bulkUpdateUsers — cross-org isolation"*, asserts `expect(result.updated).toBe(1)` for a two-id
request.

That is silent subsetting asserted **as** the isolation guarantee — the shape 15c removed from ten
other sites. I have not changed it: `modules/users` is not my territory, and more importantly
flipping it reverses a decision someone made on purpose rather than repairing an oversight.

**Recommendation.** Bring it in line with the other ten: assert `NotFoundException` for the whole
request when the deduplicated requested id count exceeds the rows the tenant predicate returned,
using the repository's own template at `build/core/projects-tickets-query.service.ts:155`. Two
things make this one more than a one-line change and should go to whoever owns `modules/users`:

1. `bulkUpdateUsers` is not idempotent-neutral — it writes `hr_employments` and role assignments
   inside the transaction before the count is known, so the check must be placed **immediately
   after the `memberRows` select and before the first update**, not at the end.
2. The route's caller may legitimately pass ids for members who have since been removed. If that
   is a supported flow, the honest fix is an explicit per-id verdict (the shape
   `POST /users/bulk-suspend` already returns) rather than a silent count — but it must be a
   deliberate choice, made once, and the test renamed to say which one it is. "Cross-org
   isolation" is the one thing the current assertion does **not** establish.

---

## Gates — command, exit code, number read

| Command | Exit | Number |
|---|---|---|
| `pnpm -s check:scope-application` | **0** | 142 resolutions, 142 applied (was 141/141 — mine is the new one) |
| `pnpm -s check:record-access` | **0** | 1183 findFirst calls, OK |
| `pnpm -s check:permission-keys` | **0** | 627 unique keys, 698 backend / 696 frontend |
| `pnpm -s check:log-secrets` | **0** | 3539 files, 97 TIERS entries, no plaintext secret logging |
| `pnpm -s check:hardcoded-secrets` | **1** | **NOT MINE** — see "Red, and not mine" |
| `jest --runInBand --testPathPattern="modules/(kb\|support)/"` | 0 | **124 suites / 872 tests, all pass** |
| `jest --runInBand --testPathPattern="test/security/bola"` | 1 | **14 suites / 171 tests, 170 pass**; the 1 failure is not mine (below). Was 12 suites / 132 tests. |
| `jest --runInBand --testPathPattern="kb\|support\|security"` | 1 | 174 suites / 1533 tests, **1525 pass**; 2 red suites, both pre-existing/not mine |
| `pnpm typecheck` (8 GB, tsconfig.build.json) | **2** | 23 errors in 16 files, **none in a file I touched** — see below |
| `tsc --noEmit` over my 8 changed `src/` files + their full import graph | **0** | **0 errors** |
| `pnpm -s check:spec-typecheck` | **2** | **1** error, `finance/ap/payment-run-executor.service.ts` — not mine |
| `tsc --noEmit` over my 3 new `test/security/**` files + the 9 spec files I edited | **0** | **0 errors** (`tsconfig.json` includes only `src/**` and `evals/**`, so `test/security/**` is outside `check:spec-typecheck`; I typechecked it explicitly) |
| `pnpm -s check:cycles` (madge) | **0** | 5475 files, no circular dependency |
| `check:route-classification` · `contract-registry` · `contract-breaking-change` · `openapi-coverage` · `operation-ids` · `idempotent-commands` · `module-di` · `tenant-isolation` · `mock-surface` · `bounded-contracts` · `route-duplicates` · `bulk-id-limits` · `import-direction` · `fire-and-forget` · `envelope-consistency` | **0** each | unchanged from the baseline I took before editing |
| `pnpm -s check:file-sizes` | **0** | improved during the session (1 → 0), not by me |
| `pnpm -s check:over-300` | **1** | 400 vs baseline 394 — **was 401 before I started**; I added zero files to the set |

Baseline gate exit codes were captured **before** any edit and are diffed against the same list
after, so every difference below is attributed rather than assumed.

## Red, and NOT mine

1. **`pnpm typecheck` — 23 errors, 16 files.** All in `automation`, `build`, `e-sign`, `finance`,
   `hr/*`, `inventory`, `kb/wiki`, `support-ticket-messages`, `scripts`. Every one is an
   `orgId`-missing-on-insert or a `columns` projection error caused by another agent's **in-flight
   schema edits** (`git status` shows `src/db/schema/{support/tickets,hr/hiring-pipeline,…}.ts`
   modified and uncommitted). Attribution proved, not asserted: a scoped `tsc` over my eight
   changed `src/` files **and their entire transitive import graph** (which includes the whole
   `db/schema` barrel) is **exit 0, 0 errors**.
   Two of the 23 are inside module trees I nominally hold —
   `src/modules/support/core/support-ticket-messages.service.ts:103` and
   `src/modules/kb/wiki/kb-pages.service.ts:240` — but neither is a file I edited and both are
   caused by the uncommitted schema change, so the agent landing that change owns the call-site
   repair. Flagging rather than fixing, to avoid colliding mid-edit.
2. **`test/security/bola/bola-bulk-mixed-tenant.spec.ts:238` (1 test).** A ticket-15 defect pin
   asserting `email_sequence_enrollments` has **no** `org_id` column (P0-3). It is red because
   somebody has just **added** `org_id` to `src/db/schema/hr/hiring-pipeline.ts` — the durable fix
   P0-3 asked for, landing now. Like 15c's four, this pin needs **inverting into a FIXED guard**,
   by whoever is landing that schema change; I left it alone because their work is uncommitted
   and inverting it now would race them.
3. **`test/security/upload-controls.spec.ts` (5 tests)** — storage module, pre-existing, already
   reported by 15 and 15c.
4. **`pnpm -s check:hardcoded-secrets` exit 1** — one file,
   `.github/workflows/db-gates.yml` `[url-credential]`. That file is **untracked** and was created
   at 18:59, after my green baseline run of the same gate. Another agent's in-flight work; it is
   also a real finding they should act on (the constitution: rotate any credential that reached a
   commit).
5. **`pnpm -s check:unbounded-reads` exit 1** — one UNCLASSIFIED path,
   `src/modules/cron/cron-hr-retention-documents.ts:130`. Cron module, not mine; the gate was
   exit 0 at my baseline.
6. **`pnpm -s check:kebab-case` exit 1** — `src/scripts/.tmp-dcc-lib.mjs`, a temp file left by
   another agent's script run.
7. **`pnpm -s check:over-300` exit 1** — 400 files vs a baseline of 394. It was **401** before I
   started; my two new `src/` files are 22 and 45 lines and the files I edited were already over
   300 (`kb-search.service.ts` 388→399, `support-channels.service.ts` 380→391) or remain under
   (`support-channels.controller.ts` 211→242).

## Files changed

**New (`src/`):** `src/modules/kb/retrieval/kb-article-owner-scope.ts` ·
`src/modules/support/core/support-inbound-secret.ts`

**New (`test/security/bola/`):** `bola-rag-object-scope.spec.ts` ·
`bola-support-inbound-secret.spec.ts` · `kb-rag-fake-db.ts` (harness)

**Modified (`src/`):** `kb/retrieval/kb-search.service.ts` · `kb/retrieval/kb-candidate.service.ts` ·
`kb/retrieval/kb-ask.service.ts` · `support/core/support-channels.service.ts` ·
`support/core/support-channels.controller.ts` · `support/core/dto/support-tickets.schemas.ts`

**Modified specs (constructor arity / mock surface, `kb/retrieval/`):**
`kb-acl-isolation` · `kb-acl-revision-gate` · `kb-s10-fixes` · `kb-search-embedding-guard` ·
`kb-search-page-visibility` · `kb-search-restrictions` · `kb-vector-minority-tenant` ·
`kb-ask.service` · `kb-source-citation`

**Modified harness:** `test/security/bola/bola-public-org-selector.spec.ts` (3 pins inverted, 1
re-expressed)

No migration, no `db/schema`, nothing under `modules/{payroll,storage,gdpr,rbac,auth,organization,settings}`,
nothing in `kb/core`, `kb/wiki`, `kb/help-centre` or `kb/article-conversion`.
