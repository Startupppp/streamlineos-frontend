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

| Event | Producer | Consumers/effects | Ordering/deduplication |
|---|---|---|---|
| `build.ticket.created.v1` | ticket create command | activity, automation, notification, search/report projection, webhook | Aggregate revision order; event+consumer key |
| `build.ticket.changed.v1` | `applyTicketChange` | same plus assignment/status/due-specific consumers | Per Ticket revision; ignore older projection update |
| `build.ticket.archived/restored.v1` | archive/restore command | projections, search, notification where configured | Revision ordered |
| `build.approval.requested/decided.v1` | approval command | Inbox/notification, client projection, webhook | Request revision; decision command idempotency |
| `build.release.published.v1` | release publish command | changelog/client notification/integration/webhook | Release revision; publish idempotency key |
| `build.blocker.created.v1` | Ticket transition/create | attention/notification | Ticket revision |
| `build.client-grant.activated/revoked/expired.v1` | grant lifecycle | portal/access cache, email, audit | Grant revision; revocation has priority over stale activation |
| `build.import.started/completed.v1` | import coordinator | operation center, notification, reconciliation | Job ID; row source identity |
| `build.project.archived/restored.v1` | project lifecycle | navigation/access/projection cleanup | Project revision |
| `build.projection.refresh-requested.v1` | cross-module link/event adapter | time/finance/customer projection worker | source module + source ID + source revision |

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

- [ ] Reconcile proposed BuildEvent versions and event owners with the existing outbox registry; document payload compatibility and migration for each producer and consumer.
- [ ] Prove command write plus outbox insert is atomic and every consumer is idempotent under duplicate, delayed, and out-of-order delivery.
- [ ] Define durable import/export, notification, webhook, automation, and projection jobs with 202 operation status, retries, backoff, dead-letter handling, and actor-scoped result access.
- [ ] Test notification deduplication and permission recheck; verify webhook signing, secret rotation, callback allowlists, SSRF controls, and revoked-access behavior.
- [ ] Record queue lag, failure, replay, and effect-correlation evidence in the operational acceptance run.
