# RB-06 — Live alert delivery and human acknowledgement

Work item **34-alerts** · acceptance criterion **PRD-C174** · blocker **`check:alert-ack` exits 2**

| Field | Value |
|---|---|
| Runbook | `architecture-refactor/runbooks/RB-06-live-alert-delivery.md` |
| Ticket | `.scratch/code-release-10-10-v2/issues/34-production-ops-alerts-cost.md` |
| Backend repo | `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend` |
| Backend branch | `release/code-10-10-v2` |
| Backend SHA at start | `2f37e1bb035006e5c03680497298ad62031e79d6` |
| Backend SHA at end | `45f8a2e99494483526e357e27f18c76961ebf266` |
| SHA drift during the run | Other agents committed to this shared worktree while it ran. `git diff --stat 2f37e1b..45f8a2e -- 'src/scripts/alert-*' 'src/scripts/check-alert-*' .github/workflows/alerts.yml` is **empty** — no alert code changed, so every result is reproducible at either SHA. Each raw file is stamped with the SHA live at the moment it ran. |
| Operator | automated agent (`34-alerts`), unattended. **No human operator was present.** |
| Host | `Taruns-MBP.lan`, darwin 25.6.0, node v25.9.0 |
| Window | 2026-09-03T16:19:01Z → 2026-09-03T16:27:13Z |
| Databases | local only. Owner `postgresql://tarunchintakunta@localhost:5432/scratch_head_1010` (REACHED_HEAD 677/677, 944 public tables) and an isolated `TEMPLATE` copy, `scratch_alertfire_34`, created and dropped inside this run. The shared remote Neon branch in `backend/.env` was never written to. |

---

## Verdict in one line

**PRD-C174 is NOT met and cannot be met on this machine.** Every mechanical half of RB-06 now has
citable passing evidence — 16 detector self-tests, the aggregate registry gate, 46 anti-vacuity
parity assertions, seven detectors executed against a real head-schema database, and a real
detector→dispatch→HTTP delivery with the payload captured on the wire. The half that remains
unmet is the half C174 actually names: *"live alerts and **human acknowledgement**"*. No human
read a nonce out of a real Slack or PagerDuty channel, so `check:alert-ack` correctly terminates
at **exit 1 — UNACKNOWLEDGED**.

The blocker changed shape but did not disappear:

```
before  check:alert-ack → exit 2  PREREQUISITE MISSING: ALERT_WEBHOOK_URL is not set
after   check:alert-ack → exit 1  UNACKNOWLEDGED: heartbeat delivered, operator never confirmed the nonce
```

Exit 2 said *"we never even tried."* Exit 1 says *"we tried, the wire works, and nobody was
there to answer."* That is progress worth having and it is not a pass.

---

## What a local HTTP listener does and does not prove

A local listener on `127.0.0.1:8791` received every payload in this bundle. It proves:

- the dispatch code opens a real socket, writes a real `Content-Length`-framed JSON body, and
  requires a 2xx to call the send successful;
- the enrichment is real — `owner`, `severity` and a `runbook` deep-link are added to a payload
  that carried a real database row out of a real table;
- the dedup fingerprint suppresses a repeat of the same breach and lets a different breach through;
- the failure path is honest: pointed at a closed port the drill exits 1 and says so, rather than
  reporting a delivered heartbeat.

**It does not prove any of the following, and nothing in this bundle should be read as if it did:**

- that a PagerDuty / OpsGenie / Slack integration key is valid;
- that the payload shape is one PagerDuty Events API v2 will accept (it is a bare JSON object, not
  an Events v2 envelope with `routing_key` / `event_action` / `payload.summary` — see step 2 of
  *Exactly what is needed to close PRD-C174*);
- that an on-call rotation exists, is populated, or points at a person who is awake;
- that a notification left the alerting platform and reached a phone;
- **that a human being read a nonce and typed it back.** A loopback socket is not a channel and
  the agent that started it is not an operator.

---

## A. Runnable here — run, and passing

### A1 · Detector self-tests — 16/16 pass

`raw/01-self-tests.txt` · `raw/03-gate-coverage-gap.txt`

Every self-test proves its detector fires on a breaching input and stays quiet on a clean one.
All exit 0.

