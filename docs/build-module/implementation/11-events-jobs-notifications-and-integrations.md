# 11 — Events, jobs, notifications, and integrations

Status: Current unverified outbox infrastructure plus Planned coverage

## Event envelope

```ts
type BuildEvent<T> = {
  id: string;
  type: string;
  version: number;
  orgId: string;
  projectId?: number;
  aggregate: { type: string; id: string | number; revision?: number };
  actor: { type: "user" | "client" | "service" | "system"; id?: string };
  occurredAt: string;
  correlationId: string;
  causationId?: string;
  payload: T;
};
```

The command writes the domain change and outbox event in one tenant transaction through `OutboxWriter`. A consumer records an inbox/idempotency key derived from event and consumer identity, performs the effect, and records success/failure. Event payloads carry stable IDs and bounded snapshots, not unrestricted descriptions or credentials.

## Canonical events

Registered outbox event types as of branch `codex/build-foundation-gates` (2026-10-04). Each row shows the type string as it appears in source.

| Event type (source name) | Version policy | Producer | Consumer(s) / effects | Deduplication |
|---|---|---|---|---|
| `build.approval.requested` | schemaVersion field in payload; bump on breaking change | `approvals.service.ts` | `build-approval-requested-consumer.service.ts` → Inbox/notification | event+consumer idempotency key |
| `build.blocker.created` | schemaVersion field in payload | `projects-ticket-relations.service.ts` | `build-blocker-created-consumer.service.ts` → attention/notification | Ticket revision |
| `build.ticket.status_changed` | schemaVersion field in payload | `apply-ticket-change.ts`, `build-ticket-batch-workflow.ts` | `build-ticket-status-changed-consumer.service.ts` → assignee notification | event+consumer idempotency key |
| `build.release.published` | schemaVersion field in payload | `projects-releases.service.ts` | `build-release-published-consumer.service.ts` → assignee notification, changelog | release revision + idempotency key |

Notification-only event keys (no outbox consumer, used via direct notification service):

| Event key | Producer | Effect |
|---|---|---|
| `build.ticket.due_soon` | `build-due-sweep.service.ts` | notification to assignee |
| `build.ticket.overdue` | `build-due-sweep.service.ts` | notification to assignee |
| `build.ticket.assigned` | `build-ticket-creation.service.ts`, `projects-tickets-transfer.service.ts` | notification to new assignee |
| `build.project.member_added` | `projects-provision.service.ts` | notification to new member |

Version bump policy: increment `schemaVersion` in the payload schema whenever a field is removed, renamed, or its type narrows. Adding optional fields does not require a bump. All four registered events carry a `schemaVersion` field; validate it in consumers before processing. New events must be registered in `outbox-consumer.registry.ts` before any producer emits them.

The doc previously used `.v1` name suffixes (e.g. `build.ticket.changed.v1`); source uses underscore names without version suffix. The `.v1` names are not emitted by any current producer and are not registered consumers — treat them as planning artifacts only. Use the source names above as the canonical identifiers. (BT-5de59e93a52b, reconciled 2026-10-04)

Names already emitted in source remain compatibility inputs; version/migrate them through an adapter rather than silently changing consumer meaning.

## Job contract

Every durable job stores job ID, org/project scope, operation, payload/schema version, actor, idempotency key, state, attempts, next attempt, lease owner/expiry, progress, safe result/error, created/started/completed timestamps, and correlation ID. State is `QUEUED → RUNNING → SUCCEEDED|PARTIAL|FAILED|CANCELLED|EXPIRED`; an expired lease may be reclaimed. Retry uses exponential backoff with jitter and a finite attempt budget; permanent failures enter a dead-letter/attention state with replay authorization.

Imports, exports, large reports, webhook delivery, provider synchronization, file processing, and projection rebuilds are jobs. A `202` response means accepted and returns the job/status URL; it never means completed.

## Notifications

Notifications consume committed events and apply preferences, recipient eligibility, grant/access state, dedupe, quiet hours, and channel policy. Inbox state is distinct from email/push delivery state. Links are canonical and reauthorize on open. A domain command succeeds even if delivery fails; operations expose failed delivery and retry.

## Integration ownership

Build owns event meaning and mapping to Build IDs. Integrations owns provider credentials, signing, HTTP client, retry/circuit breaker, and delivery attempt state. CRM, Timesheets, Accounting, Home, and Files are owned internal modules behind small read/command interfaces; use an in-memory adapter in interface tests and the real module adapter in integration tests.

Webhook deliveries sign the exact bytes, timestamp, event ID, and version; receivers can reject replay. SSRF controls resolve/validate destinations, block private/link-local/metadata ranges, revalidate redirects, restrict protocols/ports, cap response/body/time, and never expose internal error bodies.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Define durable import/export, notification, webhook, automation, and projection jobs with 202 operation status, retries, backoff, dead-letter handling, and actor-scoped result access.
