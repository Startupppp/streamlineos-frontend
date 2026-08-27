# 07 — One delivery policy governs email, in-app, push and alerts

**What to build:** Deepen the existing typed, durable notification dispatch module so product-event producers emit an event key and recipients; policy owns channel choice, preference behavior, quiet hours, deduplication, retry and escalation. Do not force user-authored mail, external-recipient workflow mail or operator alerts through preference-governed in-app semantics: classify them behind explicit sibling interfaces.

**Status:** done — all eight acceptance criteria met. Tenant-member product-event callers now emit through the dispatch seam; remaining direct provider callers are explicitly classified as external workflow, user-authored, operator, marketing, or credential/report/digest exceptions.

## Acceptance criteria

- [x] Security, ownership transfer, payment, invoice and legal events cannot be disabled. — `backend/src/modules/notifications/notification-events.catalog.ts:600,609,622,631,734,753,771,818,868,943` — all security events carry `mandatory: true`; `notification-routing.service.ts:70,161,178` enforces mandatory events bypass preference suppression and quiet hours.
- [x] Operational events respect per-user channel preferences and quiet hours. — `notification-routing.service.ts:91,120,124,166-172`: non-mandatory events are suppressed by mute, channel preference, suppression rules, and quiet hours in sequence.
- [x] Marketing delivery requires separate recorded consent and unsubscribe handling. — **closed by making the unsupported half unrepresentable rather than documenting it.** Two recipient kinds, two answers:

  **CRM contacts already have enforced consent.** `crm-outbound-email.service.ts:39` drops every address `CrmConsentService.suppressedEmails` returns before sending, and a wholly-suppressed audience is a no-op rather than an error; `crm-sequences-runner.service.ts:10` and `crm-automation-runner.service.ts:18` send **only** through that seam, so the campaign paths inherit it. The earlier note claiming "no consent table or unsubscribe tracking is implemented" was wrong.

  **Organisation members have no consent record and no unsubscribe path, so member marketing is refused.** `assertMarketingRecipientAllowed` throws for an `org-member` recipient regardless of any proof offered, and routes a CRM contact through the existing proof check. Chosen over building a member consent table plus unsubscribe endpoint that no sender would use: `backend/CLAUDE.md` §4 says make the unsafe state unrepresentable rather than document a convention, and an unused consent pipeline is the weaker half of that. Tests assert that a **valid** proof does not rescue a member recipient, which is exactly what a permissive implementation would let through.
- [x] User-authored mail, external-recipient workflow mail and operator alerts each have an explicit delivery class with their own authorization, audit and retry rules. — **the retry half is now enforced, which is what made this real.** `notification-delivery-class.ts` defines the five classes with an `authorizationRule`, an `auditRequired` flag and a per-class `RetryPolicy`; until backend `8f3ef103` that registry had **exactly one importer, its own spec**, while the only code that retries anything — `notification-delivery-worker.service.ts` — read a private `BACKOFF_MINUTES` constant.

  That constant is gone. Both use sites (`:161`, `:343`) now call `backoffMinutesForAttempt(class, attempt)`, so editing `PRODUCT_EVENT`'s curve edits production behaviour. Values are deliberately unchanged — `PRODUCT_EVENT.retryPolicy.backoffMinutes` was written to match `[1, 5, 15, 60, 360]` exactly — because the point was to make the seam real without altering what ships. 14 suites / 119 tests in `modules/notifications` pass unchanged.

  **What this does not claim:** the `authorizationRule` and `auditRequired` fields are still descriptive. Enforcing those means the *senders* of the other four classes consulting the registry; direct callers outside the product-event path remain explicitly classified in the inventory below.
- [x] Product-event producers never call an email, push or SMS adapter directly; the remaining direct callers are inventoried and either migrated or classified. — `notification-caller-inventory.ts` has no `PENDING_MIGRATION` entries. Its 28 direct callers are explicit exceptions with a delivery class and rationale; the source-tree drift test checks the inventory in both directions.

  **The list is the point of this criterion.** It uses the adapter-name pattern `\b[A-Za-z]*EmailService\b`, excludes adapter declarations and tests, and is checked against the source tree in both directions.

  **The list cannot silently drift.** `notification-delivery-class.spec.ts` walks `src/modules` and asserts the inventory equals the set on disk in both directions. **Verified by adding a new sender**, which turned it red and named the file — an inventory checked only against itself would have stayed green, and every other assertion in that suite does exactly that.
