# Production invitation catalog evidence — 2026-10-03

Status: Current verified for the catalog observations below; Current unverified for runtime invitation behavior, tenant isolation, migration replay, rollback, and lock behavior.

Scope: Read-only inspection of the production PostgreSQL target configured in `backend/.env`. No business rows, email addresses, credentials, tokens, or connection URLs were returned. No database object or row was changed.

Related finding: [BLD-MIGRATION-CHAIN-01](../migration-chain-gap.md).

## Observation context

| Item | Evidence |
|---|---|
| Observation time | `2026-10-03T04:00:43.036Z` — 09:30:43 India time |
| PostgreSQL | `18.4` |
| Admin connection identity | `streamline_admin` |
| Application connection identity | `streamline_app` |
| Transaction mode, both connections | `transaction_read_only=on` |
| Outer repository revision observed during inspection | `8fd462c09d0d6a91afd6fd5cfd1d464ed5040581` |
| Backend committed revision | `e1001a934c89ca71b75f6b19b3c9e7a9be44e209` |
| Uncommitted source present during inspection | The parallel migration owner was editing the new `0941a` candidate and journal. Its candidate hash is an observation of a working file, not an approved migration identity. |
| Authentication | Repository IAM password provider through `createScriptSql`; direct URL authentication is insufficient for the configured IAM target. |

Both database roles have `rolsuper=false`, `rolbypassrls=false`, and `rolcanlogin=true`. The admin owns the inspected tables. RLS is enabled but not forced on those tables; owner catalog visibility and a false `rolbypassrls` flag do not establish application isolation.

## Invitation key and foreign key

Production already has the following nonpartial composite key:

```sql
CREATE UNIQUE INDEX uniq_invitations_org_id
ON public.invitations USING btree (org_id, id)
```

`pg_index` reports `indisunique=true`, `indisvalid=true`, and `indisready=true`. `pg_constraint` identifies it as the supporting index for the validated `uniq_invitations_org_id` UNIQUE constraint.

`invitation_events.fk_invitation_events_invitation_id_org` is present and validated:

```sql
FOREIGN KEY (org_id, invitation_id)
REFERENCES invitations(org_id, id) ON DELETE CASCADE
```

Its `conindid` resolves to `uniq_invitations_org_id`. The current `0965` SQL hash is recorded in the migration ledger. This verifies the existing production constraint; it does not explain how an empty database obtains the prerequisite before `0965`, or establish which historical operation created the existing key.

### Consequence for the repair

The production key has a different name from the new `0941a`/`1728` key, `uniq_invitations_org_id_setup_receipts`. A migration that only checks the proposed name can create a duplicate equivalent index. A prerequisite that merely skips creation when any equivalent key exists also leaves the preserved `1728` name-based `CREATE UNIQUE INDEX IF NOT EXISTS` able to create that duplicate. The migration owner must reconcile this end state while retaining the validated foreign key and immutable applied SQL. This observation was sent to the migration owner before its final implementation.

## Receipt migration deployment

| Object or identity | Current production observation | Interpretation |
|---|---|---|
| `0941a_invitations_org_id_unique_prerequisite` | No matching migration hash | The repair candidate is not deployed. |
| `0965_ar02_canonical_tenant_fks_3` | Matching hash recorded at `created_at=1803000010052` | Current source identity is applied. |
| `1728_organization_setup_invitation_receipts` | No matching migration hash | Receipt migration is not deployed. |
| `public.organization_setup_invitation_receipts` | Absent under both admin and app catalog checks | No receipt columns, constraints, RLS policy, or grants exist to verify. |
| `public.uniq_outbox_events_org_event_id` | Absent | Receipt composite event key is not deployed. |
| Outbox `(organization_id,event_id)` equivalent unique key | None in the inspected outbox index catalog | Existing unique `event_id` and `(organization_id,outbox_event_id)` keys are different shapes. |

Current source SHA-256 values observed:

| Source | SHA-256 |
|---|---|
| `0965_ar02_canonical_tenant_fks_3.sql` | `f61132d4e4baff8215f12c52a302eff74ef90a0aa369af220a33cf3ca5180d06` |
| `1728_organization_setup_invitation_receipts.sql` | `1cea28247ddcef340d9ca31f578f3998b3b1b1c22fec311b6105b6ed2014c3fd` |
| First inspected, subsequently edited `0941a` candidate | `f03b48fb419573aaa843edad96aed7517d4892c52f6ec24b0a16abc6a2b31dfa` |

