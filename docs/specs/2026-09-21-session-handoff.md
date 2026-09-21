# Session handoff — 2026-09-21

**Read this first if you are picking up this work cold.** It is the single current
task source: what was done, what is open, what is *not* work, and the traps that
cost time. Detailed evidence stays in the lane documents named throughout; nothing
here replaces them.

> ⚠ **Superseded on migration state by a later session the same day.** §1's
> "production is consistent, and nothing is pending" over a 27-row ledger was true when
> written; the ledger is now 33 rows and six further migrations were applied, one of which
> broke production before being repaired. See
> [`2026-09-21-migration-repair-handoff.md`](2026-09-21-migration-repair-handoff.md).
> Open work across both sessions is indexed in
> [`2026-09-21-pending-work.md`](2026-09-21-pending-work.md). Everything else here stands.

---

## 0. Environment facts you must know before running anything

| Fact | Consequence |
|---|---|
| **`backend/.env` points at PRODUCTION** — Aurora `streamlineos-instance-1.…ap-south-1.rds.amazonaws.com:5432/streamlineos`, `NODE_ENV=production`, user `streamline_admin` (holds `BYPASSRLS`) | Any script that loads `.env` and connects is talking to production. The `.env` password is stale; the cluster is **IAM-auth only**. |
| **There is no disposable stack on this machine** | Ports 5432, 5433 and 6379 all refuse. No Docker, no `pg_ctl`, no AWS CLI. Every "needs a live environment" item below is blocked *here*, not blocked in principle. |
| **Two separate git repos** | Root `D:\projects\personal\Streamlineos` (holds `docs/`, `frontend/`) and a nested repo at `backend/.git`. `cd backend` before any backend git command. |
| **Concurrent sessions share this working tree** | Another session (Codex) commits with `git add -A`. **Always commit by explicit pathspec** or you will sweep their in-flight edits into your commit. Check `git status` before and after. |
| **`pnpm typecheck:test` needs `--max-old-space-size=10240`** | At 8192 tsc exits 134 after printing **zero** errors — a silent false pass. A stale `dist/*.tsbuildinfo` fakes a pass too. |
| **ts-jest runs `isolatedModules`** | Jest cannot see type errors. **Typecheck is the only gate that sees an arity or signature change.** A green test run proves nothing about types. |

### Connecting to production read-only (IAM)

There is no committed wrapper — build a throwaway one **outside the repo** (a peer's
`git add -A` will otherwise commit it). Shape that works:

```js
const { Signer } = createRequire(`${BACKEND}/package.json`)("@aws-sdk/rds-signer");
const region = url.hostname.split(".").at(-4);   // NOT at(-3) — that yields "rds"
url.password = encodeURIComponent(await signer.getAuthToken());
```

Two traps, each cost a cycle: `at(-3)` mints a token that fails **`28P01 PAM
authentication failed`**, indistinguishable from a wrong password; and a script in a
temp directory cannot resolve `@aws-sdk/rds-signer` from its own location, so it needs
`createRequire` against the backend's `package.json` (importing the pnpm `dist-es`
build by absolute path also fails — extensionless imports need a bundler).

---

## 1. What was done — 2026-09-21

### Migrations: production is consistent, and nothing is pending

Verified against the production catalogue, not against a runner's output:

```
Ledger: 27 applied row(s) against 896 journal entr(ies).
Watermark 1803000010350; 0 migration(s) pending.
```

| Migration | State found | Action |
|---|---|---|
| `1130_chat_invite_link_token_hardening` | journalled, never applied | **Applied.** Probed first: its `UPDATE … SET token = NULL` looked destructive, but `chat_channel_invite_links` holds **0 rows**, `token_hash` was already `NOT NULL`, and `uniq_chat_invite_link_token` was already absent. A no-op — nothing erased, no invite link broken. |
| `1129_onb_flow_sessions_unique_type_per_actor` | **applied, but reading as pending** | Another session renumbered its journal `when` to `…346` *after* it was applied, orphaning ledger row 24 and pushing the migration above the watermark. The next `db:migrate` would have re-run an applied migration. Reconciled with one `UPDATE`, hash-verified against the file first, inside a transaction that aborts on a target collision. |
| `1120` / `1121` duplicate prefixes | `check:migration-discipline` red | Renumbered to **`1128a`** / **`1128b`**. Gate now passes. |

