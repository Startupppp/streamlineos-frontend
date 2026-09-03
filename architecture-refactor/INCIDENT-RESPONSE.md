# Incident response — ownership, escalation, severity, communication and review

**Written: 2026-09-03.** Closes v2 ticket 34 / **PRD-C178** — *"Publish on-call ownership,
escalation, incident severity, customer/status communication and post-incident review procedures."*

Sibling of `SLO-CATALOGUE.md` (what we promise), `RETENTION-POLICY.md` (what we keep) and
`PROVIDER-RELIABILITY.md` (who we depend on). This document is what happens when a promise breaks.

> **Status of this document.** Every procedure below is written and complete. Every place that
> requires a real human name, a rota, a phone number, an external account or a contract is marked
> **`[HUMAN REQUIRED]`** and left blank. No agent may fill those in. A rota with an invented name in
> it is worse than no rota, because someone will rely on it at 03:00.

---

## 1. On-call ownership

### 1.1 The owner vocabulary is already defined in code

Ownership is not invented here. `backend/src/common/slo/slo-types.ts` declares the single owner
vocabulary, and `slo-catalogue.spec.ts` fails the build if an SLO or an alert names an owner outside
it. There are nine owners:

`platform-reliability`, `notifications-team`, `payments-team`, `people-team`, `delivery-team`,
`finance-team`, `knowledge-team`, `communications-team`, `support-team`.

**Do not add a tenth owner in a document.** Add it to `SLO_OWNERS` and let the spec enforce it.

### 1.2 Which owner is paged, per alert

Taken from the dispatch registry in `backend/src/scripts/alert-dispatch.mjs`. The alert payload
carries `owner`, `severity`, `alertId` and `runbook` on every dispatch — verified 2026-09-03 by
`pnpm -C backend alert:dispatch:self-test`, which asserts `case1BodyHasOwner`, `case1BodyHasRunbook`
and `case1BodyHasAlertId` and exits 0.

| Alert | Owner | Registry severity | Runbook anchor |
|---|---|---|---|
| `dead-outbox` | platform-reliability | critical | `#dead-outbox` |
| `tenant-ctx-errors` | platform-reliability | critical | `#tenant-ctx-errors` |
| `cell-recovery` | platform-reliability | critical | `#cell-recovery` |
| `retention-dead-man` | platform-reliability | critical | `#retention-dead-man` |
| `dead-delivery` | notifications-team | high | `#dead-delivery` |
| `sig-failures` | payments-team | high | `#sig-failures` |
| `p95` | platform-reliability | high | `#p95` |
| `seam-latency` | platform-reliability | high | `#seam-latency` |
| `queue-age` | platform-reliability | high | `#queue-backlog` |
| `job-queue-age` | platform-reliability | high | `#job-queue-age` |
| `pool-saturation` | platform-reliability | high | `#database-cell-failure` |
| `tenant-cost` | platform-reliability | high | `#tenant-cost` |

Anchors resolve against
`architecture-refactor/final-refactor/evidence/40-observability/FAILURE-RUNBOOKS.md`
(`ALERT_RUNBOOK_BASE` overrides the base). `queue-age` and `retention-dead-man` carry an explicit
`runbookFile` because their anchors live in that file rather than the default.

`platform-reliability` owns eight of the twelve alerts and all four criticals. It is the default
first responder; the other eight owners are domain escalations, not a front line.

### 1.3 Roles in an incident

| Role | Responsibility | Filled by |
|---|---|---|
| **Primary on-call** | Acknowledges, triages, declares severity, drives to mitigation | Rota — **`[HUMAN REQUIRED]`** |
| **Secondary on-call** | Takes over if primary does not acknowledge in the SEV window | Rota — **`[HUMAN REQUIRED]`** |
| **Incident commander (IC)** | SEV1/SEV2 only. Owns the incident, not the fix. Coordinates, decides, delegates comms | Primary escalates; named IC pool **`[HUMAN REQUIRED]`** |
| **Communications lead** | Owns status page and customer messaging. Never also the IC on a SEV1 | **`[HUMAN REQUIRED]`** |
| **Scribe** | Maintains the timeline in the incident channel | Assigned by IC at declaration |
| **Domain expert** | The owning team from §1.2 | Paged by IC |

On a SEV3/SEV4 the primary on-call holds all roles. Splitting IC from fixer is what stops a SEV1
from having a single overloaded person.

### 1.4 Rota

