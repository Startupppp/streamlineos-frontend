# Incident Response — StreamlineOS Platform

> **OWNER AND CONTACT FIELDS ARE UNFILLED.** Every slot marked `<OWNER: unassigned — requires accountable human>` is a structural placeholder. No automated agent can name a real person, assign a rotation, provide a phone number, or authorize a status-page update. The responsible engineering manager must fill every marked slot and review this document before the first production deployment.

Companion to [FAILURE-RUNBOOKS.md](./FAILURE-RUNBOOKS.md), which covers detection, diagnosis, mitigation and verification for each alert. This document covers the four process layers that sit above the technical runbooks: who is on call, how severity maps to escalation, when customers are told, and how incidents are reviewed. Do not copy runbook diagnosis or mitigation steps here — follow the cross-link for each alert.

**Alert registry source:** `backend/src/scripts/alert-dispatch.mjs` (the `REGISTRY` constant). Owner teams are `platform-reliability`, `notifications-team`, and `payments-team`.

---

**Known operational limitations that affect escalation planning (must be resolved before production):**

1. `alert-dispatch.mjs` POSTs to a single `ALERT_WEBHOOK_URL` with **no auth header**. PagerDuty Events v2 requires a `routing_key` field in the payload that the current dispatch envelope does not carry. The correct credentials and payload shape must be wired before live dispatch is enabled.
2. Suppression state is a **local file** (the `--state-file` path, defaulting to `$TMPDIR`). On a multi-node deployment backed by a shared filesystem, every node reads and writes the same file, causing each node to suppress after the first fires. On a multi-node deployment with separate filesystems, each node fires independently, with no cross-node suppression. Move suppression state to a shared store (e.g. Redis) before deploying more than one API node.

---

## #on-call-rotation

The dispatch registry assigns each alert an `owner` team. That team maps to an on-call responder through the structure below. The rotation schedule itself is a people decision that must be filled in by the responsible engineering manager.

**Alerts by owner team and severity:**

| Alert id | Owner | Severity |
|---|---|---|
| `dead-outbox` | `platform-reliability` | critical |
| `tenant-ctx-errors` | `platform-reliability` | critical |
| `cell-recovery` | `platform-reliability` | critical |
| `retention-dead-man` | `platform-reliability` | critical |
| `workflow-stranded` | `platform-reliability` | critical |
| `p95` | `platform-reliability` | high |
| `seam-latency` | `platform-reliability` | high |
| `queue-age` | `platform-reliability` | high |
| `job-queue-age` | `platform-reliability` | high |
| `pool-saturation` | `platform-reliability` | high |
| `tenant-cost` | `platform-reliability` | high |
| `dead-notification-outbox` | `notifications-team` | critical |
| `dead-delivery` | `notifications-team` | high |
| `sig-failures` | `payments-team` | high |

**Role definitions:**

| Role | Responsibilities | Cadence |
|---|---|---|
| Primary on-call | First responder. Acknowledges within SLO (see escalation matrix). Owns initial diagnosis and containment. Follows the relevant runbook section in [FAILURE-RUNBOOKS.md](./FAILURE-RUNBOOKS.md). | Weekly rotation |
| Secondary on-call | Escalation target when primary misses the acknowledgement SLO. Backs up primary for complex incidents. | Weekly rotation, offset by 3–4 days |
| Incident commander | Takes command when SEV1 is unmitigated at 15 min or SEV2 at 30 min. Coordinates cross-team response. Owns the customer communication decision. | Named senior engineer or separate rotation |
| Customer-comms owner | Drafts and posts status-page updates under incident commander authorization. | Named per incident |

**Per-team slot assignments (FILL IN BEFORE PRODUCTION):**

| Registry owner | Primary on-call | Secondary on-call | Escalation contact |
|---|---|---|---|
| `platform-reliability` | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |
| `notifications-team` | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |
| `payments-team` | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |

**Handoff checklist (outgoing primary → incoming primary):**