⚠ **The renumbering has a trap.** `NNNNa` is not a free "next available" name — a
trailing letter asserts *slotted between N and N+1*, and the gate enforces it with an
`[insert-order]` check against the journal `when`. Renaming `1120` → `1120a` cleared
`[dup-prefix]` and created two `[insert-order]` failures. `1128a`/`1128b` is where the
`when` values actually sit. Renaming is safe for production: `drizzle.__drizzle_migrations`
has **no tag column**, matching on `created_at` + sha256 of the file bytes.

### Dead code

- **33 exports deleted** (`36d8d31bc`), most of them §4 alias defects — service files
  re-exporting types they do not own, creating the second import path that rots.
  knip **89 → 56**.
- ⚠ **`pnpm check:dead-code` was RED with 13 stale verdicts** and is now green
  (`266d8a92c`). It was *already* red before this session — `loadLeadProfile` and four
  `confirm-actions/index.ts` entries were orphaned by `448c4e25b` — and the 33-export
  deletion added seven more. See §4 for the rule.
- One further deletion: `stopImpersonationSchema`, a `z.object({})` the
  stop-impersonation route never validates against. That took the ledger's REMOVE debt
  to **zero**.

Final state: `ledger: 23 verdict(s) — 20 KEEP, 3 WIRE, 0 REMOVE (debt)`,
`PASS: self-test (33 assertions)`, `pnpm typecheck:test` **exit 0**.

### Twelve refuted premises, propagated into the documents that carried them

Every verdict had been recorded only in `2026-09-20-deferred-items-lane.md`, so each
source PRD still carried its false rationale at the point an engineer would read it.
Corrected at the point of use. The notable ones:

| Was claimed | Actually |
|---|---|
| "impersonation is never recorded in any audit log" | **False.** `runWithImpersonationContext` *is* called, by `ImpersonationContextInterceptor.intercept` (`impersonation-context.interceptor.ts:20`), registered before `TenantContextInterceptor` so its scope encloses the after-commit drain. |
| F-10: "`react-window` is installed but unused anywhere" | **False.** 8 production consumers. Patterns to copy: `inbox-virtual-list.tsx`, `mail-virtual-list.tsx`, `chat-user-virtual-list.tsx`. |
| `ai-credits-reservation.service.ts:103` is a live billing bug | **Fixed.** The call site unwraps `existing.id`. Two lane documents disagreed about this; resolved. |
| ask-os 11.1 "the directive column needs a migration" | **False.** Directives are serialised into the existing `ai_chat_messages.content` (`text NOT NULL` since `0000`). |
| hardening M6 "the unique constraint has no migration" | **Half true, and the dangerous half is the other one** — see §5. |
| ask-os F-06 multiple directives per turn | **Done.** `global-ask-os.tsx:219-220` appends; the renderer maps N cards. |
| ask-os 15.1 `AmbiguousCandidate` duplicated | **Unified.** One declaration at `common/types/ambiguous-candidate.ts`, three importers, no alias. |

⚠ **A thirteenth was mine, and it went the other way.** I had closed chat-os **P4-6**
on the reason "the SSE census predates the wiring". Commit timestamps refute it: the
emitter landed 2026-09-20T12:24, the census was recorded 2026-09-21T00:07. **P4-6 is
back to open** — see §2.

### Commits

| Repo | Commit | What |
|---|---|---|
| backend | `2d6f5d9c3` | clear the two duplicate migration numbers |
| backend | `36d8d31bc` | delete 33 dead exports |
| backend | `266d8a92c` | shrink the dead-code ledger; discharge the REMOVE verdict |
| root | `1384bbc2e` | migration closeout + twelve re-tested premises |
| root | `a96a746ed` | propagate refuted premises into the PRDs |
| root | `046816274` | no migration needs to run; the knip backlog was phantom |