**`[HUMAN REQUIRED]`** — the rota itself. Required before production: named primary and secondary
per week, a follow-the-sun or single-timezone decision, handover time, paging contact per person, a
paging provider account, and a documented compensation/working-time position. Also required:
`ALERT_WEBHOOK_URL` pointing at that provider (see §2.1).

Minimum viable rota is two people deep per shift. One person deep is not a rota; it is a
single point of failure with a name.

---

## 2. Escalation

### 2.1 How an alert reaches a human

`alert-dispatch.mjs` POSTs the alert to `ALERT_WEBHOOK_URL`. Two behaviours matter to an escalation
policy:

- **Deduplication by breach fingerprint.** Each alert computes a `dedupKey` from the *content* of
  the breach, not just the alert id. A different breach of the same alert dispatches immediately —
  confirmed by the self-test's `case3Delivered` / `case3BodyDifferentBreach`.
- **A 60-minute suppression window** (`DEFAULT_SUPPRESSION_WINDOW_MS`, overridable with
  `--suppression-window-minutes=`). A repeat of the *same* breach inside the window is suppressed.

**Consequence for the rota: suppression is not acknowledgement.** A suppressed alert is silent for
an hour whether or not anyone looked at it. Escalation timers below therefore start at *first
dispatch*, and the timeout path must not depend on a second page arriving.

### 2.2 Acknowledgement

`check:alert-ack` verifies a human confirmed a delivered alert by echoing a **nonce**. Its exit
matrix, read from `backend/src/scripts/check-alert-ack.mjs` and confirmed 2026-09-03 by
`pnpm -C backend check:alert-ack:self-test` (exit 0, all seven cases pass):

| Condition | Result |
|---|---|
| Acked with a fresh nonce | exit 0 |
| Delivered but never acknowledged | exit 1, `UNACKNOWLEDGED` |
| `acked: false` or `acked: null` | exit 1 |
| Last ack older than `--max-age-hours` (default 24) | exit 1, `STALE ACK` |
| State file missing / unreadable | exit 2 |

Exit 2 is a *configuration* failure, not a clear. Treat it as an unacknowledged alert.

A nonce echo is the acknowledgement of record. Saying "looking at it" in a chat channel is not,
because nothing verifies it.

### 2.3 Escalation ladder

Timers start at first dispatch. Every step is cumulative, not a replacement.

| Elapsed | SEV1 | SEV2 | SEV3 | SEV4 |
|---|---|---|---|---|
| 0 min | Page primary | Page primary | Ticket to owning team | Ticket to owning team |
| 5 min | No ack → page secondary | — | — | — |
| 15 min | No ack → page IC pool + engineering leadership | No ack → page secondary | — | — |
| 30 min | Not mitigated → leadership joins; comms lead opens status page | No ack → page IC pool | Next business day if untouched | — |
| 60 min | Not mitigated → executive escalation **`[HUMAN REQUIRED]`**; consider provider escalation | Not mitigated → declare IC, evaluate SEV1 | — | — |
| 4 h | Sustained SEV1 → hand over to a fresh IC | — | — | — |

**Escalate on uncertainty, not only on impact.** An on-call who cannot tell whether an incident is
SEV2 or SEV1 within 10 minutes must escalate as SEV1 and downgrade later. Downgrading is cheap;
discovering a SEV1 an hour late is not.

Named contacts for leadership, executive and provider escalation: **`[HUMAN REQUIRED]`** (per
provider, `PROVIDER-RELIABILITY.md` names the dependencies; the support tier and contact for each is
a contract question).

---

## 3. Incident severity

Severity is about **customer impact**, not about how alarming the graph is. Registry severity
(§1.2) is an input to the decision, never the decision itself: a `critical` alert on a cell with no
customers on it is not a SEV1.

| | **SEV1 — critical** | **SEV2 — major** | **SEV3 — minor** | **SEV4 — low** |
|---|---|---|---|---|
| **Impact** | Core workflow unusable for many orgs, or any tenant-isolation or data-integrity breach | Core workflow degraded, or one module unusable, or one cell affected | Non-core feature broken; workaround exists | Cosmetic, internal, or single-org non-blocking |
| **Data** | Any suspected cross-tenant exposure, data loss, or unrecoverable corruption | Recoverable inconsistency, contained | None | None |
| **Declare** | Immediately, by anyone | Primary on-call | Primary on-call | Owning team |
| **IC** | Required | Required | Not required | No |
| **Status page** | Yes, within 30 min | Yes, within 60 min | Only if customers report it | No |
| **Customer comms** | Proactive (§4) | Proactive | Reactive via support | None |
| **Postmortem** | Mandatory, published | Mandatory | At owner's discretion | No |
| **Wake people** | Yes | Yes | No | No |