| Self-test | Exit | Headline |
|---|---|---|
| `alert:dead-outbox:self-test` | 0 | fires on dead row, clears on stale row |
| `alert:dead-delivery:self-test` | 0 | fires on dead row, clears on stale row |
| `alert:sig-failures:self-test` | 0 | fires on failing endpoint, clears on stale failure |
| `alert:tenant-ctx-errors:self-test` | 0 | 2 matched, correct correlationId / orgId / route |
| `alert:p95:self-test` | 0 | 12 checks — ids collapsed, p95 ignores the outlier, p99 catches it, ownership attributed |
| `alert:seam-latency:self-test` | 0 | 8 checks — `db.query.execute` breached, `cache.roundtrip` not |
| `alert:queue-age:self-test` | 0 | 5 checks — fresh clear, stale breaches, retry pressure fires |
| `alert:job-queue-age:self-test` | 0 | 8 checks — registry covers every declared queue, each declares an owner |
| `alert:pool-saturation:self-test` | 0 | 4 checks — p95 breach fires, saturation warn fires, stale span excluded |
| `alert:tenant-cost:self-test` | 0 | 3 checks — noisy org detected, all-normal clear |
| `alert:cell-recovery:self-test` | 0 | fires on recent recovery, clears on stale |
| `alert:workflow-stranded:self-test` | 0 | fires on stranded row, clears on stale row |
| `alert:dispatch:self-test` | 0 | 8 checks — delivery, dedup suppression, owner/runbook/alertId in body |
| `check:alert-ack:self-test` | 0 | 7 checks — missing file, fresh ack, false ack, null ack, stale ack, round-trip, undelivered |
| `alert-retention-dead-man.mjs --self-test` | 0 | 23 checks over 16 monitored sweeps, incl. an all-null vacuity guard |
| `route-attribution.mjs --self-test` (inside the aggregate) | 0 | 14 checks — ownership differs between hr / chat / health |

### A2 · Aggregate gate — `check:alert-system` exits 0

`raw/02-check-alert-system.txt` → `{"allPassed":true,"checkedScripts":14}`

### A3 · Predicate↔emitter parity — 46 assertions, 3 suites, all green

`raw/11-parity-specs.txt`

This is the anti-vacuity evidence. A self-test feeds a detector the fixture its predicate was
written against, so a self-test alone cannot tell you the predicate matches anything the
application really emits. These suites parse *both* sides — the literal in
`common/observability/log-span-exporter.ts` and the literal the alert script compares against —
and assert they are the same string.

| Suite | Tests | Exit |
|---|---|---|
| `src/scripts/alert-log-predicate-parity.spec.ts` | 32 passed | 0 |
| `src/scripts/alert-seam-parity.spec.ts` | 9 passed | 0 |
| `src/scripts/alert-delivery.spec.ts` | 5 passed | 0 |

### A4 · Seven detectors against a real head-schema database

`raw/04-detectors-vs-local-db.txt` — all seven executed their real SQL against
`scratch_head_1010` at migration head and all returned **exit 0, clear**.

Read this for exactly what it is: a **schema-compatibility** proof, not a firing proof. The
tables are empty, so "clear" is vacuous as a health signal. What it does establish is that no
detector's SQL has drifted away from the 677-migration head schema — the failure mode where an
alert silently 500s against a renamed column and a dashboard shows a green empty state.

`DATABASE_URL` was exported to force the local database. `dotenv.config()` in these scripts runs
with `override:false`, so the export wins; the proof is in the banner — dotenv reports
`injected env (55)` instead of `(56)`, and the one variable it declined to overwrite is
`DATABASE_URL`.

### A5 · Real rows, real firing, real delivery — the full chain

`raw/05-real-row-fires-and-dispatches.txt` · `raw/06-webhook-receiver.jsonl`

Two rows were inserted into `outbox_events` in `scratch_alertfire_34`, an isolated
`CREATE DATABASE … TEMPLATE scratch_head_1010` copy made and dropped inside this run so that no
other agent's database was touched. Then:

