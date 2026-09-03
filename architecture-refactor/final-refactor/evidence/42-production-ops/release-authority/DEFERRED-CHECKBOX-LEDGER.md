# Deferred-checkbox ledger — all 195 criteria, classified

**PRD-C191** — *"Every deferred checkbox is complete with current evidence"* — cannot be
answered until someone says which checkboxes can be completed at all, and by whom. This
file is that answer. It is the single most load-bearing artifact ticket 36 produces,
because it converts a 195-row backlog into three piles with different owners.

| | |
|---|---|
| Written | **2026-09-03** |
| Frontend/root commit | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) |
| Backend commit | `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`) |
| Source of criteria | `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` |
| Source of ownership | `.scratch/code-release-10-10-v2/TRACEABILITY.md` |
| Mapping verified by | `pnpm -C frontend check:prd-traceability` — **exit 0**, 195 manifest rows, 195 ticket criteria, 0 checked, 195 unchecked, every criterion quoted verbatim with exactly one owner |
| Author | Automation. **Nothing in this file is signed, and nothing in it may be read as an approval.** |

---

## The three classes

The classification rule is stated here so a reader can challenge a specific row rather
than the whole table.

| Class | Definition | What "done today" means |
|---|---|---|
| **CODE** | Closable on this machine. The deliverable is producible from these two repositories, the local Postgres instances, or a locally runnable drill or self-test. | An agent can finish it. Nothing external is required. |
| **DEPLOYED** | The deliverable is a measurement or configuration that only a real deployed environment can produce — deployed TLS, edge headers, a provisioned per-cell cache/queue/object store, a physical replica, PITR, load at scale, or live alert delivery. | Nobody can finish it here. **There is no deployed production environment on this machine.** |
| **HUMAN** | The deliverable *is* a decision, approval, acceptance, sign-off or disposition by a named person. | An agent can author the complete record with every field filled but the signature. It cannot sign. |

**Where a criterion needs two things, the class is the one its own deliverable is, and the
second is recorded in the `Also needs` column.** Nothing is hidden by the choice. A
conditional human requirement — one that applies only if a risk is accepted rather than
fixed — is noted, not classed, because it disappears when the work is actually done.

Every DEPLOYED and HUMAN row below quotes the criterion's own words for the call. A row
with no quotation is CODE by exclusion: nothing in its text names an environment or a person.

## Totals

| Class | Count | Share |
|---|---:|---:|
| **CODE** | 159 | 81.5% |
| **DEPLOYED** | 26 | 13.3% |
| **HUMAN** | 10 | 5.1% |
| **Total** | **195** | 100% |

**159 of 195 criteria — 81.5% — are closable on this machine.** That is the number this
ledger exists to establish. The remaining 36 are not blocked by effort or by skill; they are
blocked by the absence of an environment (26) or of a person (10), and no amount of further
work in this repository moves any of them.

A second number matters as much: **158 of the 159 CODE criteria sit in tickets 01–31**, the
immediate code-level release candidate. Only PRD-C188 is a CODE criterion inside the deferred
section — see its row. The PRD's own split between immediate and deferred is therefore
accurate to within one criterion.

---

## Per-ticket breakdown

| Ticket | CODE | DEPLOYED | HUMAN | Total | What blocks it beyond this machine |
|---:|---:|---:|---:|---:|---|
| 01 | 1 | 0 | 0 | 1 | Nothing — every criterion is CODE |
| 02 | 9 | 0 | 0 | 9 | Nothing — every criterion is CODE |
| 03 | 6 | 0 | 0 | 6 | Nothing — every criterion is CODE |
| 04 | 13 | 0 | 0 | 13 | Nothing — every criterion is CODE |
| 05 | 8 | 0 | 0 | 8 | Nothing — every criterion is CODE |
| 06 | 2 | 0 | 0 | 2 | Nothing — every criterion is CODE |
| 07 | 2 | 0 | 0 | 2 | Nothing — every criterion is CODE |
| 08 | 3 | 0 | 0 | 3 | Nothing — every criterion is CODE |
| 09 | 2 | 0 | 0 | 2 | Nothing — every criterion is CODE |
| 10 | 1 | 0 | 0 | 1 | Nothing — every criterion is CODE |
| 11 | 1 | 0 | 0 | 1 | Nothing — every criterion is CODE |
| 12 | 1 | 0 | 0 | 1 | Nothing — every criterion is CODE |
| 13 | 2 | 0 | 0 | 2 | Nothing — every criterion is CODE |
| 14 | 2 | 0 | 0 | 2 | Nothing — every criterion is CODE |
| 15 | 1 | 0 | 0 | 1 | Nothing — every criterion is CODE |
| 16 | 3 | 0 | 0 | 3 | Nothing — every criterion is CODE |
| 17 | 5 | 0 | 0 | 5 | Nothing — every criterion is CODE |
| 18 | 16 | 0 | 0 | 16 | Nothing — every criterion is CODE |
| 19 | 9 | 0 | 0 | 9 | Nothing — every criterion is CODE |
| 20 | 3 | 0 | 0 | 3 | Nothing — every criterion is CODE |
| 21 | 1 | 0 | 0 | 1 | Nothing — every criterion is CODE |
| 22 | 1 | 0 | 0 | 1 | Nothing — every criterion is CODE |
| 23 | 7 | 0 | 0 | 7 | Nothing — every criterion is CODE |
| 24 | 4 | 0 | 0 | 4 | Nothing — every criterion is CODE |
| 25 | 2 | 0 | 0 | 2 | Nothing — every criterion is CODE |
| 26 | 4 | 0 | 0 | 4 | Nothing — every criterion is CODE |
| 27 | 12 | 0 | 0 | 12 | Nothing — every criterion is CODE |
| 28 | 11 | 0 | 0 | 11 | Nothing — every criterion is CODE |
| 29 | 11 | 0 | 0 | 11 | Nothing — every criterion is CODE |
| 30 | 4 | 0 | 0 | 4 | Nothing — every criterion is CODE |
| 31 | 11 | 0 | 1 | 12 | 1 of 12 blocked; 11 closable here |
| 32 | 0 | 3 | 0 | 3 | **Everything** — every criterion needs a deployed environment |
| 33 | 0 | 5 | 0 | 5 | **Everything** — every criterion needs a deployed environment |
| 34 | 0 | 10 | 1 | 11 | **Everything** — no criterion is closable here |
| 35 | 1 | 3 | 6 | 10 | 9 of 10 blocked; 1 closable here |
| 36 | 0 | 5 | 2 | 7 | **Everything** — no criterion is closable here |

