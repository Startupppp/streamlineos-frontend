# RB-06 Alert Acknowledgement Attestation — **UNSIGNED**

> **This record is not valid until a named human completes and signs Part 3.**
> It was drafted by an automated agent (work item `34-alerts`) which ran every mechanical
> part of RB-06 and then stopped, because the remaining part — a person receiving a page
> and typing back the nonce they read in the alert channel — is not something an agent
> can perform or attest to. Every blank below marked `__________` must be filled by the
> operator who actually ran the drill. Do not pre-fill them.

---

## Part 1 — Prerequisites the operator must confirm before running the drill

Tick each only if it is true at the moment of the drill.

- [ ] `ALERT_WEBHOOK_URL` points at a **real** alerting platform endpoint (PagerDuty Events API
      v2, OpsGenie, Slack incoming webhook, or an equivalent your on-call team monitors) — **not**
      a loopback address, a request-bin, or any endpoint no human watches.
      Endpoint host (no secrets): `__________`
- [ ] The payload shape has been confirmed against that platform. **Read this before you drill:**
      `alert-dispatch.mjs` and `drill-alert-system.mjs` POST a bare JSON object. PagerDuty Events
      API v2 expects `{routing_key, event_action, payload:{summary, severity, source}}`; a Slack
      incoming webhook expects `{"text": …}`. `ALERT_WEBHOOK_ROUTING_KEY` appears in RB-06 Step 1
      but **no script in the repository reads it** (verified: `raw/15-gate-wiring-and-routing-key.txt`).
      Platform: `__________`   Shape confirmed by: `__________`
- [ ] `APP_RELEASE` is set to the SHA that is actually deployed.
      Value: `__________`
- [ ] `CELL_ID` set. Value: `__________`
- [ ] A production log stream is ingesting structured JSON from the running API **and** the
      background worker. Aggregator: `__________`
- [ ] The on-call rotation is active in that platform and a person is on it right now.
      On-call at drill time: `__________`

## Part 2 — The drill

```bash
cd backend
node --env-file=.env src/scripts/drill-alert-system.mjs     # interactive TTY required
node --env-file=.env src/scripts/check-alert-ack.mjs        # must exit 0
```

| Field | Value |
|---|---|
| Drill run at (UTC) | `__________` |
| Nonce delivered (`sentAt`) | `__________` |
| Where the operator **read** the nonce | `__________` (name the channel — e.g. `#oncall-alerts`, PagerDuty incident #) |
| Nonce entered, acknowledged at (`ackedAt`) | `__________` |
| `drill-alert-system.mjs` exit code | `__________` (must be 0) |
| `check-alert-ack.mjs` exit code | `__________` (must be 0) |
| Backend SHA at drill time | `__________` |
| Screenshot of the alert in the channel | `__________` (attach alongside this file) |

### Integrity note the operator must read and initial

`drill-alert-system.mjs` writes the nonce to its own stderr — `Heartbeat delivered. Nonce: …` —
**before** it prompts for that nonce. Nothing in the script forces the value to have travelled
through the alert channel; an operator can type it straight off the terminal and the recorded
ACK is byte-identical to a real one. The drill therefore proves a human was at the keyboard, not
that a human read the channel.

Choose one and initial:

- [ ] A **second person** read the nonce out of the alert channel and relayed it to the operator
      at the terminal. Second person: `__________`  Initials: `____`
- [ ] The operator ran the drill on a machine where the terminal output was not visible while
      entering the nonce. Initials: `____`
- [ ] Accepted as a known limitation of the drill for this release. Accepted by (name + role):
      `__________`  Initials: `____`

## Part 3 — Signature

I ran the drill described in Part 2. I personally received the alert in the channel named above
and entered the nonce I read there. The evidence in
`architecture-refactor/final-refactor/evidence/42-production-ops/RB-06-live-alert-delivery/`
accurately describes what happened.

| | |
|---|---|
| Name | `__________` |
| Role | `__________` (Operations / on-call engineer) |
| Date (UTC) | `__________` |
| Signature | `__________` |

**Counter-signature — release authority accepting RB-06 as satisfied for PRD-C174**

| | |
|---|---|
| Name | `__________` |
| Role | `__________` |
| Date (UTC) | `__________` |
| Signature | `__________` |

---

## Part 4 — What the agent did and did not do (for the signer's benefit)

**Did, with citable output in `raw/`:**

- Ran 16 detector self-tests; all 16 exit 0.
- Ran `check:alert-system`; exit 0, `{"allPassed":true,"checkedScripts":14}`.
- Ran 46 predicate↔emitter parity assertions across three jest suites; all pass.
- Ran 7 database detectors against a local head-schema database (677/677 migrations); all
  executed their real SQL without drift.
- Seeded two real rows into an **isolated** copy database, watched `alert-dead-outbox` and
  `alert-queue-age` fire on them (exit 1), piped the fired payload through `alert-dispatch`, and
  captured the enriched body — `owner`, `severity`, `runbook` — arriving over HTTP.
- Exercised all seven `check-alert-ack` exit branches and the drill's delivery-failure path.

**Did not, and could not:**

- Deliver to any real alerting platform. The receiver was `http://127.0.0.1:8791/alerts`, a
  local process started and stopped inside the same run. It is not a channel.
- Confirm the payload is acceptable to PagerDuty, OpsGenie or Slack.
- Observe an alert fire from real application traffic — there is no running API, no worker, and
  no log stream on this machine.
- **Acknowledge anything.** `check-alert-ack` terminates at **exit 1, UNACKNOWLEDGED** and that
  is the correct and final state until Part 3 is signed.

Two files in `raw/` are named `GATE-PROBE-synthetic-NOT-A-HUMAN-ACK`. They are hand-written
inputs used to prove the gate can reach exit 0 at all and that its 24-hour TTL fires. **They are
not acknowledgements and must never be copied to `${TMPDIR}/alert-drill-ack.json`.** The default
ACK state path was left unwritten by this run.