- Hand off any open incidents: current status, in-progress containment actions, and which alert ids are still firing.
- Check the dispatch state file for active suppressions. The state file is a local file (see operational limitations above); on a single-node deployment it is the only suppression store.
- Confirm current system health across all monitored seams: run `node backend/src/scripts/alert-seam-latency.mjs` and `node backend/src/scripts/alert-queue-age.mjs` over a recent log window.
- Record the handoff in writing (chat or ticket) before the shift boundary passes.

The rotation schedule is the authoritative source for who is on call. This document records the structure, not the names.

---

## #severity-escalation-matrix

Derived from the OPS-002/003 and REL-002 operational acceptance contract.

**Severity mapping from the registry:**

| Registry `severity` | Incident level | Criteria |
|---|---|---|
| `critical` | SEV1 | Any `critical` alert from `alert-dispatch.mjs` — `dead-outbox`, `dead-notification-outbox`, `tenant-ctx-errors`, `cell-recovery`, `retention-dead-man`, `workflow-stranded` — or a confirmed cross-tenant data leak, or any condition making the platform unavailable to paying tenants |
| `high` | SEV2 | Any `high` alert — `dead-delivery`, `sig-failures`, `p95`, `seam-latency`, `queue-age`, `job-queue-age`, `pool-saturation`, `tenant-cost` — or a degradation that materially impairs a specific feature or tenant group without platform-wide impact |

**Escalation timeline:**

| Step | SEV1 | SEV2 |
|---|---|---|
| Acknowledgement SLO | 5 min after alert fires | 15 min after alert fires |
| Secondary paged (primary missed ACK) | 5 min after alert without ACK | 15 min after alert without ACK |
| Incident commander engaged (unmitigated) | 15 min after alert | 30 min after alert |
| Leadership and customer-comms authorized (unmitigated) | 30 min after alert | — |

**Rollback and pause triggers (from approved contract):**

- Two consecutive smoke failures
- P0 unresolved 10 min after acknowledgement
- Headroom below 20% on any of CPU / memory / pool / queue
- DB errors above 1%
- Any confirmed cross-tenant data leak

Execute rollback only within actual deployment authority.

**Escalation contacts (FILL IN BEFORE PRODUCTION):**

| Role | Contact | Paging channel |
|---|---|---|
| Incident commander | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |
| Engineering leadership | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |
| SEV1 war-room / bridge | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |

---

## #customer-communication

Derived from the OPS-002/003 and REL-002 operational acceptance contract.

**When a status-page event is required:**

A public status-page post is required when an incident meets at least one of:

- Platform-wide unavailability or severe degradation affecting all tenants.
- A confirmed data loss or data-integrity breach.
- A billing or payment processing failure that may affect customer charges or access.
- A security incident with confirmed or suspected customer impact.

**When a status-page event is NOT required (single-tenant incidents):**

StreamlineOS is multi-tenant. An incident isolated to one organization is handled operationally and communicated directly to that organization's owner; it does not produce a public status-page post. Specific examples from the registry:

- `retention-dead-man` firing for one org's sweep while all others are healthy — notify that org's owner directly.
- `tenant-cost` anomaly for one org's AI spend — contact that org directly.
- `dead-outbox` or `dead-notification-outbox` cluster where all affected rows belong to a single org and no other tenant is impacted.

**Exception:** if the root cause has platform-wide blast radius — even when only one tenant has reported symptoms so far — treat it as a public event. A failing `cell-recovery` that affects the cell hosting that tenant has platform scope regardless of how many tenants have noticed.

**Update cadence:**

| Incident level | First public update | Subsequent updates |
|---|---|---|
| SEV1 | Within 30 min of incident declaration | Every 30 min until resolved |
| SEV2 | Within 60 min of incident declaration | Every 60 min until resolved |

**Authorization:** The incident commander authorizes all external communication. The customer-comms owner drafts; the incident commander approves before posting. Do not publish or notify external parties — including direct tenant contact — without this authorization.

**Content guidelines:**

