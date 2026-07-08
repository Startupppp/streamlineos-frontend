# Delivery Queue, Retries And Idempotency

## Purpose
External notification sending must be reliable, observable, and safe from duplicates.

## Backend Requirements
Create or upgrade queue behavior:

- Queue one delivery job per recipient/channel.
- Use `idempotency_key`.
- Lock jobs before processing.
- Retry transient failures.
- Dead-letter permanent failures.
- Track every provider response.
- Support scheduled delivery.
- Support delayed delivery after quiet hours.
- Support digest queueing.

## Status Lifecycle
```txt
PENDING -> QUEUED -> SENDING -> SENT -> DELIVERED
PENDING -> SUPPRESSED
SENDING -> FAILED -> QUEUED
FAILED -> DEAD
SENT -> READ
SENT -> CLICKED
```

## Idempotency Key Format
```txt
org:{orgId}:event:{eventKey}:user:{userId}:entity:{entityType}:{entityId}:channel:{channel}:dedupe:{bucket}
```

## Retry Rules
- Retry network/provider 5xx errors.
- Do not retry invalid recipient.
- Do not retry unsubscribe/consent failure.
- Retry with exponential backoff:
  - 1 minute
  - 5 minutes
  - 15 minutes
  - 1 hour
  - 6 hours
- After max attempts, mark `DEAD`.

## Queue Worker
Backend worker must:
- Select due jobs.
- Lock jobs.
- Send via provider abstraction.
- Update delivery status.
- Release or retry.
- Emit metrics.

## Frontend Queue Monitor
Admin UI:
- Queue status cards
- Pending/sending/failed/dead counts
- Filter by channel/provider/event/user/date
- Retry selected
- Cancel selected
- View provider response
- View error reason

## Acceptance Criteria
- Same event cannot send duplicate external messages within dedupe window.
- Provider failure does not crash app request.
- Queue monitor shows failed reason.
- Dead-letter items can be retried by admin after fixing config.
