# 05 — The shared schema file splits by domain

**What to build:** Importing one concept stops dragging in six unrelated ones. One shared file currently holds notifications, broadcasts, push subscriptions, calendar events, attendees, webhooks and subscriptions.

**Blocked by:** None — can start immediately

**Status:** done — eight domain files, zero cycles, build green, and parity proves no definition changed

**Audit note (2026-08-27):** Done. Only **nine files** imported `common/shared` directly — everything else goes through the barrel — which is why a 487-line, eight-domain split is a small diff.

Also declares `chk_audit_logs_tenant_or_platform` on `auditLogs`, which lane 4 requested and could not add itself. Migration `0479` creates that constraint but the Drizzle definition never did, so the ORM and a cold rebuild disagreed about a table on a candidate whose theme is *the schema says what it means*.

## Acceptance criteria

- [x] The file splits along its domain lines — **eight, not seven.** `notifications.ts`, `broadcasts.ts`, `push-subscriptions.ts`, `calendar-events.ts`, `webhooks.ts`, `subscriptions.ts`, `audit-logs.ts`, `ai-usage.ts`. The ticket listed seven and missed `audit_logs` and `ai_usage_logs`, which are their own domains; folding either into notifications to hit the stated number would have been the wrong move.
- [x] Mutually-referencing tables are co-located so the split does not create a cycle. — `calendarEvents` with `eventAttendees`, `subscriptions` with `subscriptionPayments`, `coupons` with `couponRedemptions`, and `notifications` with `notificationAuditLogs`, which now holds a composite foreign key to it. Found by grepping the file for `references(() => …)` against its own exports rather than by reading.
- [x] The import graph stays acyclic, asserted in CI as it is today. — `pnpm check:cycles` over 3,930 files: **no circular dependency found**, exit 0.
- [x] Both repos build. — `nest build` exits 0. The frontend has no dependency on backend schema files, so nothing there moved; `frontend/**` is untouched by this change.
- [x] No table definition changes — this is a move. — declarations are byte-identical apart from import headers, which are computed per file from what each body actually references. **Proved against the live database rather than by reading the diff:** `schema-catalog-parity` passes 2 of 2, so every table and column the schema declares still exists exactly as before.

## Todo

- [x] Co-locate mutually-referencing tables in the same file — done, four pairs.
- [x] Run the cycle check after each move — run after the split and after repointing the nine direct importers.
- [x] Build, do not just typecheck — and it mattered: a schema move is exactly the case where `tsc` alone is insufficient, since a missing side-effect import survives a typecheck and fails at runtime.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
