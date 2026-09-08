# CRM release — traceability

**Date:** 2026-09-08
**Branches:** backend `crm/phase-2-3-consolidated` (PR #12) · frontend `crm/phase-4-5-frontend` (PR #31)

Every gap the 2026-09-08 census raised, and where it ended. Findings are
recorded whether or not they became code — three of them were closed by
disproving the finding, and that is the more useful outcome.

## Shipped

| # | Finding | Outcome | Commit |
|---|---|---|---|
| 01 | `crm/p5-ui-and-g1` was 2 commits ahead of both PR heads and unpushed — renewals, health, MCP settings and signup UI were not on either PR | Fast-forwarded both PR heads and pushed. Not a cherry-pick: p5 was already a strict descendant. | be `096e46ab4` · fe `041e5c5ca` |
| 02 | `generateAndHoldQuote` had no caller in `src/` — the golden path stopped at the stage advance | Wired to a stage advance that actually moved the deal, behind `autonomy_settings.auto_quote_enabled`, off by default. `applyStageAdvance` now reports whether it moved anything. 6 tests. | be `e3e2e76d3` |
| 03 | A call's analysis had no URL — X1 asked for list and detail, only the list shipped | `/crm/intelligence/[activityId]`, bound to the existing `GET /crm/calls/:activityId/analysis`. No backend code. | fe `c4cb406a9` |
| 04 | `0631`/`0632` were on disk and in no journal entry, so `check:migration-chain` was red and they never ran | Deleted. `0637`/`0638` carry identical DDL inside the `to_regclass` guards a cold build needs. Gate: UNJOURNALLED 2 → 0. | be `62fd1e85f` |
| 05 | Two phase-3 tickets described outstanding work that had shipped | Corrected; superseded reasoning marked and kept. | fe `fecfe90fe` |
| 06 | **MCP treated an explicitly denied permission as granted** — `resolved.has(key)` is true for a key resolved to `"none"` | Fixed to match `AccessService.holds`. Mutation-checked. Six spec mocks returned a shape production never returns, so every authorization assertion was testing a dead branch — corrected. Adds a real guard-chain isolation spec. | be `c4ba8f8d8` |
| 07 | The handoff claimed the golden path was "inspected but not rerun" | Run: 6/6 inside a whole-suite 129/129, under RLS, on a cold-built database. | be `1b1d394f4` |

## Closed by disproving the finding

| Finding | Verdict |
|---|---|
| "Legacy identity modules were never deleted — `leads/` still has 30 files, `clients/` 14, `contacts/` 12, all mounted" | **Must stay.** ~45 routes have live frontend callers; `SurveysModule` injects `LeadsService` and `LeadsDetailService`, so deleting breaks bootstrap; 11 files under `ai/` and `crm/` import pure helpers out of those directories. The schema collapse — the part X7 actually ratcheted — is genuinely done. Acting on this finding would have 404'd three CRM screens. |
| "Golden path fails — `contact_party_map` NOT NULL violation, then a CHECK violation on `autonomous_decisions.kind`" | **Database drift, not defects.** Both template databases carry 634 applied rows against a 417-entry journal and a watermark stamped 2027; one lacked 0277, the other 0535. Cold-built from this branch, all six pass. |
| "P5-mk segments UI is missing" | **Half right, and the wrong half.** Nurture sequences are complete end to end. Segments exist at no layer — no table, service, route or UI. A feature to build, not a gap to close; UI first would have produced exactly the unreachable surface this programme has been correcting. |

## Open, and why

| Item | State |
|---|---|
| Autonomous deal-open | **Deliberately not built.** Needs a tenant opt-in and audit policy that is a person's decision — a wrong autonomous deal corrupts the forecast people plan headcount against. |
| Quote leg end-to-end coverage | Unit-tested and the migration applies cleanly, but the golden path runs with the opt-in off (the default), so there is no seeded e2e through it. Stated rather than implied. |
| P2-08 "the drop is reversible — snapshot + restore exercised in a test" | No such test found. Not attempted this pass. |
| ~30 dead legacy routes | Real, scoped cleanup. The controllers must stay mounted for the ~45 live routes. |
| Stripe live · EU region cell | Blocked on secrets and provisioning. P3-08's two criteria remain unticked. |
| `check:migration-chain` | Still exits 1: 15 duplicate prefixes, 8 timestamp regressions, 1 chain gap — all pre-existing and unchanged here. The chain still reaches head from empty. |
| Backend + frontend lint | Red repo-wide, pre-existing. |

## How to reproduce the verification

```bash
createdb crm_cold_0908
DATABASE_URL=postgres://…/crm_cold_0908 node src/scripts/db-bootstrap.mjs      # REACHED_HEAD 417/417
DATABASE_URL=… APP_DB_PASSWORD=… node src/scripts/db-bootstrap-app-role.mjs    # READY
DATABASE_URL=<owner> APP_DATABASE_URL=<streamline_app> CRON_SECRET=… \
  node --max-old-space-size=12288 node_modules/jest/bin/jest.js \
  --config ./jest-e2e-seeded.json --runInBand --forceExit                      # 129/129
```

`APP_DATABASE_URL` is not optional. Without it the app runs as the owner, RLS is
bypassed, two harness self-tests fail and the golden path fails a hold
assertion. A green run without it is measuring nothing about RLS.
