# PRD — Phase 4: the four loops at full strength

**Status:** ready-for-agent
**Date:** 2026-08-24
**Phase:** 4 of 5
**Blocked by:** Phase 3 (commercial launch and three regions) complete and deployed
**Origin:** grilling session, 2026-08-23 — decisions `D01`–`D28`; this phase carries `D14`, `D28` and the outbound half of `D15`/`D16`

---

## A correction to the record, before anything else

The Phase 1 PRD refers to "all four autonomy loops" (`D25`, `D26`) and elsewhere names only three: **inbound**, **forecasting** and **outbound** (`D14`). The fourth was never written down.

This PRD fixes it as **data quality** — the loop in which the system corrects its own record without being asked. That is the reading most consistent with everything actually built: Phase 1's duplicate scorer and merge machinery, Phase 2's data-quality queue, and the thesis in Phase 1's own title, *the self-maintaining record*. It is recorded as a decision made here rather than one recovered from the grilling session, because it was not.

---

## Problem Statement

After three phases the product acts autonomously in one direction, on one channel, over one decision type — and it is honest about that, which is the problem. A prospect evaluating StreamlineOS against Zoho or Salesforce is not comparing feature lists; they are asking whether the machine actually runs the pipeline. Today the answer is "part of it, inward, when someone emails you."

Four gaps, one per loop:

1. **Inbound is reactive and shallow.** The system reads what arrives and updates the record. It does not decide that a conversation has gone quiet, that a champion has stopped replying while a procurement contact has started, or that a thread has forked into a second opportunity. It processes events; it does not watch relationships.

2. **Forecasting is arithmetic.** A weighted pipeline is stage probability times value, which is a spreadsheet with extra steps. It does not know that this customer always slips a quarter, that deals sourced this way close at half the stated rate, or that the rep's own confidence has historically been optimistic by a knowable margin.

3. **Outbound barely exists.** Phase 1 built exactly one outbound path — a quote, held briefly, then sent. Everything else a rep sends, they write. The follow-up nobody sent is still the largest single source of lost revenue in the pipeline, and the system watches it not happen.

4. **Data quality is a queue, not a loop.** Phase 2 gave the problems an owner and a number. A human still works them. The system that raised four hundred identical malformed country codes is capable of fixing four hundred identical malformed country codes.

Underneath, one structural gap: **fifty non-CRM routes are still hand-written**. Phase 2 put every CRM record type on the renderer. Settings, HR, Build, inventory, accounting and the rest were not touched (`D28`), so the consistency Phase 2 bought applies to a quarter of the product and the seams show at every module boundary.

## Solution

Close each loop so it runs without a person in it, and finish the renderer migration so the product reads as one product.

**Inbound watches relationships, not just events.** Silence is a signal. A changed reply pattern is a signal. A new participant on a thread is a signal. The loop moves from processing deliveries to maintaining a model of each relationship's state, and acting when that state changes.

**Forecasting learns from what actually happened.** Every closed deal is a labelled example. The loop scores each open deal against the tenant's own history — their slip rates, their source quality, their reps' calibration — and produces a forecast with a stated confidence interval, plus the specific reasons it differs from the naive weighted number.

**Outbound acts, inside a hold window.** The follow-up, the nudge, the check-in, the renewal reminder and the meeting request are drafted and sent by the system under the Phase 1 hold model (`D15`, `D16`): the decision is autonomous, the window is short and visible, and a human can stop it. Cold outbound is a separate track with its own gating, because it cannot launch before domain warming and platform approvals complete regardless of how finished the code is.

**Data quality repairs itself.** Classes of problem the system can fix deterministically and reversibly, it fixes — and records what it did. What remains in the human queue is genuine judgement rather than clerical work.

**The renderer reaches the rest of the product.** Settings first, then the remaining modules, in batches (`D28`).

## Goals

- Each of the four loops runs end to end with no human step in the normal case.
- Outbound sends under the hold model with a measured stop rate, and cold outbound runs only behind explicit per-tenant enablement and a warmed domain.
- Forecast accuracy beats naive weighted pipeline on held-out historical data, measured per tenant.
- The proportion of data-quality items resolved without a human rises, and the residue is judgement rather than clerical work.
- No hand-written list, table or form remains anywhere in the product outside the deliberately crafted surfaces.