Four tickets can close nothing on this machine: **32** (3 DEPLOYED), **33** (5 DEPLOYED),
**35** (9 of 10 blocked; only PRD-C188 is CODE) and **36** (7 of 7 blocked). Ticket **34**
is 11 of 11 blocked. Everything else is fully or partly CODE.

---

## Section 1 — the 36 criteria that cannot be closed here

This is the important half of the ledger. Each row quotes the criterion's own wording for
the call, so the classification can be disputed on the text rather than on opinion.

### DEPLOYED — 26 criteria

#### PRD-C010 · ticket 34 · Current remaining execution list

> complete v2 ticket 21's code lifecycle and v2 ticket 34's deployed private-bucket/backfill evidence before cutover.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "v2 ticket 34's **deployed** private-bucket/backfill evidence before cutover"
- Ticket 21's code half is CODE and is separately owned as PRD-C103. Only the bucket/backfill half is deferred.

#### PRD-C016 · ticket 36 · Current remaining execution list

> complete v2 ticket 31 at one clean frontend/backend commit pair, then v2 ticket 36's deployed release-authority record; interrupted, skipped and prerequisite-blocked gates never count as passing.

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "then v2 ticket 36's **deployed** release-authority record"
- This criterion is the hinge of the whole release. Its first half ("one clean frontend/backend commit pair") is CODE and is ticket 31's. Its second half names a **deployed** record, and PRD-C195 makes that record an act of release authority. Neither half is closable today: both working trees are dirty (measured 2026-09-03) and no deployed environment exists.

#### PRD-C162 · ticket 32 · Deployed security, provider and performance

> Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Run **real** payment, realtime, email and push **sandbox** replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios"
- "real … sandbox" excludes a mock. Requires provider sandbox credentials for Razorpay, Ably, Resend/ZeptoMail and the push provider.

#### PRD-C163 · ticket 32 · Deployed security, provider and performance

> Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Verify **deployed** TLS, encryption at rest, infrastructure secret isolation and credential/key rotation"

#### PRD-C164 · ticket 32 · Deployed security, provider and performance

> Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Verify **deployed** edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior"
- Edge headers are a property of the deployed edge, not of the repository. The code-level twin (CSP/CORS/header behaviour in application code) is covered by §11's closed security boxes.

#### PRD-C165 · ticket 34 · Deployed security, provider and performance

> Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target.

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN, conditionally
- **The criterion's own wording forces this:** "Produce **production-build/reference-device** Web Vitals evidence; **obtain Product acceptance** if frozen landing animation prevents its agreed target"
- The code-level twin is PRD-C149 (ticket 29), which the repository can measure over localhost. This criterion is the deployed one: the PRD's own 2026-09-02 run records that the localhost capture's two surviving breaches are both TTFB, the metric localhost distorts most. Product acceptance is required only if the frozen landing animation blocks the target.

#### PRD-C166 · ticket 34 · Deployed security, provider and performance

> Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Run **realistic load** and capture pools, queues, CPU, memory, errors, **replica behavior** and sustained/burst capacity"
- Replica behaviour presupposes PRD-C170's physical replica.

#### PRD-C167 · ticket 34 · Deployed security, provider and performance

> Prove declared SLOs with at least 40% capacity headroom.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Prove declared SLOs with at least **40% capacity headroom**"
- RB-05 assertion `headroom-40-percent`. `cell:load` and `cell:capacity` self-test locally; a self-test proves the measurement code, never the headroom.

#### PRD-C168 · ticket 33 · Cloud, recovery and operations

> Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "**Provision** isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring"

#### PRD-C169 · ticket 33 · Cloud, recovery and operations

> Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Prove credentials, routing, jobs, namespaces and data **cannot cross cells** using RB-01 and RB-08"
- RB-01 assertions `independent-resource-identity`, `cross-cell-credential-boundary`; RB-08 assertions `separate-resource-accounts`, `per-cell-credentials`, `separate-worker-deployment`.

#### PRD-C170 · ticket 33 · Cloud, recovery and operations

> Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md).

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "**Provision a physical replica** and prove lag/fallback using RB-03"
- RB-03 assertions `physical-replica`, `measured-replica-lag`, `primary-fallback`. A logical or simulated replica cannot satisfy `physical-replica`.

#### PRD-C171 · ticket 33 · Cloud, recovery and operations

> Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "**Configure five-minute-or-better PITR/RPO** and run recovery/relocation drills using RB-02 and RB-04"
- RB-02 assertions `pitr-retention`, `restore-rpo`; RB-04 assertions `cell-recovery-rto-rpo`, `regional-recovery`, `organization-relocation`.

#### PRD-C172 · ticket 34 · Cloud, recovery and operations

> Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md).

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "**Measure/approve** per-cell and active-tenant cost using RB-07"
- RB-07 requires `invoice-derived-cell-cost` — a real cloud invoice — plus `operator-capacity-approval`, a named human. Two of its three assertions are measurements, so the class is DEPLOYED and the approval is the secondary blocker.

#### PRD-C173 · ticket 34 · Cloud, recovery and operations

> Configure production logs, traces and release metadata with redaction.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Configure **production** logs, traces and release metadata with redaction"

#### PRD-C174 · ticket 34 · Cloud, recovery and operations

> Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "Test **live alerts** and **human acknowledgement** using RB-06"
- MEASURED 2026-09-03: `pnpm -C backend check:alert-ack` exits **2 — PREREQUISITE MISSING: ALERT_WEBHOOK_URL is not set**, and instructs "Enter the nonce shown in your alert channel to confirm a human received it." `check:alert-ack:self-test` exits 0 (7 detector cases). check-gate-wiring registers this gate as unwired by design for exactly that reason: "proof a person received the page, which no CI job can fabricate".

#### PRD-C175 · ticket 34 · Cloud, recovery and operations

> Capture passing RB-01â€“RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology, SHA, operator, timestamps, exit code and hashes.

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "Capture **passing RB-01–RB-08 manifests** under production evidence with identity, topology, SHA, **operator**, timestamps, exit code and hashes"
- MEASURED 2026-09-03, twice nine minutes apart: `pnpm -C backend ops:evidence:check` exits **1** both times — first "no evidence manifests found … deployed evidence has not been collected", then, after tickets 32–35 landed local drill output, **10 manifest candidates found, 10 rejected as malformed, 0 PASS, all 8 runbooks still missing**. Every rejection reason is a property of a deployed run a local one cannot have (`evidenceKind must be deployed-operator-attested`, `live=true`, a non-local https `environment.target`, and **`named operator is required`**). `ops:evidence:self-test` exits 0 with all three detector cases passing, so the gate bites and cannot be satisfied by accumulating self-tests.

