# Notification cron schedule — required operator configuration

**Nothing in this document runs by itself.** `@nestjs/schedule` is not registered anywhere in the
backend: every `/cron/*` job is a `@Public()` REST endpoint guarded only by a bearer `CRON_SECRET`,
and it fires only when an external scheduler calls it. If the scheduler is not configured, these
features are silently inert — no error, no log, no symptom except notifications that never arrive.

That is the failure mode this page exists to prevent. Five of the endpoints below were added by the
notifications programme and have **never been scheduled anywhere**.

Call with:

```
POST https://<api-host>/cron/<endpoint>
Authorization: Bearer $CRON_SECRET
```

`GET` is accepted on every one of these for schedulers that cannot issue `POST`.

---

## Added by the notifications programme — not yet scheduled

| Endpoint | Cadence | Why that cadence |
|---|---|---|
| `notification-time-sweeps` | **hourly** | Contains the SLA-breach check, whose window is one hour wide. Run it less often and breaches are missed entirely, not merely delayed. |
| `build-due-sweep` | **daily**, early morning | Ticket due-soon/overdue and sprint-ending all match a *day boundary*. Running twice in a day re-emits the same set and the dispatcher's dedupe absorbs it; running less than daily skips a day's transitions permanently. |
| `notification-digest-flush` | **every 15 min** | Digests are held until their window elapses. The flush granularity is the worst-case lateness a user sees, so this bounds "my hourly digest arrived 50 minutes late". |
| `notification-outbox-flush` | **every 1–5 min** | Drains the transactional outbox. This is the path that makes a notification durable across a crash; latency here is user-visible delay on ordinary sends. |
| `notifications-retention-sweep` | **daily**, off-peak | Purges rendered bodies past retention (SEC-009) and deletes expired rows. Destructive and irreversible — see `DECISIONS-NOTIFICATIONS.md#D-5` before enabling. |

### What breaks if each is not scheduled

- **`notification-time-sweeps` unscheduled** → `support.ticket.sla_breached`, `crm.followup.due`,
  `crm.followup.overdue`, `billing.invoice.due_soon`, `sign.document.expiring` and
  `calendar.event.starting_soon` never fire for anyone. These events cannot be triggered by any
  user action; the sweep is their only source.
- **`build-due-sweep` unscheduled** → no assignee is ever told a ticket is due, overdue, or that a
  sprint ends tomorrow.
- **`notification-digest-flush` unscheduled** → every user who chose an hourly/daily/weekly digest
  receives **nothing at all**. Their items accumulate in `notification_digest_items` unflushed. This
  is worse than the pre-digest behaviour, because the preference silently swallows their notifications.
- **`notification-outbox-flush` unscheduled** → notifications whose delivery was deferred past commit
  are never relayed.
- **`notifications-retention-sweep` unscheduled** → rendered bodies (including payslip figures) are
  retained indefinitely, which is the compliance exposure SEC-009 was raised for.

---

## Already-existing notification-path jobs

These predate the programme and should already be scheduled. Verify them — the digest and time
sweeps are useless if the delivery worker itself is not running.

| Endpoint | Cadence | Purpose |
|---|---|---|
| `notification-delivery-flush` | every 1–5 min | Claims queued deliveries and calls the channel providers. **The whole pipeline terminates here** — if this is not scheduled, nothing is ever actually sent, regardless of everything above. |
| `email-outbox-flush` | every 1–5 min | Retries queued email. Runs a platform pass *and* a per-org pass (SCH-014); both are required or verification/password-reset mail stops retrying. |
| `chat-reply-reminders` | every 15 min | Chat reply reminders. |
| `daily-notifications` | daily | Birthday notifications. |
| `holiday-notifications` | daily | Upcoming holiday notifications. |

---

## Verifying a schedule is actually live

Each endpoint returns a JSON body reporting what it did, so a scheduler log is enough to confirm it
is running — and a persistently all-zero result on a busy tenant is a signal worth investigating,
not a healthy one:

```json
{"success":true,"message":"Follow-ups 0 due / 0 overdue; 0 SLA, 0 invoice, 0 envelope, 0 calendar",
 "due":0,"overdue":0,"slaBreached":0,"invoicesDueSoon":0,"envelopesExpiring":0,"eventsStartingSoon":0}
```

A per-organization failure inside a sweep is logged and **skipped, not surfaced in the response** —
`forEachOrg` deliberately continues to the next tenant so one broken org cannot stop the rest. A
sweep can therefore return `200` while having failed for every organization. Check the application
log for `organization sweep failed` before concluding a zero result means "nothing to do"; that
exact trap produced a green `200` with 5/5 orgs failing during development.

---

## Full endpoint inventory

There are **41** `POST /cron/*` endpoints in `src/modules/cron/*.controller.ts` as of 2026-08-14.
The Phase 0 recon (`docs/hrms/_recon/L-jobs-notifications.md`) documented 35 and is now stale; that
document remains accurate about the *mechanism* — external scheduler, bearer secret, no in-process
scheduler — which is the part that matters here.

Enumerate the current list rather than trusting any written copy of it:

```bash
grep -rhoE '@Post\("[a-z0-9-]+"\)' backend/src/modules/cron/*.controller.ts | sort -u
```