### 3.1 Automatic SEV1 triggers

These do not require judgement. Declare SEV1 on any of:

- **`tenant-ctx-errors`** firing — the tenant context is how row-level isolation is enforced. Errors
  here mean isolation may not be holding. This is a *security* incident until proven otherwise, and
  §4.4 applies.
- **`retention-dead-man`** firing — the retention machinery has stopped. This is a compliance
  exposure that grows silently with time.
- Any confirmed cross-tenant data exposure, however small.
- Any data loss without a verified restore path.
- Complete unavailability of authentication or of a whole cell.

`dead-outbox` and `cell-recovery` are registry-critical and start at SEV2, escalating to SEV1 on
customer-visible impact or if unmitigated at 60 minutes.

### 3.2 SLO breach is not automatically an incident

`p95` and `seam-latency` fire on the budgets in `SLO-CATALOGUE.md` (`route.cached.read` p95 150 ms,
alerting at 112 ms; `route.write` p95 500 ms, alerting at 375 ms). They alert *before* the objective
is missed, deliberately. A single breach is a signal; a sustained breach that will exhaust the error
budget is a SEV3, and one already causing customer-visible failure is a SEV2.

---

## 4. Customer and status communication

### 4.1 Principles

1. **Acknowledge before you can explain.** The first update goes out on the timer in §3, whether or
   not the cause is known. "We are investigating" published at 20 minutes beats a precise
   explanation at 90.
2. **Impact, not architecture.** Say what a customer cannot do. Never name internal services,
   cells, queues, or providers in a customer-facing message.
3. **One voice.** The communications lead publishes. Engineers do not post to customers directly
   during an incident.
4. **Never speculate on cause or blame a provider by name** before the postmortem.
5. **Commit only to the next update time**, never to a fix time.

### 4.2 Cadence

| Severity | First update | Then | Resolution notice |
|---|---|---|---|
| SEV1 | ≤ 30 min from declaration | Every 30 min, even with no news | Yes, plus a postmortem link when published |
| SEV2 | ≤ 60 min | Every 60 min | Yes |
| SEV3 | Only if customer-reported | On resolution | To reporters |
| SEV4 | — | — | — |

### 4.3 Update template

```
[Investigating | Identified | Monitoring | Resolved] — <customer-visible capability>

What is happening: <what a customer cannot do, in their words>
Who is affected:   <scope: all customers / a subset / a region>
What we are doing: <current action, no internal names>
Workaround:        <if any>
Next update:       <absolute time, with timezone>
```

Status page provider, URL and account: **`[HUMAN REQUIRED]`**. The status page must be hosted
outside the cells it reports on — a status page that shares a failure domain with the product is
unavailable exactly when it is needed.

### 4.4 Regulatory and contractual notification

Any incident with suspected personal-data exposure additionally triggers the privacy path, **on a
statutory clock that runs independently of the engineering incident**. GDPR Art. 33 is 72 hours from
awareness. Do not wait for a postmortem.

- Notify the DPO/privacy owner immediately: **`[HUMAN REQUIRED]`**
- Legal contact: **`[HUMAN REQUIRED]`**
- The decision to notify a supervisory authority or data subjects is a named human's, recorded in
  `architecture-refactor/decisions/` on the template in `decisions/README.md`. An agent may prepare
  the record; only a human signs it.
- `RB-10-privacy-compliance-decisions.md` covers the standing privacy positions.

Customer contractual notification windows (per-contract SLAs): **`[HUMAN REQUIRED]`**.

---

## 5. Post-incident review

### 5.1 When

Mandatory for every SEV1 and SEV2, and for any SEV3 the owning team chooses. Draft within **3
business days** of resolution; review meeting within **5**. Publish internally on completion; publish
externally for any SEV1 with customer impact.

### 5.2 Blameless, and what that actually means

Blameless does not mean "human error" is off the table as a *finding*. It means the remedy may never
be "be more careful". If an engineer could take a destructive action, the finding is that the action
was available, unguarded, or indistinguishable from a safe one. Name systems, not people; roles, not
names, in the timeline.

### 5.3 Required sections

1. **Summary** — three sentences, customer impact first.
2. **Impact** — who, how many, how long, what they could not do. Include revenue/SLA exposure where
   known.
3. **Timeline (UTC)** — first breach, first dispatch, first *acknowledgement* (the nonce echo per
   §2.2), declaration, IC assigned, mitigation, resolution, each customer update. Correlation ids and
   the `release` field from the logs of the period (§6) anchor this.