## Non-Goals

- Conversation intelligence, commissions, renewals, marketing automation and the report builder — the best-in-class tier (`D25`). Phase 5.
- The MCP server. Phase 5.
- Any relaxation of the Phase 1 autonomy safety model. This phase widens what the system does, not how freely it does it.
- New channels. Phase 2 added telephony, WhatsApp and web forms; this phase uses them rather than extending the set.
- Native mobile applications.

## Seams

**No new seams.** Every loop extends an existing one, and that is a deliberate constraint on the design rather than a happy observation: a loop that needs a new seam is a loop that has not been decomposed properly.

**Inbound ingress** already accepts every channel. The relationship model is a consumer of the events it produces, not a second entry point.

**The durable workflow runtime** carries every loop. Silence detection, forecast scoring, outbound scheduling and quality repair are all scheduled or event-driven runs with memoised steps, leases and backoff — the same runtime Phase 1 built for one workflow now carries a dozen.

**The decision record** is unchanged in shape and now covers four times the traffic. Every autonomous write in every loop records triggering event, inputs considered, model and prompt version, decision, confidence and reversibility class. The review feed reads the same rows.

**AI evaluation** gains a dataset per loop, each with its own `EVAL_ACCEPTANCE` gate in CI, plus the outbound safety gates, which are the strictest in the programme because outbound is the only loop whose mistakes leave the building.

**The renderer** takes the remaining modules. No changes to the engine are expected; if a module needs one, that is a finding about the layout description's expressiveness and is worth surfacing rather than special-casing.

## User Stories

**Sales representative — the inbound loop watches**

1. As a sales rep, I want a deal that has gone quiet to be flagged before I notice, so that silence is caught at two weeks rather than two months.
2. As a sales rep, I want the system to notice when my champion stops replying and someone in procurement starts, so that a buying-committee change is visible.
3. As a sales rep, I want a thread that has forked into a second opportunity to be recognised as one, so that a cross-sell is not buried in a reply chain.
4. As a sales rep, I want a customer who mentions a competitor to have that captured on the deal, so that the objection is known before the call.
5. As a sales rep, I want the system to understand that an out-of-office is not a reply, so that silence is measured honestly.

**Sales representative — the outbound loop acts**

6. As a sales rep, I want a follow-up I would have sent to be drafted and sent for me, so that the follow-up actually happens.
7. As a sales rep, I want to see what is about to go out and be able to stop it, so that autonomy is not the same as losing control.
8. As a sales rep, I want a stopped message to teach the system, so that I stop the same mistake once rather than weekly.
9. As a sales rep, I want the system to propose a meeting time from my real calendar and send the invitation, so that scheduling stops costing four emails.
10. As a sales rep, I want outbound to respect the customer's stated preferences and consent, so that automation never breaches a promise I made.
11. As a sales rep, I want nothing to be sent outside the customer's working hours, so that a machine does not damage a relationship at 3am.

**Sales manager — the forecasting loop**

12. As a sales manager, I want a forecast with a confidence interval rather than a single number, so that I can plan against a range.
13. As a sales manager, I want to see why the system's forecast differs from the weighted pipeline, so that I can argue with it specifically.
14. As a sales manager, I want the model to learn from our own closed deals rather than an industry average, so that it reflects how we actually sell.
15. As a sales manager, I want to see which of my reps are systematically optimistic or pessimistic, so that coaching is evidence-based.
16. As a sales manager, I want a deal the system believes is at risk to say what would change its mind, so that the warning is actionable.
17. As a sales manager, I want forecast accuracy tracked over time, so that I know whether to trust it.

**Data steward — the quality loop repairs**

18. As a data steward, I want the system to fix classes of problem it can fix safely, so that I spend my time on judgement rather than typing.
19. As a data steward, I want every automated repair to be reversible and recorded, so that a wrong fix is an inconvenience rather than a loss.
20. As a data steward, I want to set which classes the system may fix without me, so that the boundary is mine to move.
21. As a data steward, I want the proportion of automated versus manual resolution visible, so that I can see the loop closing.

