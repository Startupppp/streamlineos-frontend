# DECISIONS — Notifications & Realtime Delivery

Every assumption taken without waiting, with its rationale and reversal cost.
Answered decisions are marked **[confirmed]**; the rest were taken on the conservative default.

---

## D-1 — Direct-email sites: enforce at the choke point, do not migrate **[confirmed]**

**Decision.** Leave all 75 `EmailService.send*` call sites alone. Put suppression, consent and
tenant stamping inside `EmailOutboxService.enqueueAndTry()`.

**Why.** `EmailService` overrides the base sender (`email.service.ts:46`:
`override sendEmail(o) { return this.outbox.enqueueAndTry(o) }`), so every named sender already
funnels through that one method. 75 sites across 18 modules buys nothing one method does not.

**Reversal cost.** Low. The choke-point gate stays correct even if sites later move onto the engine.

**Residual.** The 3 `AutomationEmailService` sites call `dispatchEmail()` directly and skip the
outbox entirely — they are genuinely unprotected and still need migrating. Tracked.

---

## D-2 — Partitioning deferred; PKs widened instead **[confirmed]**

**Decision.** Do not partition `notifications` / `notification_deliveries` / `notification_queue`
now. Widen the PKs to `bigint` identity instead (still open as SCH-001).

**Why.** §19 forbids partitioning a table that is not demonstrably large — these hold 3, 5 and 2
rows. The partition key must join every unique constraint, so `(org_id, id)` would become
`(org_id, id, created_at)` and the Wave-4 composite tenant FKs could no longer be declared. Same
call the Inventory programme made for `inv_stock_transactions`.

**Reversal cost.** Rises with row count. **Recorded trigger to revisit: 50M rows in `notifications`,
or 30 days of retention exceeding 100 GB.**

---

## D-3 — `notification_templates` kept, uninvested **[confirmed]**

**Decision.** Keep the table and its service; add nothing to it in Phase 1.

**Why.** 0 rows and 0 referenced `template_key`s, but it is an unused *feature*, not dead code —
the service and the render path both read it. It is already keyed
`(org_id, template_key, channel, locale, version)`, which is exactly what WhatsApp's approved-template
state and per-locale bodies need. Deleting it means rebuilding it.

**Reversal cost.** Low either way while it is empty.

---

## D-4 — Ably kept as the realtime transport **[confirmed]**

**Decision.** Keep Ably. Fix its two real defects rather than replace it.

**Why.** Deployment is a long-lived container, so the transport is a free choice, not forced. Ably
is already paid for and already carries chat, and the client already treats the realtime message as
an invalidation trigger.

**Reversal cost.** High — replacing a transport is a migration. Avoided.

---

## D-5 — Retention: 90 days bodies, 13 months metadata **[confirmed]**

**Decision.** Purge rendered content at 90 days; delete the row at 13 months.

**Why.** Metadata outlives the body so a delivery dispute or bounce history stays answerable long
after the content stops being worth the exposure.

**Reversal cost.** **Irreversible for already-purged rows.** This is the one decision here that
destroys data. Mitigated by: metadata is preserved, the sweep is cron-triggered rather than
automatic, and nothing runs it until an external scheduler is pointed at it.

---

## D-6 — ZeptoMail webhook: shared secret, not a guessed HMAC **[confirmed]**

**Decision.** Verify ZeptoMail callbacks with a constant-time shared secret
(`x-zeptomail-webhook-secret`). Resend uses full Svix HMAC.

**Why.** ZeptoMail's documented signing scheme is not confirmed against a live account. Inventing
an HMAC construction that is wrong would silently accept everything — strictly worse than a strong
shared secret, which is genuinely secure.

**Reversal cost.** Low — one method. **Needs confirmation against a live ZeptoMail account.**

---

## D-7 — Push payloads: strip content everywhere, no exceptions **[confirmed]**