| Step | Result |
|---|---|
| `alert-dead-outbox.mjs` | **exit 1, fired**, `count:1`, returning the real row's `org_id`, `event_type`, `last_error`, `retry_count:7` |
| `alert-queue-age.mjs` | **exit 1, fired**, `ageBreached:true`, `globalMaxAgeSecs:7253` against a 300s threshold |
| detector ⇒ `alert-dispatch --alert-id=dead-outbox` | `{"dispatched":true,"dedupKey":"02de10483e650633","owner":"platform-reliability","severity":"critical"}` |
| same pipeline, second run | `{"dispatched":false,"suppressed":true,…,"suppressedUntil":"2026-09-03T17:23:14.034Z"}` — dedup works |
| `alert-dispatch --test-event` | `{"dispatched":true,"testEvent":true}` |

The receiver captured the enriched body on the wire (`raw/06-webhook-receiver.jsonl`, seq 2):
the detector's row plus `alertId`, `owner:"platform-reliability"`, `severity:"critical"` and
`runbook:"…/FAILURE-RUNBOOKS.md#dead-outbox"`.

The rows are real rows in a real table read by real SQL. They were **seeded by this agent**, not
produced by application traffic. RB-06 Step 3 asks for a predicate validated "against a real log
emission (not a fixture)"; this is the closest available substitute and it is not the same thing.

### A6 · `check-alert-ack` exit matrix — every branch exercised

`raw/07-check-alert-ack-exit-matrix.txt`

| # | Condition | Exit | Meaning |
|---|---|---|---|
| A | `ALERT_WEBHOOK_URL` unset | **2** | the recorded blocker, reproduced verbatim |
| B | webhook set, no ack record | **2** | prerequisite missing — drill never ran |
| C | `drill-alert-system.mjs` non-interactive | **3** | heartbeat delivered, ACK not confirmed; state `{"delivered":true,"acked":null,"nonce":"75cb36a2e13c9c82"}` |
| D | `check-alert-ack` after C | **1** | `UNACKNOWLEDGED` — **the honest terminal state of C174 here** |
| E | webhook points at a closed port | **1** | `connect ECONNREFUSED` — the drill refuses to claim success |
| F | synthetic state file (labelled, see below) | **0** | the gate is not an unconditional-fail gate |
| G | synthetic state file aged 48h | **1** | `STALE ACK … threshold: 24h` — the TTL branch is live |

Rows F and G consume `raw/09-GATE-PROBE-synthetic-NOT-A-HUMAN-ACK.json` and
`raw/10-GATE-PROBE-synthetic-STALE-NOT-A-HUMAN-ACK.json`. **Those two files are hand-written
gate-behaviour probes. They are not acknowledgements. No human acked anything.** They exist only
to show the gate can reach exit 0 and that its TTL fires, so that row D's exit 1 is known to be a
real verdict rather than a gate that always fails. Each file says so in its own `_WARNING` field.
Neither was written to the default state path `${TMPDIR}/alert-drill-ack.json` — that path was
left untouched by this run, verified after teardown.

### A7 · The five log-backed detectors, with no log stream

`raw/12-log-backed-detectors-no-stream.txt`

There is no production log stream and no running API on this machine, so these were run against
an empty stream to record how each reports the absence. `alert-p95`, `alert-seam-latency` and
`alert-pool-saturation` all exit **2** with an explicit "the exporter is unwired" message —
correct behaviour. `alert-cell-recovery` exits 0 reading a real prior drill's
`.recovery-drill-results.json` (`cell-2`, restored 2026-09-01T16:03:25Z, `rtoMet:true`).
`alert-tenant-ctx-errors` exits **0** — see the defect below.

---

## Defects found while running this runbook

Neither is fixed; the backend source is outside this agent's write scope.

### D1 · `alert-tenant-ctx-errors.mjs` reports CLEAR on an empty or broken log stream

`raw/14-vacuity-defect-tenant-ctx-errors.txt`

Its threshold is 0 occurrences, and it has no lines-read guard, so **zero input lines is
indistinguishable from zero 42501 errors** and it exits 0. A wrong `journalctl` unit name, a
rotated log, or a dead pipe therefore renders a `severity:"critical"` alert permanently silent
while printing a healthy verdict. Three sibling log detectors already guard this and exit 2.

