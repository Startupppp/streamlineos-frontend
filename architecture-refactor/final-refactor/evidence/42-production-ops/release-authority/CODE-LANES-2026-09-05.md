# Code-level release lanes — 2026-09-05

Verified results only. Anything not measured is recorded as not measured, never as passing.

## Landed and committed

### `d753b6277` — four lanes

| Lane | Defect | Fix |
|---|---|---|
| C010 | Three HR file-reference schemas accepted any `https://` URL. The safe branch's folder regex matched only legacy flat keys, so `https://` was the only branch a modern client could take — a same-org caller could store a key under `<orgId>/payslips/…` and read it back through an HR endpoint signing with `preauthorized: true`, bypassing the sensitive-folder gate. | Scheme-rejecting key pattern in all three schemas, plus a `parseStorageKey` folder allowlist at the four HR controllers that sign preauthorized. |
| C010 | `signDownloadToken` / `verifyDownloadToken` / `assertUploadAllowed` unreachable from any request path, with 16 assertions covering them. | Deleted, with their specs. |
| C145 | `calendar-export` used `LEFT JOIN` + `isNotNull` as the third arm of an `OR`, defeating both the index and the semi-join: export cost was O(caller's attendance) regardless of date range. | Correlated scalar subquery, matching `CalendarEventSourceLoader.attendedByCaller`. |
| C145 | `getUpcomingNativeEvents` reachable from no controller. | Removed with its spec. |
| C005 | `c145-realtime-and-inbox-budgets.spec.ts` threw `ERR_UNSUPPORTED_ESM_URL_SCHEME` on Windows before any assertion ran — 0 tests, reported green. Fourth occurrence of this bug in this repo. | `pathToFileURL`. Gate now runs 25 tests and is honestly red. |
| C152 | `POST /chat` piped through `pipeAiTextStream`, which drops every tool-call event, so tool progress was invisible while the model worked. | `pipeAiUiMessageStream`. Credit reserve/settle unaffected — `onFinish` is wired into `streamText`, not the pipe. |

Typecheck exit 0. Named specs run per lane. Lint and full suite not run.

### Route budget declarations

Four routes had no entry in `contracts/route-budgets.json`: `GET /chat/ably-token`,
`GET /support/ably-token`, `GET /me/inbox/unified`, `GET /me/inbox/unified/count`. Added with
ceilings derived from their existing read-cost catalog entries and comparable routes; every
`measured*` field left explicitly `null`. The c145 gate moved **9/25 → 17/25**. The remaining 8
failures are measurement-blocked and are correct failures, not suppressed.

## C018 — disposable-database E2E

Run at the pinned disposable host with all four database URLs enumerated and a fail-closed guard.

| | |
|---|---|
| Suites | 24 passed, 4 failed, 1 skipped (29 total) |
| Tests | 200 passed, 22 failed, 1 skipped |
| `Received: 401` | **0** (was 72 under the misconfigured harness) |

Failures: `crm-tenant-isolation` and `crm-import-roundtrip` (CRM is out of release scope), plus
`bola-live-cross-tenant` and `route-budget-http`, which failed on `ssl: false` hardcoded for a local
Postgres — Neon refuses a non-TLS connection. Fixed via a shared `requiresTls` helper exported from
`src/db/pool.config.ts` where the Neon-host rule already lived. Re-verification pending.

The skip is `t15-own-tenant-500`, which replays 88 real requests including DELETEs and is opt-in by
design. It was deliberately left off.

### Two harness defects found, both disclosed

1. **The runner reported a false pass, twice.** The invocation ended `… > log 2>&1; echo "EXIT=$?"`,
   so the shell status was the trailing `echo`'s — always 0. The background runner reported
   "exit code 0" while the log said `SEEDED_E2E_EXIT=1`. Reading the log rather than the reported
   status is what caught it both times.
2. **Three suites skipped themselves silently**, including the live BOLA cross-tenant sweep — the
   first-listed risk class in the constitution. They skip when their inputs are absent. Two are now
   supplied: a throwaway Ed25519 keyring generated per run (never a stored credential) and the seeded
   org ids.

### Organization placement

Two organisations seeded before `placeOrg` was added were unplaced, which resolves as
"has no region" and 401s every authenticated request. Repaired `2 → 0` and the repair is now a
fail-closed step in the harness. Production org creation was checked and is **not** affected:
`auth.service.ts:83`, `org-profile.service.ts:260` and `org-setup-resolver.service.ts` all call
`placeOrganization`. The unplaced rows came from a test fixture inserting directly into
`organizations`.

## C151 — three measured negative results

| Attempt | Measured delta | Verdict |
|---|---|---|
| Remove `MotionProvider` | **0 bytes** — it imports only `MotionConfig`, a context wrapper | Not made |
| Lazify `product-switcher-menu` alone | **−513 bytes** of a 301,635-byte baseline | Reverted |

Both PRD-named remedies are therefore disproved. framer-motion holds **41,256 gzip bytes** minimum
across two shell chunks (animation runtime, gesture system). The engine cannot be evicted while any
eager shell import pulls it, and the remaining roots are `@animateicons/react` consumers —
`QuickCreateButton`, `MobileShellFab`, `MobileModuleBottomNav`, `SidebarAnimatedNav`. Evicting it
requires cutting every eager root in one coordinated pass, which costs the idle icon animations.
That is a product decision, not a mechanical fix.

Other shell contributors, measured: Radix UI 73,681 gz (structural), shell navigation 41,571 gz
(structural), date-fns 10,081 gz, Ably realtime 8,368 gz.

## Recorded but not fixed

- **`POST /chat/channels/{channelId}/messages` is measured at p95 5,043 ms against a 1,000 ms budget**,
  with `requestDbCalls: 53` and `gucCalls: 21` — 21 GUC calls means roughly 21 separate tenant
  transactions in one request. The capture's `totalOperations` is 3,613 against a live 3,653, so this
  measurement is from an earlier commit and predates the chat fan-out work in `92d4aa4f6`. It needs
  recapture before anyone concludes either that it is still true or that it was fixed.
- **44 undeclared cron batches against a recorded watermark of 43.** A scheduled batch was added
  without a budget. The watermark must not be raised; the batch needs a budget.
- **Route budget coverage is 97 of 3,653 operations (2.7%)**, or 2.97% against the 3,264 in-scope
  operations once CRM (191) and Inventory (198) are excluded. Both numbers are recorded; neither
  denominator is used to flatter the other.
- **`measuredDbCalls` is populated for 3 of 97 entries.** The ceiling is declared everywhere and
  enforced on three routes. A declared-but-unmeasured ceiling is not enforcement.
- **22 CRM tables have RLS enabled but are not exercised** by `crm-tenant-isolation`. That is a
  coverage gap in the safe direction, not a cross-tenant hole — the spec asserts that every
  RLS-enabled table appears in the list it probes.
