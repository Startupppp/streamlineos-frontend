# 24 — An organization switch is revalidated in the target cell

**What to build:** Switching organizations works across cells and is authorized by the cell that owns the answer. The list of organizations someone can switch into is a fast global projection; the permission to enter one is re-checked against that organization's own cell before a session is issued.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** done

**Not blocked by 01 (revised 2026-08-28).** This ticket originally listed 01 as a blocker. It does not need it: `POST /organization/switch` already performs a membership check today, so the revalidation this ticket moves into the *target cell* has an existing check to relocate. Ticket 01 makes membership resolution uniform across the request path and is worth having, but waiting for it would serialise two independent pieces of work. If 01 has already landed, use the resolved membership; if it has not, use the check that exists.

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the PRD is emphatic that the discovery index is *"a projection, never authorization truth: a switch is revalidated against the target cell before a session is issued."* `POST /organization/switch` already accepts a different org's id and is membership-checked (root `CLAUDE.md` §5) — that check has to move to, or be repeated in, the target cell. `users.lastActiveOrgId` (`db/schema/common/auth.ts:154`) exists today and is a global column pointing at an organization that may live elsewhere. The frontend already clears its cache on switch; ticket 17 makes that structural rather than remembered.

## Acceptance criteria

- [x] A derived account-to-organization index in the control plane answers *"which organizations can this account see?"* without querying every cell.

  `account_organization_index` (`db/schema/common/organization-directory.ts`), PK `(user_id, org_id)`, carrying `cell_id` and `region` alongside the display fields. `AccountOrganizationIndexService.listForUser` answers the switcher from that one table; `listUserOrganizations` reads it and falls back to the live cross-org query only when the projection is cold, so an empty index never reads as "no organizations".

- [x] The index is a projection: it is rebuilt from cell truth, is allowed to be stale, and is never the basis for issuing a session.

  `rebuild()` iterates via `forEachOrg` and reprojects each organisation's members from inside that organisation's own tenant transaction. `projectedAt` is on every row, so the staleness the revalidation tolerates is visible rather than assumed. No session is issued from it — `switchOrg` re-reads membership in the target cell first.

  **The sweep is scheduled, not merely written.** `GET|POST /cron/account-org-index-rebuild` on `CronPlatformController`, behind `assertCronSecret` and a 600-second `cronLease` so two instances cannot sweep at once. This was caught late: `rebuild()` existed with no caller for a while, which would have made this criterion's evidence false — a periodic sweep that nothing invokes is not a periodic sweep. Verified by `grep` for the call site, not by intent.

- [x] Every switch revalidates live membership in the **target** cell before the session is issued; a membership removed in that cell denies the switch even while the index still lists it.

  `switchOrg` resolves placement first, takes the target cell's connection from the registry, and runs the membership and organisation checks on **that** connection. Previously every check ran on the primary. All the original exception types survive unchanged (`BadRequest` for a non-member, `Conflict` for `SUSPENDED`, `Forbidden` for `LEFT`).

- [x] A switch into an organization whose placement is `MOVING`, `READ_ONLY` or unknown behaves as ticket 20 declares, rather than falling back to the current cell.

  Resolution goes through `admittedPlacementForOrg(targetOrgId, "write")`, so ticket 20's declaration is the only source of the answer. `PlacementRefusedError` propagates unchanged (503 retryable / 409). An **unknown** placement is deliberately re-mapped to `NotFoundException` rather than leaking the registry's internal message — a cross-tenant miss must not become an existence oracle (`backend/CLAUDE.md` §4).

- [x] The switch invalidates the frontend cache and the authorization snapshot for the outgoing organization in the same flow.

  The outgoing organisation is read from `users.lastActiveOrgId` **inside the same transaction, before** it is overwritten. After commit the flow invalidates `CACHE_KEYS.userSession(userId)` and `CACHE_KEYS.accessVersion(outgoingOrgId)`.

- [x] A test proves a stale index entry cannot grant access, by removing the membership in the target cell without refreshing the index.

  ```
  PASS src/modules/organization/core/org-switch-revalidation.spec.ts
  PASS src/modules/organization/core/account-organization-index.spec.ts
    √ denies the switch when membership is absent in the target cell even though index listed it
    √ refuses the switch when the target org placement is MOVING
    √ refuses the switch when the target org placement is READ_ONLY
    √ reads inside the identity transaction, because a pool read returns nothing under RLS
    √ writes inside the identity transaction, because a pool write dies 42501 under RLS
  Tests: 16 passed (switch) + 9 passed (index)
  ```

  The target-cell test installs two bindings whose fake connections record which one opened a transaction, and asserts the primary's is never used.

## Findings

**The projection was written on the pool, under RLS, and the failure was swallowed.** The first implementation issued `listForUser`/`refreshForUser` on `this.db` outside any transaction, and wrapped the call in `.catch(() => undefined)`. Proved against the live database as `streamline_app` (`rolbypassrls = false`) with a rolled-back insert:

```
connected as streamline_app bypassrls = false
NO GUC      -> code=42501 new row violates row-level security policy for table "account_organization_index"
app.user_id -> RLS passed
```

So every refresh would have failed forever and silently, and every read would have returned zero rows — which the cold-path fallback would have masked as "the index is just empty". Fixed by running every read and write inside `withIdentity`, and by logging the deferred failure instead of discarding it. The doubles now put `insert`/`delete`/`select` **only** on the transaction, so a regression back onto the pool fails the suite.

## Todo

- [x] **Rebuild strategy decided before building: periodic sweep plus opportunistic refresh.** The staleness bound is the sweep interval, which is exactly what target-cell revalidation exists to tolerate. Event-driven upserts were rejected because every membership mutation site sits in another session's territory, which would have left this criterion open waiting on them.
- [x] `lastActiveOrgId` looked at and deliberately left alone — reported to S2 in [`CROSS-SESSION.md`](../sessions/CROSS-SESSION.md); it is the same class of fact ticket 14 is contracting off `users`, and splitting ownership of the column mid-flight would collide.
- [x] The index did not become authorization by convenience: it is read for the *list* and never for the *entry*.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