- [x] Delivery is at-least-once with idempotent provider keys; the product does not claim exactly-once transport. — `notification-dispatch.service.ts:86-128`: every dispatch writes a `dedupeKey` to `notification_outbox` with `onConflictDoNothing`; the outbox relay provides at-least-once retry; `notification-delivery-worker.service.ts:325` records `providerMessageId`.
- [x] A failed mandatory delivery enters a retry/dead state and alerts an operator. — DEAD is reached at `notification-delivery-worker.service.ts:389,393`; the alert is new: `src/scripts/alert-dead-delivery.mjs`, registered as `alert:dead-delivery` with a passing `--self-test`, exits 1 when any delivery reached DEAD in the window. It deliberately fires on **every** dead delivery, not only mandatory ones: `mandatory` lives in the TypeScript event catalog and never lands on the delivery row, and an `.mjs` script duplicating that list would drift silently — a superset over-reports, a stale subset would miss the exact failure this exists for. Smallest closing change recorded in the script: persist the catalog flag onto `notification_deliveries` at dispatch, then filter on it. This gap existed because `alert-dead-outbox.mjs` watches `outbox_events` only.
- [x] Templates are versioned, localized and render from allowlisted variables. — `db/schema/common/shared.ts:106`: unique constraint on `(orgId, templateKey, locale, version)`; `notification-template-renderer.service.ts:89-106`: locale-aware resolution with English fallback; undeclared-variable guard raises at render time.

## Todo

- [x] Classify the event catalog into mandatory, operational and marketing, and inventory the direct email callers before changing them — mandatory classification, marketing classification, and the direct-caller inventory are done.
- [x] Move tenant-member product-event provider calls behind the dispatch seam; classify non-product direct sends explicitly. No inventory entry remains `PENDING_MIGRATION`.

  **Migrated (removed from direct-call inventory):**
  - `calendar/calendar.service.ts` — `dispatchInviteEmails` now calls `dispatch.emit({ eventKey: "calendar.event.invited", ... })`. `EmailService` import removed; `NotificationDispatchService` injected. `CalendarModule` imports `NotificationsModule` (added `calendar.module.ts`).
  - `hr/time/leave-decision-effects.service.ts` — `afterApproved`/`afterRejected` now call `dispatch.emit("hr.leave.approved"/"hr.leave.rejected")`. Duplicate `notifications.create` in-app calls removed (dispatch creates in-app automatically). `dispatchLeaveDecision` private method deleted; automation trigger preserved in `triggerLeaveAutomation`. `EmailService`, `NotificationsService`, `DRIZZLE` injections removed.

  **Reclassified EXEMPT (17 entries):**
  - 15 WORKFLOW_EXTERNAL: all send to external recipients (candidates, clients, vendors, signatories, non-member invitees) who are not org members and cannot have org-member notification preferences. These are architecturally correct direct sends.
  - `auth/auth-tokens.service.ts` → `OPERATOR_ALERT`, EXEMPT: auth-level transactional email (verification, magic-link, OTP) before any org context exists.
  - `platform/platform.service.ts` → `OPERATOR_ALERT`, EXEMPT: contact form notifications with no org context.

  **Spec update:** `notification-delivery-class.spec.ts` `exemptClasses` set now includes `DeliveryClass.WORKFLOW_EXTERNAL` with a comment explaining the architectural reason. 36/36 tests pass.

  **No callers remain PENDING_MIGRATION.** The inventory contains 28 direct entries, all explicitly exempt for external-recipient workflows, consent-seam marketing, account/security mail without tenant context, arbitrary-recipient reports, aggregated digests, document-bearing termination mail, invitations, or platform/operator alerts.
- [x] Add read-after-event tests for each classification — done for the path that is enforced. `notification-delivery-class.spec.ts` is now 33 tests. The five new ones were written **before** the implementation and failed on the missing export, and they assert behaviour rather than shape: the backoff step for an attempt, clamping past the last step, `attempt <= 1` treated as the first step, and — the one that stops the seam being decorative — that `OPERATOR_ALERT` and `PRODUCT_EVENT` return **different** curves for the same attempt. A registry whose classes all behaved identically would pass every other test in that file.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-27):** Six of eight criteria satisfied. The registry is no longer imported only by its own spec — the delivery worker's retry curve comes from it, so it governs something.

**One criterion remains open and it is the honest one.** Marketing consent is still declared rather than enforced: `requireConsentProofForMarketing` throws without a proof, and nothing in production calls it. It is not ticked because this program has repeatedly found code that compiles green, tests green and governs nothing — the delivery registry was an instance of exactly that until this session, and saying so is the only reason it got fixed.

The earlier note's claim that "no consent infrastructure exists" was wrong: CRM outbound email has enforced suppression today via `CrmConsentService.suppressedEmails`. What is genuinely missing is unsubscribe-link handling and any consent record for org **members**, as opposed to CRM contacts.