4. **Detection** — did an alert fire, or did a customer tell us? *If detection was a customer, the
   missing alert is a mandatory action item.* Record time-to-detect and time-to-acknowledge
   separately; they have different fixes.
5. **Root cause** — contributing factors, plural. Ask why the safeguards that existed did not hold.
6. **Recovery** — what actually mitigated it, and whether the runbook was correct. A runbook that
   was wrong or missing is a mandatory action item against `FAILURE-RUNBOOKS.md`.
7. **What went well** — kept deliberately, so the review is not purely corrective.
8. **Action items** — table below.
9. **Recurrence** — could this fire again tomorrow, in another cell, for another tenant?

### 5.4 Action items

| Field | Rule |
|---|---|
| Owner | A named individual. Never a team, never "TBD" |
| Due date | An absolute date |
| Class | `prevent` / `detect` / `mitigate` / `document` |
| Priority | SEV1 preventions are P0 |
| Tracking | A ticket that exists before the review closes |

Every SEV1 and SEV2 review must produce at least one `detect` item, or an explicit statement that
detection was already correct. An incident that improves nothing about detection tends to recur
identically.

Action items are reviewed monthly by the owning team. An overdue P0 from a SEV1 escalates to
engineering leadership.

### 5.5 Feeding the review back into code

A postmortem is finished when its findings are enforced by something that cannot drift:

- Missing alert → a new detector in `backend/src/scripts/alert-*.mjs`, registered in the dispatch
  registry **and** in `check-alert-system.mjs`, with a `:self-test` proving it detects the failure.
  `pnpm -C backend check:alert-system` runs all of them; measured 2026-09-03 it passes with
  `{"allPassed":true,"checkedScripts":14}`.
- Missing objective → an entry in `backend/src/common/slo/`, enforced by `slo-catalogue.spec.ts`.
- Wrong or missing runbook → an edit to `FAILURE-RUNBOOKS.md` at the anchor the alert already names.
- Missing guardrail → a `check:*` gate with a self-test that fails when the guardrail is removed.

A prose-only action item is not a fix.

---

## 6. What an incident responder can rely on

Verified locally 2026-09-03; see `final-refactor/evidence/42-production-ops/`.

- **Every log line is JSON on one line**, with `timestamp`, `level`, `message`, and — when a request
  context exists — `correlationId`, `release`, `cellId`, `orgId`, `actorId`, `method`, `route`.
  Installed process-wide at `backend/src/main.ts:75`.
- **`correlationId` is the join key** across logs, traces and error reports. It is echoed to the
  caller as a response header, so a customer-supplied request id can start a search.
- **W3C `traceparent` is emitted and joined** at `backend/src/common/http/correlation-id.middleware.ts`,
  so a request arriving from another service continues that trace.
- **Caller-supplied log metadata is redacted** before it is written
  (`backend/src/common/logger/logger.service.ts:36`). Passwords, tokens and API keys do not reach the
  log stream.
- **`pnpm -C backend check:log-secrets`** scans the whole backend for plaintext secret logging;
  measured 2026-09-03: 3650 files, exit 0.

### 6.1 One caveat the responder must know

The `release` field is plumbed everywhere but **nothing in the repository ever sets `APP_RELEASE`**.
`currentRelease()` returns the literal string `"unknown"` when it is unset, and the Dockerfile
declares no `ARG`/`ENV` for it and no workflow exports it. **Until that is wired, "which deploy
caused this?" cannot be answered from the logs** — a material gap for §5.3's timeline. Tracked as a
ticket-34 finding against PRD-C173.

---

## 7. Open items before production

| Item | Blocked on |
|---|---|
| The rota itself, and paging provider account | **`[HUMAN REQUIRED]`** |
| `ALERT_WEBHOOK_URL` pointing at that provider | Deployed environment + the account above |
| Status page provider, hosted outside the cells | **`[HUMAN REQUIRED]`** |
| IC pool, leadership and executive escalation contacts | **`[HUMAN REQUIRED]`** |
| DPO/privacy and legal contacts for §4.4 | **`[HUMAN REQUIRED]`** |
| Per-contract customer notification windows | **`[HUMAN REQUIRED]`** (Legal/Sales) |
| `APP_RELEASE` set to the commit SHA at build time | Deployment pipeline (§6.1) |
| Live alert delivery to a real endpoint with a human nonce ack | Deployed environment — RB-06 / PRD-C174 |

Everything above the horizontal rule in this document is written and needs no further authoring.
Everything in this table needs a person.