#### PRD-C176 · ticket 34 · Cloud, recovery and operations

> Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix **under induced failure**"
- `cell:rollout`, `cell:rollout:regressed-canary` and `cell:degraded` carry local self-tests that prove the abort/degrade logic. They do not induce failure in a deployed rollout.

#### PRD-C177 · ticket 34 · Cloud, recovery and operations

> Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety **during deployment/autoscaling**"
- The in-code half — ready/degraded/unready contracts, HTTP drain, fenced lease handoff — is already closed in §9 by ticket 32. Only the behaviour during a real deployment or autoscaling event is open.

#### PRD-C179 · ticket 33 · Cloud, recovery and operations

> Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership.

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "Prove backups are encrypted, controlled, **restorable and periodically tested** with **documented key ownership**"
- A restore test needs real backups; key ownership names a human custodian.

#### PRD-C181 · ticket 35 · Compliance and approvals

> Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Verify **deployed** sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases"
- RB-10 states the repository proves two data-plane route bindings; it "does not prove that every future data-plane route is protected or that the deployed route set matches the repository". That gap is exactly what a deployed check closes.

#### PRD-C186 · ticket 35 · Compliance and approvals

> Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Run **deployed** export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills"
- Its local twin is PRD-C188, which is runnable here — see that row.

#### PRD-C187 · ticket 35 · Compliance and approvals

> Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Prove **deployed** object/search/vector/cache/downstream deletion plus **backup aging and restore-time deletion**"
- Backup aging cannot be observed without real backups with a real retention clock.

#### PRD-C190 · ticket 36 · Production-ready final gate

> Immediate code-level gate remains green at the deployed commit.

- **Class:** DEPLOYED
- **The criterion's own wording forces this:** "Immediate code-level gate remains green **at the deployed commit**"
- The gate run itself is CODE and reproducible here. What is missing is a deployed commit for it to be green *at*. See C190-C194-MEASUREMENT-DEFINITION.md for the exact gate list and command.

#### PRD-C191 · ticket 36 · Production-ready final gate

> Every deferred checkbox is complete with current evidence.

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "Every **deferred** checkbox is complete with current evidence"
- Aggregate over PRD-C162–C189: 20 DEPLOYED, 8 HUMAN, 1 CODE (C188). This ledger is the artifact that criterion asks for.

#### PRD-C192 · ticket 36 · Production-ready final gate

> Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement.

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "**Production evidence** proves isolation, recovery, SLO/headroom, unit cost, live alerts and **acknowledgement**"
- Maps one-to-one onto RB-01/RB-08 (isolation), RB-02/RB-04 (recovery), RB-05 (SLO/headroom), RB-07 (unit cost) and RB-06 (live alerts and acknowledgement). MEASURED: `ops:evidence:check` exit 1, zero manifests captured.

#### PRD-C194 · ticket 36 · Production-ready final gate

> No unresolved production/compliance P0/P1 finding remains.

- **Class:** DEPLOYED  ·  **Also needs:** HUMAN
- **The criterion's own wording forces this:** "No unresolved **production/compliance** P0/P1 finding remains"
- A production/compliance finding can only exist once the deployed drills have run, so the register is empty for the reason that blocks the criterion. Residual acceptance is PRD-C189's human act. See C190-C194-MEASUREMENT-DEFINITION.md.

### HUMAN — 10 criteria

#### PRD-C161 · ticket 31 · Immediate code-level final gate

> Release authority records commit, evidence, accepted code-level residual risks and date.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "**Release authority** records commit, evidence, **accepted** code-level residual risks and date"
- The code-level twin of PRD-C195. The template and an unsigned instance are authored under architecture-refactor/decisions/; only the signature is missing.

#### PRD-C178 · ticket 34 · Cloud, recovery and operations

> Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "**Publish on-call ownership**, escalation, incident severity, customer/status communication and post-incident review procedures"
- An on-call rota names people and commits them to a response obligation. No agent may assign a person to a page.

#### PRD-C180 · ticket 35 · Compliance and approvals

> Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "**Approve** operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation"
- RB-10 §1 records what is built (grant lifecycle, dual control, `OperatorSessionGuard`, DB CHECK `approver_id != granted_by`) and what is not (no audit interceptor, no tenant notification dispatch, no emergency bypass, no review cadence). The missing pieces are policy choices, not code gaps.

#### PRD-C182 · ticket 35 · Compliance and approvals

> Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) and [the decision template](decisions/README.md).

- **Class:** HUMAN
- **The criterion's own wording forces this:** "**Obtain named** Product, Security, Privacy/DPO, Operations, Legal and Finance **decisions** using RB-10 and the decision template"
- The template at architecture-refactor/decisions/README.md is gate-validated by `check:s05-artifact-contract` (exit 0, 2026-09-03) and already carries all six approval rows. Only signatures are absent.

#### PRD-C183 · ticket 35 · Compliance and approvals

> Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "Complete DATA-CATALOGUE.md with purpose, **lawful basis**, subjects, processors, location, **retention**, **owner** and deletion behavior"
- MEASURED 2026-09-03: DATA-CATALOGUE.md is 210 lines with 99 table rows; **36 rows carry 53 `DECISION REQUIRED` cells**. Each is a lawful-basis, Art. 9 condition, retention period or transfer-mechanism choice. The file's own header states "No policy is presented as approved without a signed decision record in architecture-refactor/decisions/."

#### PRD-C184 · ticket 35 · Compliance and approvals

> Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "**Decide** PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties"

#### PRD-C185 · ticket 35 · Compliance and approvals

> Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "**Approve** AI/integration providers, regions, PII minimization, retention, deletion and disclosure"
- DATA-CATALOGUE §processors lists Neon, Upstash, Cloudflare R2, Resend, ZeptoMail, OpenAI, Google and OpenRouter, each with a `DECISION REQUIRED` transfer/region cell.

#### PRD-C189 · ticket 35 · Compliance and approvals

> Close or formally disposition every production/security/privacy/compliance P0/P1 finding.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "Close or **formally disposition** every production/security/privacy/compliance P0/P1 finding"
- Depends on C162–C188 first producing the findings. A disposition is an accepted risk with a named owner.

#### PRD-C193 · ticket 36 · Production-ready final gate

> Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "Required Product, Security, Privacy/DPO, Operations, Legal and Finance **approvals are recorded**"
- The unsigned instance is authored at architecture-refactor/decisions/release-authority-2026-09-03-UNSIGNED.md with all six rows present and every signature field blank.

#### PRD-C195 · ticket 36 · Production-ready final gate