**Growth lead — cold outbound**

22. As a growth lead, I want cold outbound to be off until we explicitly enable it, so that it can never start by accident.
23. As a growth lead, I want the system to refuse to send from a domain that has not been warmed, so that a campaign cannot destroy our deliverability.
24. As a growth lead, I want suppression lists honoured absolutely and unsubscribes processed immediately, so that compliance is structural.
25. As a growth lead, I want sending volume to ramp on a schedule rather than all at once, so that reputation is protected by design.
26. As a growth lead, I want bounce and complaint rates to pause sending automatically at a threshold, so that a bad list stops itself.

**Everyone — one product**

27. As any user, I want settings, HR, Build and every other module to look and behave like the CRM, so that the product stops feeling like six products.
28. As any user, I want the same density, empty states and mobile behaviour everywhere, so that my phone is not a second-class client in half the app.
29. As an administrator, I want a fix to a shared surface to apply everywhere at once, so that consistency is structural rather than maintained.

**Engineer — the loops are safe**

30. As an engineer, I want every loop's decisions to land in the same record with the same shape, so that oversight does not fragment per loop.
31. As an engineer, I want a loop that starts misbehaving to be stoppable per tenant, per loop, without a deploy, so that the kill switch is real.
32. As an engineer, I want each loop's accuracy gated in CI, so that a prompt change that regresses one loop cannot ship because another improved.
33. As an engineer, I want no loop to need a new seam, so that the architecture is verified by use rather than by assertion.

## Implementation Decisions

### The relationship model, and why inbound needs one

The inbound loop currently maps event to consequence. Watching for silence, participant change and thread forking requires state that no single event carries: what normal looks like for *this* relationship.

A relationship state record per party-and-deal pair holds last contact per direction, reply latency distribution, participant set with roles, and thread lineage. It is derived from activities and rebuildable from them, so it is a materialisation rather than a second source of truth — which matters, because a derived model that drifts from its source is worse than no model.

Silence is measured against the relationship's own baseline, not a fixed threshold. A customer who replies weekly is not silent after three days; one who replies hourly is.

### Forecasting learns per tenant

Every closed deal is a labelled example, and every tenant has a different label distribution. A global model would encode the average customer's sales process, which is nobody's.

Features come from what the platform already stores: stage transition history and dwell times from Phase 1's ledger, activity density and recency from Phase 2's unified timeline, source, value, party attributes and rep. The output is a probability with an interval and a ranked list of contributing factors, because a forecast nobody can interrogate is a forecast nobody acts on.

Cold-start is explicit: a tenant with too few closed deals gets the naive weighted number, labelled as such, until they have enough history. Pretending to a learned forecast on twelve examples is how trust is lost once and permanently.

This is a statistical model rather than a language model, and the distinction is deliberate: it is auditable, cheap to run per deal per day, and does not vary its answer between runs.

### Outbound, under the hold model

`D15`, `D16`. Outbound extends Phase 1's hold window rather than inventing a second safety model. The decision is autonomous; the window is short and visible; a human can stop it; the stop is recorded and feeds the eval dataset.

Guardrails are enforcement, not configuration:

- **Consent and preferences** are checked at send time against the existing `crm/consent` model, not at draft time. A preference changed during the hold window must win.
- **Working hours** derive from the party's own timezone where known and the tenant's where not.
- **Frequency caps** are per party across all loops, so four loops cannot each politely send one message.
- **A stopped message stops its class for that party** pending review, rather than only that instance.

**Cold outbound is a separate track behind separate gating**, because its failure mode is different in kind: a bad follow-up annoys a customer, a bad cold campaign destroys the sending domain for every tenant on it. It requires explicit per-tenant enablement, a warmed domain with a ramp schedule, absolute suppression-list honouring, immediate unsubscribe processing, and automatic pause on bounce or complaint thresholds. None of that is a setting a tenant can override.

### The data-quality loop

