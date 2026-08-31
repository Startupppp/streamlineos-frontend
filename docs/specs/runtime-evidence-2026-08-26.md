# c1–c9 runtime evidence — 2026-08-26

These values were captured from the configured Neon database using the
configured `neondb_owner` role (`BYPASSRLS = true`). The report commands use the minimal
`ArchitectureEvidenceModule`, so unrelated product integrations do not affect
the evidence run. Queries remain explicitly organization-scoped and the
transactions are read-only, but this run is not evidence that RLS policies
restrict the connecting role.

## c1/c2 tenant-safe read-only report

Command: `node --env-file=.env -r ts-node/register src/scripts/report-kb-calendar-runtime-evidence.ts`

```json
{"organizations":44,"succeeded":44,"failed":0,"readOnly":true,"c1":{"embeddingProviderConfigured":true,"totalPages":1,"eligiblePages":1,"indexCandidatePages":1,"contentlessEligiblePages":0,"indexedEligiblePages":0,"eligibleWithoutChunk":1,"targets":[{"orgId":"aa5627a2-a7de-4dca-97d2-135f3a5f801b","pageIds":[43]}],"chunkAclMismatches":0,"orphanChunks":0},"c2":{"preferenceRows":0,"preferenceScopes":0,"disabledRows":0,"enabledRows":0,"unknownSourceKeys":0,"invalidOwnerRows":0}}
```

The sweep is explicitly tenant-scoped, read-only, and failure-free. Embeddings
are configured, and c1 still has one text-bearing index candidate without a
`page_body` chunk; the guarded backfill and seeded end-to-end parity proof
remain open. The target remains organization `aa5627a2-a7de-4dca-97d2-135f3a5f801b`,
page `43`. c2 has no persisted preference rows and no integrity violations;
this verifies database safety, not live HTTP controller behavior or RLS under a
non-bypass role.

## c6 article migration report

Command: `pnpm report:kb-article-migration`

```json
{"organizations":44,"totalArticles":1,"alreadyMigrated":0,"willMigrate":1,"failedOrganizations":0,"retirementReady":false}
```

The report is complete and failure-free, but the conversion backlog is not
empty. The target remains organization `aa5627a2-a7de-4dca-97d2-135f3a5f801b`,
article `1` (`Getting Started with StreamlineOS`). The conversion/intake PRD
and code must therefore remain.

## c9 outbox report

Command: `pnpm report:outbox-events`

```json
{"organizations":38,"succeeded":38,"failed":0,"totalRows":31,"pending":6,"inFlight":0,"dead":0,"oldestPendingAt":"2026-08-25 12:59:23.680386","oldestEventAt":"2026-08-18 11:09:33.990946","distinctEventTypesAcrossTenants":21}
```

The report covers every active organization with no sweep failures. There are
six pending rows and no dead rows; partitioning remains threshold-deferred and
external provider deduplication remains an operational requirement. Migration
`0474` is registered, deployed, and detected by the report. The external-effect
ledger currently has zero rows across 44 organizations, so no live effect or
crash-window counts are claimed yet.

## c9 re-audit — 2026-08-27

Command: `node --env-file=.env -r ts-node/register src/scripts/report-outbox-events.ts`

The current live report found 44 active organizations, with 44 successful
tenant sweeps and zero sweep failures. The generic outbox has 6 `PENDING`, 0
`IN_FLIGHT`, and 0 `DEAD` rows. The oldest pending row is from
`2026-08-25 12:59:23.680386`.

Migration `0474_external_effect_ledger` is deployed: the report returned
`externalEffects.deployed=true`. The ledger currently has 0 rows, including 0
pending, 0 in-flight, 0 failed, 0 succeeded, and 0 uncertain retries. This is
deployment evidence, not evidence that future provider calls are exactly once.

The worker was not invoked. This is required because `OUTBOX_DISPATCH_ENABLED`
is unset and the implementation treats every value other than explicit
`false` as dispatch-enabled. A flush claims and updates outbox rows, invokes
registered consumers, and may call Ably/Web Push or other downstream services.
Therefore the six pending rows cannot be classified as side-effect-free from
the read-only report and must not be processed without the cron secret and
explicit operator authority. The report itself performed no writes.