> Release authority records commit, environment, evidence, accepted residual risks and date.

- **Class:** HUMAN
- **The criterion's own wording forces this:** "**Release authority** records commit, environment, evidence, **accepted residual risks** and date"
- Template and unsigned instance authored. Every field that can be filled from measurement is filled; every signature is blank.

---

## Section 1b — the one criterion filed as deferred that is not

#### PRD-C188 · ticket 35 · Compliance and approvals

> Run retention/legal-hold drills and store a redacted, hashed evidence bundle.

- **Class:** CODE
- **The one deferred criterion whose own wording names neither a deployed environment nor a human.** MEASURED 2026-09-03: `DATABASE_URL=postgresql://…/scratch_head_1010 node src/scripts/compliance-drill.mjs` (dry run) exits **0**, exercises all seven steps — export request, legal hold placed, erasure refused while held, hold released, retention policy, deletion request, org purge — verifies **7 of 7 required audit rows**, and rolls the transaction back. `check:evidence-seal` read 0, 0, then 1 across fifteen minutes (2 seals/41 files -> 5 seals/68 files -> 2 seals BROKEN by files another ticket added after sealing), which is the seal doing its job rather than a regression. The drill also reports three of its own gaps honestly: no export worker produces a file, the `object_storage` purge adapter returns FAILED "not yet implemented", and the `database_rows` adapter marks `statusV2=PURGED` without physically deleting rows. Those gaps are code work, not environment work. If the intent was a deployed drill, the criterion must say so — as PRD-C186 and PRD-C187 do.

Its two neighbours in the same PRD subsection both say the word this one omits:
PRD-C186 — *"Run **deployed** export, correction, portability, erasure … drills"* — and
PRD-C187 — *"Prove **deployed** object/search/vector/cache/downstream deletion"*. C188 says
only *"Run retention/legal-hold drills and store a redacted, hashed evidence bundle"*, and
that is exactly what ran here, exit 0.

**This is a finding against the PRD, not against the work.** Either C188 belongs in the
immediate set, or its wording should carry the word its neighbours carry. Recorded so that
nobody later reads its deferred position as proof that it could not have been done.

---

## Section 2 — the full 195-criterion table

Ordered by criterion ID. `Also` records a secondary dependency that does not change the class.