The application receipt service from the backend revision therefore needs deployment alignment before its new receipt path can be claimed operational on this target. Source tests do not supply the absent database objects.

## Migration ledger reconciliation

The ledger has 1,059 rows and 1,059 distinct hashes. Its highest `created_at` is `1803093660725`, matching the current source identity for `1727_git_connection_credentials_contract`.

The working journal contained 1,050 entries. Seven current journal file hashes were absent:

| Tag | Journal `when` |
|---|---:|
| `0941a_invitations_org_id_unique_prerequisite` | 1803000010033 |
| `1703_client_onboarding_lifecycle` | 1803093646725 |
| `1704_ai_credit_ledger_convergence` | 1803093647725 |
| `1347_kb_hr_documents_guard_scanned_fields` | 1803093661725 |
| `1427_kb_pages_contradiction_title_index` | 1803093662725 |
| `1431_kb_health_items_repair_action` | 1803093663725 |
| `1728_organization_setup_invitation_receipts` | 1803093664725 |

Sixteen applied hashes did not match current journal file hashes. Three of those match current SQL files outside the journal:

| File | Recorded `created_at` |
|---|---:|
| `1231_hr_reporting_manager_policies.sql` | 1803093625729 |
| `1232_hr_reporting_line_bulk_jobs.sql` | 1803093625730 |
| `1233_hr_reporting_manager_requests.sql` | 1803093625731 |

The other thirteen match no current top-level `migrations/*.sql` file. This is a provenance discrepancy requiring historical hash reconciliation, rather than proof that any migration should be replayed. Their recorded timestamps are `1790099730252`, `1790099743830`, `1790099768782`, `1790099773934`, `1790103617483`, `1803000010460`, `1803000010530`, `1803000010540`, `1803000010550`, `1803000010560`, `1803000010570`, `1803000010691`, and `1803000010701`.

The Build finding and these repository-wide ledger discrepancies have different scopes. Do not automatically apply every missing current hash against production before establishing applied identity and compatibility.

## RLS and grants observed

| Table | RLS enabled / forced | `tenant_isolation` policy |
|---|---|---|
| `invitations` | true / false | ALL, PUBLIC; USING `org_id = app.current_org_id_or_null() OR token_hash = app.current_public_token_or_null()`; WITH CHECK `org_id = app.current_org_id()` |
| `invitation_events` | true / false | ALL, PUBLIC; USING and WITH CHECK `org_id = app.current_org_id()` |
| `outbox_events` | true / false | ALL, PUBLIC; USING and WITH CHECK `organization_id = app.current_org_id()` |
| `organization_setup_invitation_receipts` | Absent | No policy exists. |

As `streamline_app`, `has_table_privilege` returned true for SELECT, INSERT, UPDATE, and DELETE on the three existing tables. Those privileges are subject to RLS at runtime. The receipt migration's intended SELECT/INSERT-only grant cannot be verified until the table exists.

## Reproduction method

The inspection used `node --env-file=.env --input-type=module` from `backend`, importing [the IAM-aware script client](../../../../backend/src/scripts/lib/script-sql-client.mjs). It did not invoke a migration runner.

The connection and transaction pattern was:

```javascript
import { createScriptSql } from "./src/scripts/lib/script-sql-client.mjs";
const sql = await createScriptSql({ connection: { connect_timeout: 10, idle_timeout: 5 } });
try {
  const rows = await sql.begin(async tx => {
    await tx.unsafe("SET TRANSACTION READ ONLY");
    await tx.unsafe("SET LOCAL statement_timeout = '20s'");
    return await tx.unsafe("SELECT current_user AS role, current_setting('transaction_read_only') AS read_only, current_setting('server_version') AS version");
  });
  console.log(JSON.stringify(rows));
} finally {
  await sql.end({ timeout: 5 });
}
```

A second connection passed `url: process.env.APP_DATABASE_URL` to the same helper. Queries selected schema metadata from `pg_class`, `pg_namespace`, `pg_index`, `pg_constraint`, `pg_policies`, `pg_roles`, `information_schema.columns`, and `information_schema.table_privileges`, plus only `hash` and `created_at` from `drizzle.__drizzle_migrations`. `pg_get_indexdef`, `pg_get_constraintdef`, `to_regclass`, and `has_table_privilege` provided the definitions and access checks above. Local source hashes were computed with `createHash("sha256").update(readFileSync(path)).digest("hex")` and matched by exact hash, not watermark alone.

