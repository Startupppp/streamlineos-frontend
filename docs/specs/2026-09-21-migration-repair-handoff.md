# Migration repair handoff — 2026-09-21, later the same day

**Read this before applying any historical migration.** It records a production break caused
and fixed during this session, a second live bug found while fixing it, and 25 rollback files
written to clear a red CI gate.

**Where this sits.** [`2026-09-21-session-handoff.md`](2026-09-21-session-handoff.md) covers the
state up to the migration closeout, and its §1 says "production is consistent, and nothing is
pending" over a **27-row** ledger. That was true when written. This document supersedes it on
migration state: the ledger is now **33 rows**, six more migrations were applied, and one of
them broke production before being repaired. Open work is indexed in
[`2026-09-21-pending-work.md`](2026-09-21-pending-work.md).

---

## 1. ⚠ `0466` must never be applied without `0467` — this broke production today

**What happened.** `0466_drop_legacy_accounting` drops 45 tables. The last two in its list —
`fin_expense_policies` and `fin_reimbursement_batches` — are **not** legacy accounting. They are
employee-expense tables owned by `modules/expenses`, in the drop set only because they
*referenced* the old ledger. `0467_restore_expense_tables` exists solely to undo that; its own
header opens *"Restore the two HR expense tables 0466 dropped by mistake."*

Only `0466` was applied. `src/modules/expenses/lib/expense-policy-rules.ts` selects
`fin_expense_policies` at lines 105 and 163, so that path was failing `42P01` in production.

**Why every check passed.** Both tables hold zero rows. The pre-apply verification confirmed all
45 tables were empty with no dependent views and only the two FKs `0466` drops itself — all true,
and all irrelevant to the fact that two of the 45 were live. **Emptiness is not deadness.**

**How it was caught.** Not by any gate. While verifying that the new rollback files' `DROP`
targets exist in production, two tables came back missing.

### The repair sequence — recreating is not enough

```
0467 → 1098 → 1101 → 1116 → 1118
```

`0467` rebuilds the **original** shape, which reinstates single-column FKs that later migrations
retired. `1098`'s own comment names this: *"the single-column key 0971 retired and 0467's
recreate reinstated"*. Applying `0467` alone leaves the tables structurally wrong.

| Step | Restores |
|---|---|
| `0467` | Both tables, the `fin_reimbursement_batch_status` enum, two indexes, `uniq_*_org_id` |
| `1098` | `fk_fin_expense_policies_category_id_org` composite tenant key |
| `1101` | `fk_fin_reimbursement_batches_posted_journal_id_org` and `…_cash_account_id_org` |
| `1116` | RLS enabled + `tenant_isolation` policy on both |
| `1118` | Drops the three single-column FKs `0467` reinstated |

Final shape verified field-by-field against `src/db/schema/accounting/finance-expenses.ts`.

### Proof it works

Measured as `streamline_app`, never as the owner — `streamline_admin` holds `BYPASSRLS` and would
have shown a false pass:

| Case | Result |
|---|---|
| The read `expense-policy-rules.ts` actually issues, **with** tenant GUC | Succeeds |
| `fin_expense_policies` with **no** GUC | Denied `42501` |
| `fin_reimbursement_batches` with **no** GUC | Denied `42501` |

Regression: expenses module **8 suites / 68 tests** green.

### The generalised rule

Before applying any historical `*_drop_*` migration:

1. `grep -rl "<table>" migrations/*.sql` — look for a **later** migration that restores what it
   drops.
2. For every table in the drop list, `grep -rl 'pgTable("<name>"' src/db/schema/` — a table still
   declared there is live **regardless of row count**.

**Open decision for the owner:** whether `0466`'s drop list should be narrowed so a cold rebuild
cannot repeat this. Today the chain only works because `0467` follows.

---

## 2. Billing webhooks were failing in production — migration 1117 was never applied

**Found while checking RLS coverage.** `subscription_purchases` had **RLS disabled over 31 live
payment rows**, and `subscription-purchase.service.ts:104` called
`app.subscription_purchase_org_for_order` — a function the database did not have. Both callers
(`billing-webhook.handler.ts:114` and `:257`) were therefore throwing, so **payment activation was
broken**.

`1117_subscription_purchases_rls_org_lookup` was written, tested and bite-proven on **2026-09-13**.
A memory note recorded it as "RESOLVED". It had never been applied. **A merged migration is not an
applied one.**