| Criterion | Ticket | Class | Also | PRD section | Criterion (abridged — the PRD is authoritative) |
|---|---:|---|---|---|---|
| **PRD-C001** | 03 | CODE | — | Current remaining execution list | complete v2 ticket 02's cross-repository reachability, canonical-key and safe-deletion criteria, then v2 ticket 03's current-head catalog parity… |
| **PRD-C002** | 17 | CODE | — | Current remaining execution list | complete v2 ticket 17's streaming, cancellation, deadline, structured-output, citation, credit and frontend failure-state criteria. |
| **PRD-C003** | 22 | CODE | — | Current remaining execution list | complete v2 ticket 22's live BOLA/IDOR, valid mutating-body, same-tenant control, abuse-protection and privacy criteria. |
| **PRD-C004** | 05 | CODE | — | Current remaining execution list | complete v2 ticket 05's organization authority, module permission, owner/descendant protection, cache invalidation, contract and frontend criteria. |
| **PRD-C005** | 29 | CODE | — | Current remaining execution list | complete v2 ticket 18's bounded projection, N+1, tenant-predicate, index, pagination, cache and invalidation criteria, then retain performance… |
| **PRD-C006** | 29 | CODE | — | Current remaining execution list | complete v2 ticket 29's production-build Web Vitals, bundle, rendering and interaction budgets while preserving completed lazy-loading,… |
| **PRD-C007** | 19 | CODE | — | Current remaining execution list | complete v2 ticket 19's permissioned-read, required-identifier, query-key, pagination, runtime parsing, cancellation, invalidation and… |
| **PRD-C008** | 31 | CODE | — | Current remaining execution list | complete v2 tickets 13, 14 and 16 respectively, including provider drift, sync correctness, bounded read paths, ACL-aware retrieval and current… |
| **PRD-C009** | 20 | CODE | — | Current remaining execution list | complete v2 ticket 20's in-scope responsive, keyboard, screen-reader, loading, empty, error, offline, permission and retry states. |
| **PRD-C010** | 34 | **DEPLOYED** | — | Current remaining execution list | complete v2 ticket 21's code lifecycle and v2 ticket 34's deployed private-bucket/backfill evidence before cutover. |
| **PRD-C011** | 30 | CODE | — | Current remaining execution list | complete v2 ticket 30's bite-proven architecture/release gates and portable verification harness. |
| **PRD-C012** | 27 | CODE | — | Current remaining execution list | complete the v2 tickets 24–27 expand–migrate–contract sequence for unused symbols, dead surface, unsafe assertions, dependency cycles and dependency… |
| **PRD-C013** | 28 | CODE | — | Current remaining execution list | complete v2 ticket 28's named-handler, thin-entry-point, cohesion and justified file-size-exception criteria without meaningless wrapper chains. |
| **PRD-C014** | 31 | CODE | HUMAN, conditionally | Current remaining execution list | resolve or formally disposition Payroll financial-integrity gaps in v2 ticket 08, notification/email permission and delivery gaps in v2 ticket 15,… |
| **PRD-C015** | 30 | CODE | — | Current remaining execution list | complete v2 ticket 30 by removing absolute workstation paths and resolving both repositories from the workspace or explicit validated arguments on… |
| **PRD-C016** | 36 | **DEPLOYED** | HUMAN | Current remaining execution list | complete v2 ticket 31 at one clean frontend/backend commit pair, then v2 ticket 36's deployed release-authority record; interrupted, skipped and… |
| **PRD-C017** | 01 | CODE | — | Current remaining execution list | complete v2 ticket 01 and keep its manifest fail-closed so every PRD criterion has exactly one ticket owner, ticket-only criteria are rejected and… |
| **PRD-C018** | 31 | CODE | — | 1. One-commit release verification | Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar,… |
| **PRD-C019** | 31 | CODE | — | 1. One-commit release verification | Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts. |
| **PRD-C020** | 31 | CODE | — | 1. One-commit release verification | At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code,… |
| **PRD-C021** | 31 | CODE | HUMAN, conditionally | 1. One-commit release verification | Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks. |
| **PRD-C022** | 27 | CODE | — | 2. Module and folder architecture | Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden… |
| **PRD-C023** | 26 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Run fail-closed dead-code analysis over the backend, frontend, shared packages, workers and scripts; require zero unclassified unused files,… |
| **PRD-C024** | 26 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Remove every in-scope compile-time and runtime dependency cycle across backend modules, frontend features, shared packages, barrels and NestJS DI.… |
| **PRD-C025** | 24 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Enable and enforce TypeScript/ESLint unused-symbol checks for imports, locals, parameters and private members. Remove unused symbols instead of… |
| **PRD-C026** | 26 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Remove unused imports, variables, parameters, functions, classes, constants, enums, types, interfaces, Zod schemas, DTOs, hooks, query keys, context… |
| **PRD-C027** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Remove unreachable branches, obsolete compatibility shims, commented-out implementation, debug logging, stale TODO scaffolding and constants that… |
| **PRD-C028** | 26 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Remove unused files and folders including abandoned routes, controllers, providers, modules, components, hooks, workers, jobs, adapters, tests,… |
| **PRD-C029** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Remove unused runtime and development dependencies, package scripts, environment variables, configuration keys, feature flags and asset references;… |
| **PRD-C030** | 25 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Eliminate unsafe forced typing: no `as any`, `as unknown as T`, unjustified non-null assertions, `@ts-ignore`, `@ts-nocheck`, error-suppressing… |
| **PRD-C031** | 25 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Permit a type assertion only at a proven external/framework seam where TypeScript cannot express an already runtime-validated invariant. Each… |
| **PRD-C032** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Replace duplicated or weakly owned constants with the canonical domain-owned schema/catalog only when at least two real callers share the invariant;… |
| **PRD-C033** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Reduce public interfaces and barrel surfaces to verified consumers. Internal implementation details stay private to their module; deep imports… |
| **PRD-C034** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Prove every deletion with import/dependency graph results plus checks for Nest metadata/DI, Next.js file conventions and dynamic imports, raw… |
| **PRD-C035** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | After each cleanup batch, run focused behavior tests and the affected package typecheck/build; at final integration run both dead-code gates and… |
| **PRD-C036** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Record before/after counts for unused files, exports/types, dependencies, suppressions, unsafe assertions and exceptions. Final acceptance is zero… |
| **PRD-C037** | 27 | CODE | — | 2.1 Repository hygiene, dead code and type integrity | Confirm the cleanup does not remove authorization, validation, cache invalidation, outbox/worker registration, observability, accessibility, SEO… |
| **PRD-C038** | 28 | CODE | — | 2.2 File cohesion and 500-line policy | Enforce a repository-wide default maximum of 500 physical lines for authored production, frontend, backend, shared-package, worker, script and test… |
| **PRD-C039** | 28 | CODE | — | 2.2 File cohesion and 500-line policy | Treat 300 lines as a review/refactoring target, not a reason for mechanical fragmentation. Split files by cohesive responsibility and domain… |
| **PRD-C040** | 28 | CODE | — | 2.2 File cohesion and 500-line policy | Permit a file above 500 lines only for a generated/vendor artifact, declaration, immutable migration, cohesive declarative catalog or an… |
| **PRD-C041** | 28 | CODE | — | 2.2 File cohesion and 500-line policy | Make the exception registry fail closed: missing/stale paths, line counts, owners, interfaces, reasons or review dates fail; any file that falls to… |
| **PRD-C042** | 28 | CODE | — | 2.2 File cohesion and 500-line policy | Review functions, classes, React components, hooks, forms, controllers and workers inside an allowed large file for mixed responsibilities, hidden… |
| **PRD-C043** | 28 | CODE | — | 2.2 File cohesion and 500-line policy | Run the hard-size gate and bite-proven self-test for backend and frontend at the final commit, publish all over-300 and over-500 inventories,… |
| **PRD-C044** | 28 | CODE | — | 2.3 Handler and function responsibility | Use named, typed handler functions for non-trivial UI events and form actions instead of embedding business logic, multi-step mutations or long… |
| **PRD-C045** | 28 | CODE | — | 2.3 Handler and function responsibility | Keep NestJS controller handlers, queue/event consumers, cron entry points and server actions thin: validate and authorize at the correct seam,… |
| **PRD-C046** | 28 | CODE | — | 2.3 Handler and function responsibility | Use named event handlers only; JSX event props must not contain inline arrow/function expressions. Do not create meaningless handler-to-handler… |
| **PRD-C047** | 04 | CODE | — | 3. TypeScript, Zod and cross-layer contracts | Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that… |
| **PRD-C048** | 04 | CODE | — | 3. TypeScript, Zod and cross-layer contracts | Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries. |
| **PRD-C049** | 04 | CODE | — | 3. TypeScript, Zod and cross-layer contracts | Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states. |
| **PRD-C050** | 02 | CODE | — | 4. Database schema and migration quality | Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit… |
| **PRD-C051** | 02 | CODE | — | 4. Database schema and migration quality | Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an… |
| **PRD-C052** | 02 | CODE | — | 4. Database schema and migration quality | Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them. |
| **PRD-C053** | 03 | CODE | — | 4. Database schema and migration quality | Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove… |
| **PRD-C054** | 03 | CODE | — | 4. Database schema and migration quality | Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence. |
| **PRD-C055** | 03 | CODE | — | 4. Database schema and migration quality | Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap at the same release commit: tables, columns, constraints,… |
| **PRD-C056** | 03 | CODE | — | 4. Database schema and migration quality | Retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes for the current-head bootstrap… |
| **PRD-C057** | 02 | CODE | — | 4.1 Schema and executable-key minimization | Inventory and classify in-scope database columns, primary/foreign/unique/check constraints, indexes and JSONB keys plus executable code registries… |
| **PRD-C058** | 02 | CODE | — | 4.1 Schema and executable-key minimization | Remove unused database columns and JSONB properties only after proving zero reads/writes through Drizzle, raw SQL, migrations, exports,… |
| **PRD-C059** | 02 | CODE | — | 4.1 Schema and executable-key minimization | Detect redundant or overlapping foreign keys, unique constraints, checks and indexes using schema declarations, `pg_catalog`, representative… |
| **PRD-C060** | 03 | CODE | — | 4.1 Schema and executable-key minimization | Require each tenant-owned relationship to use the canonical composite organization-scoped key and supporting index. Remove a redundant single-column… |
| **PRD-C061** | 02 | CODE | — | 4.1 Schema and executable-key minimization | Remove dead or duplicate code keys and aliases from permission catalogs, route/operation registries, module manifests, event/command catalogs,… |
| **PRD-C062** | 02 | CODE | — | 4.1 Schema and executable-key minimization | Keep one typed, domain-owned factory/catalog for each surviving key family; prohibit ad-hoc string literals, parallel aliases and generic global… |
| **PRD-C063** | 02 | CODE | — | 4.1 Schema and executable-key minimization | Remove unused request/response/DTO/Zod fields and object properties across backend, OpenAPI, frontend hooks/forms and persisted events as one… |
| **PRD-C064** | 30 | CODE | — | 4.1 Schema and executable-key minimization | After every key/schema cleanup, regenerate affected artifacts and prove migration chain/ledger, two clean bootstraps, catalog parity, tenant… |
| **PRD-C065** | 18 | CODE | — | 5. Query, pagination and cache correctness | Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort. |
| **PRD-C066** | 18 | CODE | — | 5. Query, pagination and cache correctness | Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data. |
| **PRD-C067** | 18 | CODE | — | 5. Query, pagination and cache correctness | Verify cache keys include tenant, subject, permission and resource dimensions where applicable. |
| **PRD-C068** | 18 | CODE | — | 5. Query, pagination and cache correctness | Prove mutation/revocation invalidation, TTL/negative-cache policy, stampede protection and Redis degradation never leak data or preserve revoked… |
| **PRD-C069** | 18 | CODE | — | 5.1 Efficient database-call contract | Record a maximum database-call count for every critical route and worker batch; fail regression tests when an implementation adds unexpected calls. |
| **PRD-C070** | 18 | CODE | — | 5.1 Efficient database-call contract | Execute tenant-owned request work inside the minimum correct tenant transaction and reuse its handle; never open nested/per-row transactions or… |
| **PRD-C071** | 18 | CODE | — | 5.1 Efficient database-call contract | Select named columns only and return minimal DTO projections; never hydrate full ORM rows, global users or large JSON/blob/vector fields for… |
| **PRD-C072** | 18 | CODE | — | 5.1 Efficient database-call contract | Batch relationship, permission, unread, attachment, assignee and metadata lookups with joins, CTEs or bounded multi-key queries; forbid… |
| **PRD-C073** | 18 | CODE | — | 5.1 Efficient database-call contract | Implement existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`; do not fetch records or counts when only existence… |
| **PRD-C074** | 18 | CODE | — | 5.1 Efficient database-call contract | Make exact totals opt-in and independently budgeted; cursor pages must not run an expensive `COUNT(*)` automatically on every request. |
| **PRD-C075** | 18 | CODE | — | 5.1 Efficient database-call contract | Use bounded bulk insert/update/upsert operations and conflict-safe unique keys instead of one write per row; keep transactional batches below… |
| **PRD-C076** | 18 | CODE | — | 5.1 Efficient database-call contract | Verify concurrent counters, unread state, seats, balances, ordering and idempotency use atomic SQL/upsert/locking semantics without read-then-write… |
| **PRD-C077** | 18 | CODE | — | 5.1 Efficient database-call contract | Apply statement/query timeouts and cancellation propagation to interactive work; move reports, exports, reindexing and wide aggregates to resumable… |
| **PRD-C078** | 18 | CODE | — | 5.1 Efficient database-call contract | Measure connection acquisition, transaction duration and idle-in-transaction behavior; release connections before external provider calls or long… |
| **PRD-C079** | 18 | CODE | — | 5.1 Efficient database-call contract | Benchmark under the application role with tenant context and RLS, never only as the database owner; plans must include real authorization predicates. |
| **PRD-C080** | 18 | CODE | — | 5.1 Efficient database-call contract | Capture slow-query fingerprints, call counts, rows read/returned, buffers and lock waits in test evidence without logging sensitive bind values. |
| **PRD-C081** | 05 | CODE | — | 6. Organization and module RBAC | Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses… |
| **PRD-C082** | 23 | CODE | — | 7. NestJS route and worker behavior | Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam. |
| **PRD-C083** | 23 | CODE | — | 7. NestJS route and worker behavior | Verify writes are transactional, idempotent and safe under concurrent retry; side effects use after-commit/outbox behavior and never a dead request… |
| **PRD-C084** | 23 | CODE | — | 7. NestJS route and worker behavior | Verify minimal response projections, serialization/redaction, generic errors, resource limits and stable HTTP semantics. |
| **PRD-C085** | 04 | CODE | — | 7.1 Optimized route and transport contract | Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit. |
| **PRD-C086** | 04 | CODE | — | 7.1 Optimized route and transport contract | Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of… |
| **PRD-C087** | 04 | CODE | — | 7.1 Optimized route and transport contract | Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section. |
| **PRD-C088** | 04 | CODE | — | 7.1 Optimized route and transport contract | Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads. |
| **PRD-C089** | 04 | CODE | — | 7.1 Optimized route and transport contract | Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress… |
| **PRD-C090** | 04 | CODE | — | 7.1 Optimized route and transport contract | Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory. |
| **PRD-C091** | 04 | CODE | — | 7.1 Optimized route and transport contract | Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and… |
| **PRD-C092** | 04 | CODE | — | 7.1 Optimized route and transport contract | Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics. |
| **PRD-C093** | 04 | CODE | — | 7.1 Optimized route and transport contract | Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them. |
| **PRD-C094** | 04 | CODE | — | 7.1 Optimized route and transport contract | Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches. |
| **PRD-C095** | 19 | CODE | — | 8. TanStack Query and Next.js data layer | Verify one hierarchical query-key factory per domain includes organization, subject, scope, filters, sort and cursor dimensions as applicable. |
| **PRD-C096** | 19 | CODE | — | 8. TanStack Query and Next.js data layer | Gate queries with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests. |
| **PRD-C097** | 19 | CODE | — | 8. TanStack Query and Next.js data layer | Verify mutations invalidate or update every affected list/detail/count/dashboard key and roll back optimistic state safely on failure. |
| **PRD-C098** | 19 | CODE | — | 8. TanStack Query and Next.js data layer | Use optimistic updates only where concurrency semantics are defined; otherwise await the backend result and invalidate deterministically. |
| **PRD-C099** | 19 | CODE | — | 8. TanStack Query and Next.js data layer | Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly. |
| **PRD-C100** | 19 | CODE | — | 8. TanStack Query and Next.js data layer | Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states. |
| **PRD-C101** | 19 | CODE | — | 8. TanStack Query and Next.js data layer | Prove frontend types and runtime parsing cannot silently accept a backend contract change. |
| **PRD-C102** | 23 | CODE | — | 9. Operability, upload lifecycle and verification integrity | Emit structured, redacted and tenant-safe logs, metrics and distributed trace context across HTTP requests, database/cache/provider adapters, outbox… |
| **PRD-C103** | 21 | CODE | — | 9. Operability, upload lifecycle and verification integrity | Enforce one tenant-private upload interface for attachments and documents: validate declared size and magic-byte MIME, sanitize names, use… |
| **PRD-C104** | 30 | CODE | — | 9. Operability, upload lifecycle and verification integrity | Make every architecture/release gate bite-proven with a known-bad fixture or mutation that fails for the intended reason. Critical tests must… |
| **PRD-C105** | 24 | CODE | — | 10. Module release matrix | Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event… |
| **PRD-C106** | 24 | CODE | — | 10. Module release matrix | Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location. |
| **PRD-C107** | 24 | CODE | — | 10. Module release matrix | Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict. |
| **PRD-C108** | 28 | CODE | — | 10. Module release matrix | Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and… |
| **PRD-C109** | 27 | CODE | — | 10. Module release matrix | Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant… |
| **PRD-C110** | 27 | CODE | — | 10. Module release matrix | Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or… |
| **PRD-C111** | 05 | CODE | — | 10.1 Authentication, identity, sessions and organization | Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization… |
| **PRD-C112** | 05 | CODE | — | 10.1 Authentication, identity, sessions and organization | Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and… |
| **PRD-C113** | 05 | CODE | — | 10.2 Organization RBAC and module RBAC | Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive… |
| **PRD-C114** | 05 | CODE | — | 10.2 Organization RBAC and module RBAC | Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role,… |
| **PRD-C115** | 06 | CODE | — | 10.3 Home | Reconstruct current-head Home evidence across folder ownership, universal-versus-module composition, section-level authorization/privacy, bounded… |
| **PRD-C116** | 05 | CODE | — | 10.4 Settings and module-access administration | Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings… |
| **PRD-C117** | 05 | CODE | — | 10.4 Settings and module-access administration | Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement… |
| **PRD-C118** | 07 | CODE | — | 10.5 Directory, Me and employee self-service | Reconstruct current-head Directory/Me evidence across canonical ownership, self-versus-administrative authorization, tenant-scoped schema and… |
| **PRD-C119** | 07 | CODE | — | 10.6 HRMS | Reconstruct current-head HRMS evidence across employee lifecycle schema, tenant-composite integrity, module/record/DataScope authorization, bounded… |
| **PRD-C120** | 08 | CODE | — | 10.7 Payroll | Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are… |
| **PRD-C121** | 08 | CODE | — | 10.7 Payroll | Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct… |
| **PRD-C122** | 08 | CODE | — | 10.7 Payroll | Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and… |
| **PRD-C123** | 09 | CODE | — | 10.8 Build and project management | Reconstruct current-head Build/PM evidence across workspace/project/ticket schema, tenant and record authorization, bounded boards/backlogs/search,… |
| **PRD-C124** | 09 | CODE | — | 10.9 Workflows and automations | Reconstruct current-head Workflow evidence across definition/version/execution schema, permission rung, bounded execution history, idempotent… |
| **PRD-C125** | 10 | CODE | — | 10.10 Billing and payments | Reconstruct current-head Billing/Payments evidence across plans, subscriptions, entitlements, seats, proration, usage, immutable invoices,… |
| **PRD-C126** | 11 | CODE | — | 10.11 Accounting and finance | Reconstruct current-head Accounting/Finance evidence across immutable tenant-safe ledgers, normalized expenses and reconciliation, bounded indexed… |
| **PRD-C127** | 12 | CODE | — | 10.12 Chat | Reconstruct current-head Chat evidence across channel/thread/member/message/reaction/attachment schema, tenant-composite integrity, channel and… |
| **PRD-C128** | 13 | CODE | — | 10.13 Calendar | Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and… |
| **PRD-C129** | 13 | CODE | — | 10.13 Calendar | Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with… |
| **PRD-C130** | 14 | CODE | — | 10.14 Inbox and mail | Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and… |
| **PRD-C131** | 14 | CODE | — | 10.14 Inbox and mail | Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect,… |
| **PRD-C132** | 15 | CODE | — | 10.15 Notifications, email and push | Re-verify provider-response schemas, tenant-fair delivery/backpressure, consent and suppression enforcement, durable retry/DLQ behavior,… |
| **PRD-C133** | 16 | CODE | — | 10.16 Knowledge Base, Wiki and Chatbot | Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and… |
| **PRD-C134** | 16 | CODE | — | 10.16 Knowledge Base, Wiki and Chatbot | Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and… |
| **PRD-C135** | 16 | CODE | — | 10.16 Knowledge Base, Wiki and Chatbot | Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and… |
| **PRD-C136** | 23 | CODE | — | 10.17 Shared storage, search, realtime and integration adapters | Reconstruct current-head shared-adapter evidence across tenant-safe interfaces, bounded retries/timeouts/circuit breakers, idempotency,… |
| **PRD-C137** | 19 | CODE | — | 10.18 Frontend system-wide release | TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules… |
| **PRD-C138** | 20 | CODE | — | 10.18 Frontend system-wide release | UX/accessibility: verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior. |
| **PRD-C139** | 29 | CODE | — | 10.18 Frontend system-wide release | Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing… |
| **PRD-C140** | 29 | CODE | — | 12.1 Backend, database and cache budgets | Publish a benchmark manifest for every module: dataset size, concurrency, warm/cold state, machine/container limits, command, repetitions,… |
| **PRD-C141** | 29 | CODE | — | 12.1 Backend, database and cache budgets | Keep application-controlled overhead for ordinary authenticated reads/mutations at p95 ≤ 300 ms and approved complex aggregate/search operations at… |
| **PRD-C142** | 29 | CODE | — | 12.1 Backend, database and cache budgets | Keep ordinary database statements at p95 ≤ 50 ms and explicitly approved complex statements at p95 ≤ 200 ms on the production-shaped seed; retain… |
| **PRD-C143** | 29 | CODE | — | 12.1 Backend, database and cache budgets | Keep cache-hit application paths at p95 ≤ 100 ms while preserving authorization correctness; a cache miss or Redis outage must degrade safely… |
| **PRD-C144** | 06 | CODE | — | 12.1 Backend, database and cache budgets | Prove Home loads sections concurrently and independently, renders available sections without waiting for the slowest one and never starts an… |
| **PRD-C145** | 29 | CODE | — | 12.1 Backend, database and cache budgets | Prove Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet their budgets without table scans, N+1… |
| **PRD-C146** | 23 | CODE | — | 12.1 Backend, database and cache budgets | Move compression, previews, malware scanning, exports, ingestion, reminders and other CPU/IO-heavy work off request threads; return a durable… |
| **PRD-C147** | 23 | CODE | — | 12.1 Backend, database and cache budgets | Verify connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure instead of exhausting memory, sockets or… |
| **PRD-C148** | 29 | CODE | — | 12.1 Backend, database and cache budgets | Add automated performance-regression gates for declared critical paths; fail on statistically meaningful latency, query-count, buffer, payload or… |
| **PRD-C149** | 29 | CODE | — | 12.2 Next.js, TanStack Query and perceived speed | Meet Core Web Vitals targets on production builds for in-scope authenticated routes: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the defined… |
| **PRD-C150** | 20 | CODE | — | 12.2 Next.js, TanStack Query and perceived speed | Show navigation, skeleton, optimistic or queued feedback within 100 ms of user intent; never leave an action apparently unresponsive while work runs. |
| **PRD-C151** | 29 | CODE | — | 12.2 Next.js, TanStack Query and perceived speed | Record route-level JavaScript, CSS, server payload, image/font and third-party budgets; lazy-load module editors, charts, calendars, chat media and… |
| **PRD-C152** | 17 | CODE | — | 12.3 AI gateway, retrieval and streaming | Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250… |
| **PRD-C153** | 17 | CODE | — | 12.3 AI gateway, retrieval and streaming | Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or… |
| **PRD-C154** | 17 | CODE | — | 12.3 AI gateway, retrieval and streaming | Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails. |
| **PRD-C155** | 17 | CODE | — | 12.3 AI gateway, retrieval and streaming | Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and… |
| **PRD-C156** | 31 | CODE | — | Immediate code-level final gate | Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence. |
| **PRD-C157** | 31 | CODE | — | Immediate code-level final gate | CRM/Inventory remain excluded and public landing visuals/animations remain unchanged. |
| **PRD-C158** | 31 | CODE | — | Immediate code-level final gate | Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit. |
| **PRD-C159** | 31 | CODE | — | Immediate code-level final gate | Two empty bootstraps and an interrupted-then-resumed bootstrap produce the same expected database catalog from the new authorized baseline; no… |
| **PRD-C160** | 31 | CODE | — | Immediate code-level final gate | No unresolved code-level P0/P1 finding remains. |
| **PRD-C161** | 31 | **HUMAN** | — | Immediate code-level final gate | Release authority records commit, evidence, accepted code-level residual risks and date. |
| **PRD-C162** | 32 | **DEPLOYED** | — | Deployed security, provider and performance | Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios. |
| **PRD-C163** | 32 | **DEPLOYED** | — | Deployed security, provider and performance | Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation. |
| **PRD-C164** | 32 | **DEPLOYED** | — | Deployed security, provider and performance | Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior. |
| **PRD-C165** | 34 | **DEPLOYED** | HUMAN, conditionally | Deployed security, provider and performance | Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target. |
| **PRD-C166** | 34 | **DEPLOYED** | — | Deployed security, provider and performance | Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity. |
| **PRD-C167** | 34 | **DEPLOYED** | — | Deployed security, provider and performance | Prove declared SLOs with at least 40% capacity headroom. |
| **PRD-C168** | 33 | **DEPLOYED** | — | Cloud, recovery and operations | Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring. |
| **PRD-C169** | 33 | **DEPLOYED** | — | Cloud, recovery and operations | Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and… |
| **PRD-C170** | 33 | **DEPLOYED** | — | Cloud, recovery and operations | Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md). |
| **PRD-C171** | 33 | **DEPLOYED** | — | Cloud, recovery and operations | Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and… |
| **PRD-C172** | 34 | **DEPLOYED** | HUMAN | Cloud, recovery and operations | Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md). |
| **PRD-C173** | 34 | **DEPLOYED** | — | Cloud, recovery and operations | Configure production logs, traces and release metadata with redaction. |
| **PRD-C174** | 34 | **DEPLOYED** | HUMAN | Cloud, recovery and operations | Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md). |
| **PRD-C175** | 34 | **DEPLOYED** | HUMAN | Cloud, recovery and operations | Capture passing RB-01â€“RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology,… |
| **PRD-C176** | 34 | **DEPLOYED** | — | Cloud, recovery and operations | Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure. |
| **PRD-C177** | 34 | **DEPLOYED** | — | Cloud, recovery and operations | Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling. |
| **PRD-C178** | 34 | **HUMAN** | — | Cloud, recovery and operations | Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures. |
| **PRD-C179** | 33 | **DEPLOYED** | HUMAN | Cloud, recovery and operations | Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership. |
| **PRD-C180** | 35 | **HUMAN** | — | Compliance and approvals | Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation. |
| **PRD-C181** | 35 | **DEPLOYED** | — | Compliance and approvals | Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases. |
| **PRD-C182** | 35 | **HUMAN** | — | Compliance and approvals | Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md)… |
| **PRD-C183** | 35 | **HUMAN** | — | Compliance and approvals | Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior. |
| **PRD-C184** | 35 | **HUMAN** | — | Compliance and approvals | Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties. |
| **PRD-C185** | 35 | **HUMAN** | — | Compliance and approvals | Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure. |
| **PRD-C186** | 35 | **DEPLOYED** | — | Compliance and approvals | Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills. |
| **PRD-C187** | 35 | **DEPLOYED** | — | Compliance and approvals | Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion. |
| **PRD-C188** | 35 | CODE | — | Compliance and approvals | Run retention/legal-hold drills and store a redacted, hashed evidence bundle. |
| **PRD-C189** | 35 | **HUMAN** | — | Compliance and approvals | Close or formally disposition every production/security/privacy/compliance P0/P1 finding. |
| **PRD-C190** | 36 | **DEPLOYED** | — | Production-ready final gate | Immediate code-level gate remains green at the deployed commit. |
| **PRD-C191** | 36 | **DEPLOYED** | HUMAN | Production-ready final gate | Every deferred checkbox is complete with current evidence. |
| **PRD-C192** | 36 | **DEPLOYED** | HUMAN | Production-ready final gate | Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement. |
| **PRD-C193** | 36 | **HUMAN** | — | Production-ready final gate | Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded. |
| **PRD-C194** | 36 | **DEPLOYED** | HUMAN | Production-ready final gate | No unresolved production/compliance P0/P1 finding remains. |
| **PRD-C195** | 36 | **HUMAN** | — | Production-ready final gate | Release authority records commit, environment, evidence, accepted residual risks and date. |

---

## What this ledger does not claim

- **A CODE class is not a pass.** It says the criterion is closable here, not that it is
  closed. All 195 are unchecked in the PRD, confirmed by `check:prd-traceability`
  (0 checked / 195 unchecked, exit 0).
- **No checkbox state is changed by this file.** The orchestrator owns checkbox state.
- **No signature appears anywhere in it**, and no drill it did not run is described as run.
  Every command it cites as run is listed in `README.md` with its real exit code.