---

## 2. What is pending

**The full inventory is `2026-09-21-open-items-register.md` — 48 distinct items across
seven documents, deduplicated and grouped by what is blocking each one.** Summary:

| Group | Count | Who can pick it up |
|---|---|---|
| **A — blocked on a live environment** | 12 | Nobody on this machine (5432/5433/6379 refuse). Needs a stack, or a connected Gmail account for three of them. |
| **B — blocked on a product decision or named owner** | 11 | Needs a decision first. Do not start these as engineering tasks. |
| **C — tractable, nothing blocking** | 20 | **Start here.** `E-1` (message windowing) and `E-3`/`E-4` (two specs that certify fictions) are the best value per unit of effort. |
| **D — structural** | 6 | Not fixable one item at a time; several are symptoms of the same root cause. |
| **E — deferred behind a measured threshold** | 4 | Do nothing until the threshold trips. Each names it. |
| **F — production hygiene** | 1 | An `org_1` fixture row is in the production database. |

⚠ **Three entries in that register were already wrong when transcribed**, which is the
pattern this lane keeps hitting. The malformed-parameter item is *understated* (8
controllers and ~38 occurrences, not 5 and 26); `@reactour/tour` is already gone from
`frontend/package.json`; and two frozen connection-hold routes carry blockers that a
later section of their own document retracts. **Re-verify before starting anything.**

The four items most likely to be picked up next, in full:

| Register id | Item | Why it is a good first task |
|---|---|---|
| **E-1** | **Ask OS message-list windowing.** `ask-os-chat-view.tsx:112` maps every row with no windowing while the observer pages indefinitely at 30 rows/page. | Self-contained, frontend-only, and the pattern already exists — `react-window` has **8 production consumers**. Copy `inbox-virtual-list.tsx`, `mail-virtual-list.tsx` or `chat-user-virtual-list.tsx`; variable height and scroll anchoring are solved there. The documented reason to defer it ("`react-window` is installed but unused") was false. |
| **E-3** | **Two specs assert opposite outcomes for the same abort scenario.** `chat-assistant.service.spec.ts:270-297` vs `chat-assistant-multistep-cancellation.spec.ts:345-402`. | The former's `streamText` mock never invokes `onAbort`, so it **certifies a fiction** and passes either way. Fix it against the latter, which matches the shipped SDK. Small, and it removes a test that actively misleads. |
| **E-8** | **8 duplicate copies of the record type guard** (`isRecord` / `isPayloadRecord`) across `auth`, `crm/import`, `e-sign`, `workflow`, `openapi`, `storage`. | `src/common/types/is-record.ts` already exists, so this is redirect-and-delete. Textbook §4 with no design decisions. |
| **E-2** | **F-07 — the confirm card is read-only after a reload.** The token is stripped at persist time (`streaming/ask-os-directive.ts:43`), so the reloaded card renders `mode="record"`. | Higher value but partly gated: the *decline* half needs product decision **P-4** first. The token-bearing reload path can proceed independently. |

⚠ **Do not start `E-6` or `E-7` without re-reading their sources** — both carry blockers
that a later section of their own document retracts.

---

## 3. What is NOT work — do not re-open these

Each of these looked like a backlog item and is not. They cost a sweep every time they
are re-litigated.

| Looks like work | Why it is not |
|---|---|
| **18 "duplicate exports"** from knip | Every one is `export const <route>ResponseSchema = <rowSchema>;` — a per-route contract name bound to a shared row model, live via `@ResponseSchema`. knip reports them only because two exported names bind one value. **This is not the §4 alias defect** (that is about two *import paths* for one symbol). Collapsing them merges separate route contracts. 13 already carry KEEP verdicts spelling this out. |
| Any knip finding under **`modules/crm/` or `modules/inventory/`** | `EXCLUDED_MODULE_RE` at `check-dead-code.mjs:80` puts them out of scope by design: "reported separately, never deleted here". |
| **`inventory/purchase-orders/po-lifecycle.ts`** | An unused *file*, but inventory — excluded by the same rule. |
| **ask-os 11.1** migration | No column exists or is needed. |
| **M6** constraint migration | It would fail `42710`. See §5. |
| A `z.infer` alias whose schema is live | Retained by the gate's own `inferredTypeOfLiveSchema` rule. `(typeof X)[number]` derivation is the same thing but **not recognised** by the classifier — it needs a ledger entry, not a deletion. |