Exact focused dependency query:

```sql
SELECT c.conname AS constraint_name, t.relname AS table_name,
       i.relname AS supporting_index, c.convalidated AS validated
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_class i ON i.oid = c.conindid
WHERE c.conname IN ('fk_invitation_events_invitation_id_org', 'uniq_invitations_org_id')
ORDER BY c.conname;
```

## Evidence limits and remaining proof

Current verified: IAM authentication works for both configured roles; the deployed invitation composite key is valid; `0965`'s same-org invitation-event FK is validated; receipt migration identities and objects are absent; the recorded catalog and ledger discrepancies exist at the observation time.

Current unverified: Empty-chain fail-fast replay, bootstrap replay, upgrade selection and apply-once behavior, rollback dependency retention, lock acquisition/retry, application writes to receipts, asynchronous producer/consumer delivery, invite acceptance, role/tenant denial and corresponding allowed action, persistence after refresh, browser console/network, and deployed application revision parity.

No product acceptance criterion or TODO was completed by this catalog inspection. Runtime and browser evidence remain required.

## Source-only browser fixture readiness

## Invitation prerequisite no-op execution

The coordinator executed the exact final `0941a_invitations_org_id_unique_prerequisite.sql` twice, in separate READ ONLY application-role transactions with a 20-second outer statement timeout. Its SHA-256 was `9d67e947be815713741582cb590149d458f8fa3327a3942e0e7373bb90e2ab1c`. Both executions completed through the existing equivalent `uniq_invitations_org_id` branch. PostgreSQL read-only enforcement would have rejected index creation; neither execution needed DDL. No migration ledger row was inserted, so this is not a deployment or apply-once claim.

This verifies compatibility of the catalog-recognition branch with the actual target. Empty-chain key creation, wrong-shaped canonical indexes, upgrade selection, rollback, locking, and receipt migration `1728` remain Current unverified. The receipt forward SQL remains immutable and may create its named equivalent invitation index even when the historical equivalent already exists.

## Source-only browser fixture readiness (original inspection)

Status: Current unverified until a dedicated verification server is exercised.

The actual signup path is `POST /auth/email-otp` → `findOrCreateUser` → hashed six-digit code → `EmailService` send → `POST /auth/email-otp/verify` → atomic code consumption and email verification → five-minute magic token → frontend `signInWithMagicToken`. OTP values are stored as hashes, so selecting the OTP row cannot recover the code for browser entry. Raw codes and magic tokens must remain in the verification process, outside evidence logs.

The configured production transport is ZeptoMail. Runtime configuration accepts only `zeptomail` and `resend`; there is no native SMTP, file, or mailbox capture provider. Disabling provider credentials makes the OTP send fail with 503. `NODE_ENV=test` disables provider construction unless explicitly rearmed.

An existing test seam is suitable for controlled verification: [CapturingMailTransport](../../../../backend/test/helpers/mail-capture.ts) implements the provider interface, and [the seeded app harness](../../../../backend/test/helpers/seeded-e2e-app.ts) overrides `EmailProviderService` while retaining the actual authentication, email service, and database logic. A dedicated browser runner can reuse this transport pattern without constructing an external sender. The existing seeded harness itself requires a named disposable database; its production refusal must remain intact.

An alternative provider integration check could send to a trusted loopback HTTPS capture endpoint using a synthetic provider token and no Resend fallback. The installed Zepto SDK prefixes HTTPS when the configured URL does not already contain `https://`; a plain HTTP loopback URL is not a valid override. This alternative needs a locally trusted certificate and should not disable TLS verification.

The current backend has no `PROCESS_ROLE` contract. Setting `PROCESS_ROLE=http` does not isolate it from workers. Eleven worker switches are listed in [the seeded process environment](../../../../backend/test/helpers/seeded-process-environment.ts), but the normal `AppModule` still runs `PayrollCalendarReminderScheduler.safeRun()` immediately at module initialization and executes `PermissionCatalogSyncService.sync()` before its optional grant-reconcile guard. [The e2e app](../../../../backend/test/helpers/e2e-app.ts) already uses provider overrides for these initialization seams. A browser runner pointed at production must use explicit background/bootstrap isolation and scoped synthetic records; normal `main.ts` startup with only an invented process-role variable does not provide that isolation.

No verification server, external email, signup, account creation, token issuance, or database mutation was performed during this source inspection.
