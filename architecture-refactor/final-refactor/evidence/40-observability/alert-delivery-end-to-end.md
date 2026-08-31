# End-to-end alert delivery, proved against a local sink

Run in session 6, 2026-08-28. Authorised scope: test alerts to a local sink only.

`alert-dispatch.mjs --test-event` had never been observed delivering anything, because
`ALERT_WEBHOOK_URL` is unset in every environment this repository has. The self-test starts its own
`node:http` server, which proves the dedup and retry logic but runs inside the script's own process.
This is the script's real delivery path, driven end to end.

## Method

A throwaway HTTP listener bound to `127.0.0.1` on an ephemeral port, `ALERT_WEBHOOK_URL` pointed at
it in the child environment only, and `alert-dispatch.mjs --test-event` spawned as a separate
process. Nothing external was contacted and no configuration was persisted.

## Result

```
local sink listening on http://127.0.0.1:61225/alerts

{"dispatched":true,"testEvent":true,"sentAt":"2026-08-28T19:18:45.841Z"}

alert-dispatch --test-event exited 0
deliveries received by the sink: 1

  POST /alerts
  payload: {
    "alertId": "heartbeat",
    "synthetic": true,
    "testEvent": true,
    "fired": true,
    "message": "StreamlineOS alert system heartbeat — this confirms end-to-end delivery is working",
    "owner": "platform-reliability",
    "runbook": "architecture-refactor/c28-cell-based-platform-at-20m/RUNBOOKS.md",
    "destination": "CONFIGURE_ME — wire exit-code 1 to your oncall system",
    "sentAt": "2026-08-28T19:18:45.841Z"
  }
```

## What this proves, and what it does not

**Proves:** the transport works. A real HTTP POST leaves the process, arrives with a well-formed
JSON body, carries the alert id, its owning team and a runbook pointer, and the script exits 0 on a
successful delivery.

**No secret or PII is in the payload.** The body carries an alert identifier, a static message, a
team name, a repository-relative runbook path and a timestamp. No token, connection string, org id,
user id or tenant data. The `destination` field is a literal placeholder, not a configured endpoint.

**Does not prove** that anyone is paged. `ALERT_WEBHOOK_URL` is still unset outside this probe, so no
alert this platform raises reaches a human. That is an operator action — set the variable in the
deployment environment — and no code change can substitute for it. Recorded as the open item on
ticket 40.

## Reproducing it

The probe was a throwaway and is not committed, because a permanent copy would be a second, weaker
version of the self-test that already lives in `alert-dispatch.mjs`. To repeat it: start any HTTP
listener, export `ALERT_WEBHOOK_URL` at it, and run `pnpm alert:test-event`.