**Decision.** `pushPayloadSchema` carries `{category?, url?, notificationId?}` and no free-text
field. Chat loses its lock-screen message preview.

**Why.** §20 requires making the unsafe state unrepresentable rather than documenting a convention;
a `body` field commented "nothing sensitive here" is the version that leaks. A per-event opt-in flag
was rejected for exactly the reason `kb-rag.service.ts`'s `publicOnly` flag was removed.

**Reversal cost.** Low — restore a field. **Cost accepted knowingly: chat push previews are gone,
which users will notice.**

---

## D-8 — Backend before frontend **[confirmed]**

**Decision.** Finish pipeline correctness and compliance before the Phase 8 UI pass.

**Exception taken:** `frontend/public/sw.js` was changed alongside RT-001, because without it push
would render an `undefined` body. Coupled change, not scope creep.

---

## D-9 — Build event keys renamed code-side to `build.*` **[confirmed]**

**Decision.** Rename the 9 `project.*` catalog keys to `build.*` and change the emit sites to match,
rather than adopting the code's colon notation.

**Why.** 121 of 130 events already use dot notation, and §16 renamed the module to Build. Adopting
colons would introduce a second key format and force weakening the format assertion in
`notification-catalog-integrity.spec.ts`.

**Reversal cost.** Low now (`notification_preferences` is empty, 0 org overrides — both verified
before deleting). Rises the moment a user saves a per-event preference.

**Deliberate non-action.** Historical `notifications` / `notification_deliveries` rows keep their
old `event_key`. They record what was actually sent; rewriting delivery history to match a later
rename would misstate the past.

---

## SEQ-001 — SCH-014 must not ship before the fire-and-forget conversion

**Not a preference — the reverse order is a silent outage.**

Probed as `streamline_app` with no tenant GUC: an `email_outbox` INSERT with
`organization_id = NULL` **succeeds**; with a real org it dies `42501`. All 34 rows are NULL, and
~14 `void this.email.send…` sites fire after their request transaction has committed. They work
**because** the column is nullable.

Making it `NOT NULL` before converting those sites to `registerAfterCommit` +
`runInNewTenantTransaction` breaks every transactional email at once, silently, payslips included —
each site already discards its error.

---

## SNAP-001 — Drizzle snapshot chain left stale, deliberately

Migrations `0408`, `0410`–`0415`, `0417` were hand-authored and journalled but have no
`migrations/meta/NNNN_snapshot.json`. The next `db:generate` will re-propose applied work.

**Why not fixed:** hand-crafting snapshot JSON risks being subtly wrong, which bakes the error into
the chain — worse than a known-stale state that is documented. Regenerating the chain from the live
DB is the correct fix and is a separate, verifiable task.

**Consequence if ignored:** a future `db:generate` proposes re-adding `visibility_resource_kind`,
re-creating `email_suppressions`, and so on. Discard those statements or regenerate first.

---

## Conservative defaults applied without being asked

| Unknown | Default taken | Where |
|---|---|---|
| Is a declared visibility kind with no resolver safe? | **Deny** | `notification-visibility.registry.ts` |
| Is an event with no `entityId` but a declared kind safe? | **Deny** | same |
| Should a resolver exception allow delivery? | **Deny**, and log | same |
| Can a tenant override row remove a visibility check? | **No** — catalog wins | `rowToDefinition` |
| Is an unsigned/unverifiable webhook acceptable? | **Reject 401** | `email-webhook.service.ts` |
| Does suppression apply to mandatory notification types? | **Yes** | `enqueueAndTry` |
| Should a withheld send store its body? | **No** | `applySuppression` |
| Should the retention sweep delete unbounded? | **No** — batched, capped, warns on cap | retention service |
| Should `support.ticket` / `crm.deal` resolvers be registered? | **No** — their checks are tenant-only, registering them would be security theatre | see `REFACTOR-STATE-NOTIFICATIONS.md` |