A class is auto-repairable when the repair is deterministic, reversible, and its evidence is unambiguous — a malformed country code with exactly one valid interpretation. It is not auto-repairable when the repair requires choosing between plausible alternatives, which is most merges.

The tenant chooses which classes the system may repair unattended, defaulting to the conservative set. Every repair is a decision record with a reversibility class, so it appears in the review feed like any other autonomous write.

The loop's measure is the ratio of automated to manual resolution, and the residue's composition. A loop that automates only the easy tail while the queue grows is not closing.

### Renderer migration

`D28`. Settings first, because it is the most inconsistent surface and the least risky to change, then the remaining modules in batches sized by blast radius — the same expand–contract shape Phase 2 used for identity, for the same reason.

The engine is not expected to change. A module that cannot be expressed as a layout description is a finding about the description's expressiveness, and the right response is to extend the description once rather than special-case the module.

### Kill switches

Phase 1 built a kill switch for autonomy. With four loops it becomes per-loop and per-tenant, settable without a deploy, and checked by every loop before it acts. A single global switch is not sufficient once the loops have independent failure modes.

## Testing Decisions

### What makes a good test here

Same rule, one addition: **for a loop, the test drives time**. A silence detector cannot be tested by calling it — it is tested by advancing a fixture clock over a fixture relationship and asserting what the loop did and did not do. Loops whose behaviour depends on elapsed time need time to be an input, not an ambient fact.

### Seam — controller end-to-end

Every loop's configuration surface, the review feed, the kill switches, and the hold-window stop action. Cross-tenant isolation throughout.

### Seam — durable workflow runtime

Each loop is driven from a fixture through the real runtime. Retry produces no duplicate consequence; a stuck run says where it stopped; a lease expiry does not double-execute. These are the runtime's guarantees and they are re-asserted per loop because a loop that violates them is a loop that will send a customer four copies of the same message.

### Seam — AI evaluation

A dataset and gate per loop. The outbound gates are the strictest in the programme:

- **Zero tolerance** on sending to a party without consent, outside working hours, past a frequency cap, or on a suppression list. These are not accuracy metrics; a single failure fails the build.
- **Zero tolerance** on prompt injection from the inbound conversation altering outbound behaviour, since the conversation is untrusted input by definition.
- **Accuracy gates** on draft quality and on the decision to send at all, with the asymmetry Phase 1 established: not sending is cheap, sending wrongly is not.

Forecasting is evaluated differently, as a statistical model: held-out historical data per tenant, measured against the naive weighted baseline, with calibration checked rather than only accuracy. A confident wrong forecast is worse than an uncertain one.

### Frontend

The renderer is already tested against layout descriptions. Migration batches assert that each module's existing e2e suite passes unchanged — if a batch needs its tests edited, the batch changed behaviour.

### What is deliberately not tested

Provider deliverability; the actual content of any specific generated message beyond its gates; the generated screens individually.

## Out of Scope

**Phase 5** — conversation intelligence, commissions, renewals, marketing automation, the report builder (`D25`); the MCP server.

**Not in this programme** — native mobile applications; a visual layout builder beyond field-level adjustment; user-defined objects beyond the Subject slot; custom roles.

## Further Notes

**This is the phase where the product's central claim becomes true or does not.** Everything before it is infrastructure for a promise: that the CRM maintains itself and the human work disappears. One loop, on one channel, over one decision type, is a demonstration. Four loops running unattended across every channel is the product.

**Outbound is the only loop whose mistakes leave the building**, and its gating is deliberately disproportionate for that reason. The hold window, the frequency cap, the consent check at send time and the cold-outbound track are not four separate safety features; they are one position, which is that the system may decide alone and may not be unstoppable.

**Cold outbound's schedule is not ours to set.** Domain warming takes weeks and platform approvals take as long as they take, both independent of build progress. Starting that clock early — during Phase 3, not here — is the only lever available, and it is recorded here so the dependency is visible while there is still time to act on it.

**The fourth loop was named in this document.** If the grilling session intended something else by "four loops" — retention and expansion is the other plausible reading — that is worth correcting before this phase starts rather than after, and the correction costs a conversation now and a quarter later.