### Why the function must bypass RLS — do not "simplify" this away

`findByOrderId` queries with **no** `orgId` *on purpose*. The webhook then compares
`purchase.orgId !== orgId` and rejects — **that cross-tenant read is the security control.**
Naive RLS filters the row, `purchase` becomes `null`, the guard never fires, and another tenant's
payment is attached to this org. A fails-closed database primitive making application logic fail
*open*.

So `1117` adds a `SECURITY DEFINER` function returning **only the owning org id**, never the row,
with `SET search_path = pg_catalog, public, app`, `REVOKE ALL … FROM PUBLIC` and
`GRANT EXECUTE … TO streamline_app`. The webhook resolves the org, then fetches the row inside
`runInNewTenantTransaction`.

### Bite test — five cases, paired positive and negative

| # | Case | Result |
|---|---|---|
| 1 | Guard lookup as `streamline_app`, **no** GUC | Resolves the owning org — required; it must see across tenants to reject |
| 2 | Unknown order id | `null` — fails closed, no existence leak |
| 3 | Table read, no GUC | Denied `42501` |
| 4 | Owning tenant | Sees its 10 rows |
| 5 | A different tenant, same order id | Sees 0 |

Regression: billing **95 suites / 1114 tests** green.

**Checked before enabling RLS**, per the rule that readers deliberately omitting `orgId` are
usually guards: every other reader of `subscriptionPurchases` lives in
`subscription-purchase.service.ts` and scopes by `orgId`. The one exception is the guard above.
`verifyAndActivate` (`billing-payment-activation.ts:128`) runs under the request tenant
transaction, so a cross-tenant order now yields `NotFoundException` — a 404, which is the correct
outcome for a cross-tenant miss.

---

## 3. `check:migration-rollback` was red in CI — 25 files written

The gate is wired at `.github/workflows/ci.yml:642` and was exiting 1: **25 migrations between
1090 and 1129 had no rollback file.** All 25 now have one.

### Rules for whoever adds the next migration

- Path is exactly `migrations/rollback/<tag>.down.sql`.
- Only numeric prefix **> 839** must comply (`BASELINE_CUTOFF`).
- The alternative is `-- @irreversible` or `-- @data-loss` **inside the forward migration** — but
  **never** on an applied migration. Editing it changes its hash and production will replay it.
- If the forward has `CREATE TYPE "name"`, the rollback **must** have
  `DROP TYPE IF EXISTS "name"`, same name. Checked mechanically. Drop it **after** the tables
  that use it.
- Begin with `SET lock_timeout = '5s';` and put `--> statement-breakpoint` between **every**
  statement — the applier splits on it. Files missing these send several statements as one string.
- Re-adding an FK uses `ADD CONSTRAINT … NOT VALID` then a separate `VALIDATE CONSTRAINT`.

### The check that found §1 and §2 — run it after adding rollbacks

Every `DROP` carries `IF EXISTS`, so **a misspelt object name makes a rollback a silent no-op that
looks successful.** All **65 drop targets were verified present in production**. This is the only
thing that distinguishes "the file exists" from "the file works", and it is what surfaced both
bugs above.

Two traps when writing that probe: a partitioned index has `relkind = 'I'`, not `'i'` (checking
only `'i'` reports `idx_notifications_list_created_cursor` as missing when it is fine), and
`pg_policies` must be checked for policies rather than `pg_constraint`.

### Costs recorded in each rollback header

`1116` / `1117` / `1123` remove cross-tenant isolation · `1112` reopens an append-only audit log ·
`1113` / `1114` destroy stored provider credentials · `1119` destroys the impersonation audit
trail · `1128b` cannot remove its enum value at all, because PostgreSQL cannot drop an enum value.

### Also done

- Deleted two rollback files named for tags no forward migration has
  (`1106_inv_3pl_connections_credentials`, `1107_inv_channels_credentials`) — their forwards were
  renumbered to `1113`/`1114` and correctly-named replacements now exist.
- Renamed `0574_inventory_party_columns.down.sql` → `0574a_…` so it pairs with its forward.
  Every rollback now pairs with a real forward migration.
- Tightened `INVENTORY_WITHOUT_ROLLBACK_BASELINE` **38 → 5**.
- Corrected one agent's header: it claimed `1118`'s FK definitions came from migration `0467`,
  which grep refuted. The definitions were right; the provenance was not. They are verifiable in
  `src/db/schema/accounting/finance-expenses.ts`.