Demonstrated with three controls: empty stream → exit 0 clear; plain-text non-JSON stream
("`-- No entries --`") → exit 0 clear; a stream containing one real-shaped
`ERROR_REPORT`/`sqlstate:"42501"` line → **exit 1 fired**. The predicate is correct; the vacuity
guard is missing. Fix: mirror the guard at `src/scripts/alert-p95.mjs:194-197`.

### D2 · Two self-testable detectors are invisible to every gate

`raw/03-gate-coverage-gap.txt` · `raw/13-coverage-of-the-alert-gates.txt`

`check-alert-system.mjs`'s `ALERT_SCRIPTS` array lists 14 of the 16 scripts that have a working
`--self-test`. Missing: **`alert-workflow-stranded.mjs`** and **`alert-retention-dead-man.mjs`**
(the latter has no npm script at all). Neither is run by `ci.yml` or `alerts.yml` either. Both
were run by hand for this bundle and both pass (23 checks in retention-dead-man alone), so this
is unexercised coverage rather than hidden breakage — but the aggregate gate reports
`{"allPassed":true,"checkedScripts":14}` without saying that 14 is not all of them.

Also worth recording, in the gate's favour: `ci.yml:666-672` is explicitly honest that the live
ack half "can never be more" than a self-test in CI, "proof that a person received the page,
which no CI job can fabricate."

---

## B. Needs a deployed environment — cannot be met here

Each quotes the criterion or runbook wording that makes the call.

| Item | Wording that blocks it | What is missing |
|---|---|---|
| A real alert destination | RB-06 precondition: *"`ALERT_WEBHOOK_URL` is set to a PagerDuty Events API v2 endpoint (or equivalent: OpsGenie, Slack with an integration key…)"* | No PagerDuty/OpsGenie/Slack integration key exists on this machine. A loopback listener satisfies the transport and none of the platform. |
| `APP_RELEASE` = deployed SHA | RB-06 pass threshold: *"`APP_RELEASE` is set to the current **deployed** SHA"* | Nothing is deployed. There is no deployed SHA to name. |
| A production log stream | RB-06 precondition: *"A production log stream (Axiom, Datadog, Loki, or equivalent) is **ingesting application logs from the running API and the background worker process**"* | No API or worker process is running and no aggregator is configured. This is what blocks `alert-p95`, `alert-seam-latency` and `alert-pool-saturation` (all exit 2 above). |
| Predicate fired by real traffic | RB-06 Step 3 / pass threshold: *"At least one alert fires against a **real log emission (not a fixture)**"* — the step's own method is *"Deliberately trigger a 42501 … in a dev/staging call"* | Requires a dev/staging deployment serving requests. A1/A3/A5 get close (real DB rows, parity-checked predicates) but not to a live emission. |
| An active on-call rotation | RB-06 precondition: *"The on-call rotation is active in the chosen alerting platform"* and pass threshold *"On-call platform records an acknowledgement within 5 minutes"* | No alerting platform, therefore no rotation and no platform-side acknowledgement record. |

## C. Needs a named human — cannot be signed by this agent

| Item | Wording that blocks it | Who |
|---|---|---|
| **PRD-C174 acknowledgement itself** | Criterion: *"Test live alerts and **human acknowledgement**."* RB-06 Step 4: *"Prompt: 'Enter the nonce from your alert channel to confirm ACK'… Type the nonce and press Enter."* Pass threshold: *"`check-alert-ack.mjs` exits 0, meaning **a human entered the correct nonce** within the last 24 hours."* | A named on-call operator. The drill requires an interactive TTY and a person who has the alert channel open. This agent is neither and must not type a nonce it can read off its own terminal. |
| Evidence sign-off | RB-06 evidence recording: *"Save the webhook receiver log and the alerting platform **acknowledgement screenshot**"* | The operator who ran the drill. |

`operator-attestation-UNSIGNED.md` in this directory is a complete acknowledgement record with
every field filled except the signature, the nonce, and the timestamps a live drill produces. A
human has only to run the drill and fill four blanks.

### One thing the human should know before signing