---

## 4. The dead-code ledger — rules that are not obvious

`backend/src/scripts/check-dead-code.mjs` carries per-symbol `KEEP` / `WIRE` / `REMOVE`
verdicts that knip cannot see. **It has overruled knip four times.**

1. **Read the ledger before deleting anything knip reports.** A `KEEP` or `WIRE` verdict
   outranks any scan. Example: `runInNewOrgTransaction` carries **WIRE** — its missing
   caller is `bootstrapCellOrganization`, and the helper it currently uses resolves region
   by reading the organisation's own uncommitted row. Deleting it destroys the record of a
   real latent bug.
2. **`WIRE` ≠ dead.** It means a feature is *unwired*, not that the code is garbage.
3. ⚠ **Deleting code is only half of a deletion.** Once a symbol is gone, knip stops
   reporting it and its verdict goes **stale**, which **fails the gate**. Remove the entry
   in the same change — the ledger only ever shrinks.
4. **Run `pnpm check:dead-code` after any deletion**, then its `--self-test` sibling
   (33 assertions) before trusting a green result. A typecheck cannot see this.
5. A non-zero **REMOVE** count is undischarged debt, not a passing score.

---

## 5. Migration rules that bit this session

1. **A grep over `migrations/` is evidence about the repo, never about the database.**
   M6 claimed a Drizzle-declared unique constraint had no migration. True — and the
   constraint **already exists in production**, `contype = 'u'`, `convalidated = true`,
   with its index. Applying the migration would have failed `42710`.
   **Probe `pg_constraint` / `pg_indexes` / `information_schema.columns` before
   *authoring* a migration, not just before applying one.**
2. The reverse also holds: a "pending" count is a claim about two files agreeing, not
   about the database. **The detection signature is a "pending" migration whose objects
   already exist in the catalogue.**
3. **Query the objects the migration file names, not ones inferred from its filename** —
   filenames here do not match table names.
4. A **letter suffix** on a migration filename asserts *slotted between N and N+1* and is
   checked against the journal `when`. It is not a free "next available" name.
5. Tables declared via `pgSchema("build")` live in the `build` schema, which is **not** on
   the migration runner's `search_path`. Every reference must be qualified
   `"build"."table"` or it fails `relation does not exist`.

---

## 6. Where the detail lives

This file is the index of *state*. The evidence behind it stays in:

| Document | What it uniquely holds |
|---|---|
| `2026-09-20-deferred-items-lane.md` | The full re-test of every deferral premise, the migration closeout, the dead-code classification. |
| `2026-09-20-connection-hold-remediation-prd.md` | H1–H21 measurements, hop-by-hop verifications, the frozen-route reasoning. Historical counts (24 → 18 → 13) are **history, not status** — read the ceiling from `pnpm check:request-txn-outbound`, which currently reports `8 holding across an outbound call (frozen), 1 across an AI call (ceiling 1)`. |
| `2026-09-20-get-route-writes-lane.md` | The 15 writing GET routes and the documented recall limits of `check:get-route-writes`. |
| `2026-09-19-ask-os-hardening-prd.md` | F-/S-/M- findings, §7 "Traps recorded for the next engineer". |
| `2026-09-19-ask-os-architecture-remediation-prd.md` | Numbered remediation items and their evidence. |
| `2026-09-18-chat-os-prd.md` | Phase plan and the live-verification table. |
| `2026-09-20-architecture-review-html-closeout.md` | The six architecture reviews' open items. |

⚠ **Two reading rules for all of them.** A document's opening status line can be stale —
reconcile it against the latest appended evidence *and* current source before trusting it.
And a premise offered to **close** an item needs the same adversarial check as one offered
to defer it; that is how P4-6 was wrongly closed and then reopened.