Gate now exits 0 with its self-test passing 9/9.

---

## 4. Migration state at handoff

```
ledger rows 33 | journal entries 896 | sql files 897 (the 897th is another session's, unjournalled)
watermark 1803000010350
ORPHAN 0 · DUPLICATE 0 · ABOVE watermark 0 · SKIPPED (below watermark, no row) 869
```

**Nothing needs to run.** The 869 are applied but unrecorded — pre-existing ledger sparseness, and
exactly what allowed `0466` to be re-applied out of order. Its residual is cold-rebuild
divergence, not missing objects.

**There are two ledgers and they are not the same thing:**

| Ledger | Keyed by | Written by |
|---|---|---|
| `drizzle.__drizzle_migrations` | file **hash** | `run-pending-migrations.mjs` — authoritative, this is what guards replay |
| `drizzle.__manual_apply` | `(tag, at, note)` | `db:apply-one` — an audit record only |

Migrations applied by different paths land in different ledgers, which is why the two disagree.

### Applied to production today

| Tag | Effect |
|---|---|
| `0466_drop_legacy_accounting` | 45 tables + 29 enums — **caused §1** |
| `1102_sign_settings_drop_public_forms_enabled` | Column dropped |
| `1122_build_workspace_scope_indexes` | 2 partial indexes |
| `1128_build_optimistic_concurrency_and_update_publication` | 15 columns, 4 indexes, CHECK validated |
| `1131_withdraw_team_supported_scope` | Deleted 57 live `team` scope offers |
| `1132_payslip_templates_one_default_per_org` | One-default-per-org unique index |
| `0467` `1098` `1101` `1116` `1118` | The §1 repair sequence |
| `1117_subscription_purchases_rls_org_lookup` | The §2 fix |

`1133_governance_keyset_cursor_indexes` was applied by another session; both indexes verified
present and valid.

---

## 5. Connecting to production

Aurora, `ap-south-1`, **IAM auth** — there is no password in `DATABASE_URL`. Repo scripts that
assume password auth fail `28P01 PAM authentication failed`; that is the environment, not a broken
gate. `check:migration-ledger` is affected and runs with a password URL in `db-gates.yml`.

```js
import { Signer } from "@aws-sdk/rds-signer";
import "dotenv/config";
const u = new URL(process.env.DATABASE_URL);
const s = new Signer({ region: "ap-south-1", hostname: u.hostname,
                       port: Number(u.port || 5432), username: u.username });
const out = new URL(`postgresql://${encodeURIComponent(u.username)}:`
                  + `${encodeURIComponent(await s.getAuthToken())}`
                  + `@${u.hostname}:${u.port || 5432}${u.pathname}`);
out.searchParams.set("sslmode", "require");
```

Apply one journalled migration:

```bash
APPLY_ONE_ALLOW_REMOTE=1 APPLY_ONE_DATABASE_URL="$AURL" \
  node src/scripts/apply-journalled-migration.mjs --tag=<tag> [--dry-run]
```

`APPLY_ONE_ALLOW_REMOTE=1` is mandatory — the script deliberately refuses non-loopback targets.
Always `--dry-run` first. **Never run bare `pnpm db:migrate` against production.**

Two environment traps that cost time: `cd` **persists between bash calls**, so a `cd` to the repo
root left a later `migrations/rollback/` lookup reporting the whole directory missing; and `/tmp`
differs between Git Bash and node on Windows (node resolves it to `D:\tmp`), so pass values through
shell variables rather than temp files.

---

## 6. Gate state at handoff

```bash
cd backend
pnpm -s check:migration-rollback      # 0 — self-test 9/9
pnpm -s check:migration-immutability  # 0 — self-test 0
pnpm -s check:migration-discipline    # 1 — another session's unjournalled 1134
pnpm -s check:migration-chain         # 1 — same 1134 + duplicate prefix 1090 + the 0619 regression
```

Backend commit: **`0e2841d24`**. Both repos still need `git push` — repo rules make git
orchestrator-only.

⚠ **The working tree is shared with live sessions.** At handoff it carried another session's
uncommitted `build/governance/` and `build/qa/` edits and untracked
`migrations/1134_qa_keyset_cursor_indexes.sql`. **Commit by explicit pathspec** — a bare
`git add -A` will sweep their in-progress work into your commit, which has already happened once
in this repo. A concurrent session also overwrote `2026-09-21-session-handoff.md` while this
document was being written.