`drill-alert-system.mjs` prints the nonce to its own stderr (`Heartbeat delivered. Nonce: …`)
**before** prompting for it. An operator sitting at the terminal can therefore type the nonce
without ever opening the alert channel, and the recorded ACK would be indistinguishable from a
real one. The drill proves *a human was at the keyboard*; it does not by construction prove *a
human read the alert channel*. Whoever signs should either have a second person read the nonce
out of the channel, or the script should stop echoing it — a one-line change. This is a property
of the drill's design, not a criticism of anyone's conduct.

---

## Exactly what is needed to close PRD-C174

1. A real `ALERT_WEBHOOK_URL` (PagerDuty Events v2, OpsGenie, or a Slack incoming webhook) held
   as a secret, with an on-call rotation attached.
2. Confirm the payload shape against that platform — **this is the most likely way the first real
   drill fails.** `alert-dispatch.mjs` and `drill-alert-system.mjs` POST a bare JSON object.
   PagerDuty Events API v2 expects `{routing_key, event_action, payload:{summary, severity, source}}`;
   a Slack incoming webhook expects `{"text": …}`. Neither will accept this body as-is.
   `ALERT_WEBHOOK_ROUTING_KEY` appears in RB-06 Step 1, but grep over `src/` and `.github/` returns
   **zero matches** — the variable is inert (`raw/15-gate-wiring-and-routing-key.txt`). Resolve the
   envelope before the operator drill, or the drill fails on transport rather than on acknowledgement.
3. A named operator runs, in an interactive terminal:
   `node --env-file=.env src/scripts/drill-alert-system.mjs`
4. That operator finds the nonce **in the alert channel**, types it, and the script writes
   `{delivered:true, acked:true, nonce, sentAt, ackedAt}`.
5. `node src/scripts/check-alert-ack.mjs` → exit 0 within the 24h TTL.
6. Countersign `operator-attestation-UNSIGNED.md` and attach the channel screenshot.

Steps 1, 3, 4 and 6 are the ones no agent can perform.

---

## Files

| File | What it is |
|---|---|
| `README.md` | this document |
| `operator-attestation-UNSIGNED.md` | acknowledgement record, complete but unsigned |
| `MANIFEST.sha256` | sha256 of every file in `raw/` |
| `raw/01-self-tests.txt` | 14 self-tests, verbatim output and exit codes |
| `raw/02-check-alert-system.txt` | aggregate gate, `allPassed:true` |
| `raw/03-gate-coverage-gap.txt` | the two uncovered detectors + retention-dead-man self-test |
| `raw/04-detectors-vs-local-db.txt` | 7 DB detectors against `scratch_head_1010` |
| `raw/05-real-row-fires-and-dispatches.txt` | real rows → fired → dispatched → suppressed |
| `raw/06-webhook-receiver.jsonl` | every payload the local listener received, on the wire |
| `raw/07-check-alert-ack-exit-matrix.txt` | exit codes 2/2/3/1/1/0/1 across seven conditions |
| `raw/08-drill-alert-ack-state.json` | the state the real drill wrote: `acked:null` |
| `raw/09-GATE-PROBE-synthetic-NOT-A-HUMAN-ACK.json` | **synthetic probe, not an ack** |
| `raw/10-GATE-PROBE-synthetic-STALE-NOT-A-HUMAN-ACK.json` | **synthetic probe, not an ack** |
| `raw/11-parity-specs.txt` | 46 predicate↔emitter parity assertions |
| `raw/12-log-backed-detectors-no-stream.txt` | how each log detector reports an absent stream |
| `raw/13-coverage-of-the-alert-gates.txt` | measured coverage: scripts vs aggregate gate vs CI |
| `raw/14-vacuity-defect-tenant-ctx-errors.txt` | defect D1 with three controls |
| `raw/15-gate-wiring-and-routing-key.txt` | `ALERT_WEBHOOK_ROUTING_KEY` is inert; `check:gate-wiring` 28 self-tests + 100 gates, exit 0 |

## Cleanup performed

- Local receiver process stopped.
- `scratch_alertfire_34` dropped; `pg_database` count verified 0.
- `scratch_head_1010` verified unmodified (`select count(*) from outbox_events` → 0).
- `${TMPDIR}/alert-drill-ack.json`, the default ACK state path, never written.
- Nothing was committed, staged, or checked out.