- State what is affected (which feature or service) and what is not affected.
- Do not speculate on root cause in public updates.
- State the current status: investigating / identified / monitoring / resolved.
- State the expected time of the next update.
- When resolved: confirm full restoration and provide the time of resolution.
- Do not name individual tenants in public updates.
- For a single-tenant incident communicated directly: name the affected capability, the start time, the resolution, and the action items. Do not disclose other tenants' data or status.

**Communication contacts (FILL IN BEFORE PRODUCTION):**

| Role | Contact | Channel |
|---|---|---|
| Incident commander | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |
| Customer-comms owner | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |
| Status page credentials | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |
| Direct tenant contact (single-tenant incident) | `<OWNER: unassigned — requires accountable human>` | `<OWNER: unassigned — requires accountable human>` |

---

## #post-incident-review

**Review timeline:**

| Step | Deadline |
|---|---|
| Draft circulated to responders | Within 3 business days of resolution |
| Review meeting | Within 5 business days of resolution |
| Final report published internally | Within 5 business days of resolution |

**Fillable template — copy this section for each incident:**

---

**Incident title:** _[short description]_
**Severity:** SEV1 / SEV2
**Alert id(s) that fired:** _[e.g. `tenant-ctx-errors`, `cell-recovery`]_
**Start:** _[UTC timestamp]_   **End:** _[UTC timestamp]_   **Duration:** _[ ]_
**Review owner:** `<OWNER: unassigned — requires accountable human>`

---

**1. Incident summary**

_One-paragraph description of what happened, when, and how it was resolved._

---

**2. Timeline**

| Time (UTC) | Event |
|---|---|
| | Alert fired: alert id _[ ]_, severity _[ ]_, owner team _[ ]_ |
| | Acknowledged by _[ ]_ |
| | Secondary paged (if primary missed SLO) |
| | Incident commander engaged (if unmitigated past SLO) |
| | Root cause identified |
| | Containment action taken: _[ ]_ |
| | Resolution confirmed |
| | Status-page resolved (if public event) |

If the incident was a bad release, record the `release` field value from log lines to anchor the deploy that introduced the regression.

---

**3. Impact**

- Tenants affected: _[list org ids, or "platform-wide", or "single tenant — not a public status event"]_
- Features / cells affected: _[ ]_
- Duration of degradation: _[ ]_
- Records affected or lost (if any): _[ ]_
- Customer-facing symptoms: _[ ]_
- Status-page event posted: yes / no — if no, state why the single-tenant boundary applied.

---

**4. Root cause**

_The specific technical condition that caused the incident. Distinguish the proximate cause from contributing factors._

Contributing factors:

- _[ ]_

---

**5. Detection**

- Alert that fired first: _[ ]_ (exit code _[ ]_, timestamp _[ ]_)
- Was detection timely? yes / no — if no, state what delayed it.
- Was the runbook in [FAILURE-RUNBOOKS.md](./FAILURE-RUNBOOKS.md) accurate for this incident? yes / no — if no, note the correction needed.

---

**6. Response**

- Actions taken and in what order: _[ ]_
- What worked: _[ ]_
- What did not work: _[ ]_
- Did escalations fire at the right time? yes / no — if no, state the gap.

---

**7. Action items**

| Item | Type | Owner | Target date | Status |
|---|---|---|---|---|
| _[Immediate fix already applied]_ | fix | `<OWNER: unassigned>` | | Done |
| _[Monitoring or runbook improvement]_ | monitoring | `<OWNER: unassigned>` | | Open |
| _[Process improvement]_ | process | `<OWNER: unassigned>` | | Open |

Each item must name an owner and a target date. An item without an owner is not an action item.

---

**8. What went well**

_At least one thing the team did well. Preserving effective practices matters as much as fixing gaps._

---

**Anti-patterns to avoid in the review:**

- Do not assign blame to individuals.
- Do not list an action item without an owner and date.
- Do not close an incident without verifying that the alert id that fired now exits 0 over a fresh log window.
- Do not mark the incident resolved until the relevant runbook verification step passes.

---

Back to [FAILURE-RUNBOOKS.md](./FAILURE-RUNBOOKS.md) for per-alert detection, diagnosis, mitigation and verification steps.
