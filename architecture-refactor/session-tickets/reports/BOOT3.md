# BOOT3 — Boot and Live Request Exercise Report

**Date:** 2026-08-31
**Org under test:** `2cbb9a74-552b-4382-91ff-ea5a2dc8adcd` (L53 Test Corp)
**Actor:** `45200aba-fee9-4fc5-90eb-6ce7af097112` (OWNER, `isOrgOwner: true`)
**Files changed since BOOT2:** 347 source files newer than the BOOT2 dist

---

## 1. Pre-Boot Checks and Compilation

**Complication:** The first SWC CLI invocation (`node @swc/cli/bin/swc.js src -d dist`) had been run in a previous session without the `cd` to the backend directory. That run put output into `dist/src/` instead of overwriting the nest-build-produced `dist/`. The old `dist/main.js` (from BOOT2's nest build) was still being served by the running server.

**Resolution:**
1. Killed the old server (PID 6916, from BOOT2 era).
2. Deleted the entire `dist/` directory.
3. Ran `cd src && node ../node_modules/@swc/cli/bin/swc.js . -d ../dist/src --config-file ../.swcrc --ignore "**/*.spec.ts"` — this places output at `dist/src/main.js` etc. (3,492 files, 805ms).
4. Started server as `node --env-file=.env dist/src/main.js`.

**Boot result (first boot):** CLEAN — all three markers appeared:
- `RLS enforced — connected as "streamline_app"`
- `RouteClassifierGuard: every route declares its exposure`
- `Nest application successfully started`

**JWT auth change:** The `JwtAuthGuard` now requires `audience: "streamlineos-api"` and `issuer: "streamlineos-web"` in the JWT. The BOOT1/BOOT2 harness did not set these claims. Updated the exercise script to include `.setAudience("streamlineos-api").setIssuer("streamlineos-web")`.

**Permission catalog:** First boot showed 41 retired keys (in-DB but not in catalog), including `calendar:admin:manage`. After fixing the compilation path and restarting, second boot shows **38 retired keys** — `calendar:admin:manage` is correctly in the catalog and no longer retired. The 38 remaining are stale entries from previous eras (CRM, inventory, accounting).

---

## 2. P0 Found and Fixed — `ticket_activity_log.user_id` (42703)

**Symptom:** `GET /build/:projectId/tickets/:ticketId/activity` → 500; `POST /build/:projectId/tickets` → 500 (ticket created but activity log insert fails, rolling back the whole transaction).

**Root cause (confirmed):** Migration `0716_build_attr_contract.sql` dropped `user_id` from `build_events.ticket_activity_log` (replaced with `user_membership_id`). The Drizzle schema was updated correctly, but four service call sites still inserted the dropped column:

| File | Line | Stale code | Fix applied |
|---|---|---|---|
| `src/modules/build/core/projects-tickets-create.service.ts` | 153 | `userId: u.userId` in activity log INSERT | `userMembershipId: actorMap.get(u.userId)?.membershipId ?? null` |
| `src/modules/build/core/projects-tickets-create.service.ts` | 266 | `userId: actingUserId` in `createFromFeedback` INSERT | Pre-resolved membership via `resolveOrganizationActorsByUserIds`; `userMembershipId: feedbackActorMembershipId` |
| `src/modules/build/entity/build-entity.actions.ts` | 325 | `userId: actor.userId` in `logActivity` INSERT | `userMembershipId: actor.membershipId ?? null` (`EntityActor` already carries `membershipId?`) |
| `src/modules/cron/cron-projects.service.ts` | 114 | `userId: template.assigneeId ?? undefined` in recurring ticket INSERT | `userMembershipId: null` (system action, no actor context) |

Also: `batchIds` in `createTicket` was updated to always include `u.userId` (was missing when `body.reporterId` differed from the caller).

**The READ side** (`projects-ticket-subresources.service.ts` `getActivity`) was already updated in source to use `userMembershipId` and join via `organizationPeople.organizationMembershipId`. The stale dist (`dist/main.js`) had the old `user_id` select, which is why the first test run returned 500. After full recompilation from source, the read is correct.

**Verification:** After fix, recompiled (`cd src && node ../node_modules/@swc/cli/bin/swc.js . -d ../dist/src`), restarted server:
- `GET /build/198/tickets/44002/activity` → **200 OK** ✓
- `POST /build/198/tickets` (with `Idempotency-Key: boot3-ticket-003`) → **201 Created** (ticket id=44004) ✓
- `GET /build/198/tickets/44004/activity` → **200 OK** ✓

---

## 3. Health Endpoints

| Endpoint | Status | Note |
|---|---|---|
| `GET /health` | 200 | `{"status":"ok"}` |
| `GET /health/ready` | 200 | `{"status":"ready"}` |
| `GET /health/db` | 401 | Requires `x-internal-secret` header, not Bearer token — intentional |

---

## 4. Module List Endpoints

| Module | Route exercised | Status | Notes |
|---|---|---|---|
| Build | `GET /build` | 200 | 1 project |
| Build | `GET /build/198` | 200 | Project detail with statuses and members |
| Build | `GET /build/all-work` | 200 | 3 tickets |
| Build | `GET /build/roadmap` | 200 | Empty list |
| CRM | `GET /crm/organizations` | 200 | Empty |
| KB | `GET /kb/spaces` | 200 | 3 spaces |
| Chat | `GET /chat/channels` | 200 | Returns channels list |
| Workflows | `GET /workflows` | 200 | Empty |
| Directory | `GET /directory/people` | 200 | 0 people |
| Notifications | `GET /notifications` | 200 | Empty |
| Feedbucket | `GET /feedbucket/widgets` | **402** MODULE_NOT_ENABLED | Feedbucket added to module registry — org does not have it enabled. BOOT2 returned 200 (was unregistered); 402 is correct new behavior |
| Settings | `GET /settings/permissions` | 200 | Permission catalog returned |
| Settings | `GET /settings/feature-flags` | 200 | Returns flags |
| Settings | `GET /settings/custom-fields` | 200 | Empty |
| Settings | `GET /settings/ai-usage` | 200 | Returns AI usage data |
| Mail | `GET /mail/accounts` | 200 | Empty |
| Mail | `GET /mail/messages` | 200 | Empty |
| HR | `GET /hr/employees` | 200 | Returns employees |
| Search | `GET /search?q=test` | 200 | Results returned |
| Calendar | `GET /calendar/events?start=…&end=…` | 200 | Works |
| Payroll | `GET /payroll/runs` | 402 MODULE_NOT_ENABLED | Module disabled |
| Accounting | `GET /accounting/journal` | 402 MODULE_NOT_ENABLED | Module disabled |
| Timesheets | `GET /timesheets/entries` | 402 MODULE_NOT_ENABLED | Module disabled |
| Inventory | `GET /inventory/products` | 402 MODULE_NOT_ENABLED | Module disabled |
| Surveys | `GET /surveys` | 402 MODULE_NOT_ENABLED | Module disabled |
| Support | `GET /support/tickets` | 402 MODULE_NOT_ENABLED | Module disabled |

---

## 5. New Endpoint: `GET /calendar/admin/settings`

`GET /calendar/admin/settings` → **200 OK** (gated on `calendar:admin:manage`, which is in the catalog and correctly resolves for an org owner).

Note: In the first boot (old dist from nest build era), this route returned 404 — the route was not compiled into the old dist. After fresh recompilation from current source, the route is registered.

`calendar:admin:manage` appeared in the "retired keys" warning from the FIRST boot (41 keys) because the old dist catalog did not include it. After recompilation, it correctly appears in the catalog and dropped out of the retired list (38 keys in second boot).

---

## 6. Dropped Column Exercise (Migrations 0715/0716)

### Build: `ticket_activity_log.user_id` (DROPPED by 0716)
- `GET /build/198/tickets/:id/activity` → **500 → 200 FIXED** (P0 — service SELECT still queried `user_id`)
- `POST /build/198/tickets` → **500 → 201 FIXED** (P0 — service INSERT still wrote `user_id`)

### Build: `sprint_scope_events.actor_id` (DROPPED by 0716)
- Schema updated to `actorMembershipId`; `projects-reports.service.ts` selects only `ticketId`, `eventType`, `newPoints`, `createdAt` — no stale column reference found.

### Build: `workflow_transitions.created_by` (DROPPED by 0716)
- Schema updated to `createdByMembershipId`; `workflow.service.ts` correctly inserts `createdByMembershipId: membership?.id ?? null` — no stale reference.

### Timesheets: `locked_by`, `created_by`, `ack_by`, `changed_by`, `resolved_by` (DROPPED by 0715)
- Schema updated to `lockedByMembershipId`, `ackByMembershipId`, `changedByMembershipId`, `resolvedByMembershipId` — no stale column references found in service code.
- Timesheets module is disabled (402) for this org, so live exercise of these endpoints was not possible, but no code-level stale references were found.

---

## 7. Write Tests

| Route | Status | Notes |
|---|---|---|
| `POST /kb/spaces` | 201 | Space id=89 created |
| `POST /build/198/tickets` | **201 FIXED** | Ticket id=44004 created; was 500 before fix |
| `GET /build/198/tickets/44004/activity` | 200 | Activity log readable after fix |

---

## 8. Cross-Tenant Isolation

| Test | Expected | Actual | Pass? |
|---|---|---|---|
| `GET /kb/spaces/1` (other org) | 404 | 404 `Space not found` | PASS |
| `GET /kb/spaces/2` (other org) | 404 | 404 `Space not found` | PASS |
| `GET /kb/spaces/89` (own space) | 200 | 200 with correct data | PASS |
| Token for org `00000000-…` → `GET /kb/spaces/88` | 401 or 404 | 401 (user not in DB) | PASS |

---

## 9. Cursor Pagination

`GET /build/198/tickets?paging=cursor` response structure:
```json
{"success":true,"data":{"data":[...],"total":3,"limit":50,"nextCursor":null,"hasMore":false}}
```

`nextCursor` is **present and `null`** (not absent) when the list is exhausted — inside `data.data`, wrapped by the response envelope. Correct.

---

## 10. KB Search (ANN Fast Path)

`GET /kb/search?q=test&limit=5` → **200 OK**. No 500 from the ANN fast path or fence fallback.

---

## 11. Silent Killer Checks

| Check | Result |
|---|---|
| 42501 errors after writes | None found in log |
| 42703 errors | Found in FIRST run (P0 fixed; not present after fix) |
| TypeErrors | None found |
| JS Date in Drizzle sql template | Not triggered |
| After-commit hook GUC failures | None found |

---

## 12. Boot Warnings (non-blocking)

| Warning | Severity | Note |
|---|---|---|
| `Unsupported route path: "/public/feedbucket/*"` | Low | Auto-converted to `{*path}` — same as BOOT2 |
| `Permission catalog has 38 retired key(s)` | Low | Stale DB entries from removed CRM/inventory keys; cleanup disabled |
| `[payroll-export-worker] / [expense-export-worker] / [payroll-stale-lock-reclaim] organization sweep failed` | Low | 5 unplaced orgs — same as BOOT1/BOOT2 |

---

## 13. Summary

| Category | Finding |
|---|---|
| Boot | Clean — 3,492 files compiled (SWC from `src/` → `dist/src/`); 0 DI errors; 0 undeclared routes |
| P0 Found & Fixed | `ticket_activity_log.user_id` stale reference in 4 service files (BOOT3 introduced by migration 0716); both reads and writes failed with 42703 |
| P0 Verification | `POST /build/198/tickets` → 201 (was 500); `GET .../activity` → 200 (was 500) |
| New endpoint | `GET /calendar/admin/settings` → 200 (route registered in current source; `calendar:admin:manage` in catalog) |
| Dropped columns (timesheets) | Schema updated; no stale references in service code |
| Dropped columns (sprint_scope_events, workflow_transitions) | Schema updated; service code uses `actorMembershipId`/`createdByMembershipId` |
| Feedbucket | 402 MODULE_NOT_ENABLED (added to module registry; correct gating) |
| Cross-tenant | Correct 404 isolation on all probes |
| Cursor pagination | `nextCursor: null` present in `data.data` — correct |
| KB ANN search | 200 OK |
| Silent killers | No 42501; no TypeErrors; no swallowed errors in exercised paths |
| JWT auth | Now requires `aud: "streamlineos-api"` and `iss: "streamlineos-web"` |
