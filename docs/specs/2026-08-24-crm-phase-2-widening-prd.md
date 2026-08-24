# PRD — Phase 2: widening the skeleton

**Status:** ready-for-agent
**Date:** 2026-08-24
**Phase:** 2 of 5
**Blocked by:** Phase 1 (CRM walking skeleton) complete and deployed
**Origin:** grilling session, 2026-08-23 — decisions `D01`–`D28`; this phase carries the work Phase 1 deferred

---

## Problem Statement

Phase 1 proved the architecture on one vertical slice. Everything it proved is still true of about five percent of the product.

A tenant who wants to leave Zoho for StreamlineOS today hits four walls, and each one is enough on its own to end the conversation:

1. **The identity split is still there, and it is enormous.** Phase 1 added Party without touching what came before, deliberately. The result is that `leads` is referenced by 93 module files, `clients` by 45, `contacts` by 36 and `business_parties` by 7 — and Party by a handful. The same customer still exists three times; Phase 1 simply added a fourth, correct row beside the three wrong ones. Every screen outside the Phase 1 slice still shows the old truth.

2. **One channel is not a communication history.** The ingress seam accepts a normalised event from any provider, but only email is wired. A rep whose customers call, WhatsApp and fill in web forms sees a timeline with a quarter of the conversation on it, which is worse than no timeline — it looks complete and is not.

3. **Importing is a project, not a step.** Moving from Zoho, HubSpot, Salesforce or Pipedrive means CSV exports, field mapping by hand, and a week of reconciliation. Most evaluations die here, before the product is ever judged on its merits.

4. **Nothing surfaces what is wrong with the data.** Phase 1's duplicate scorer runs, and its findings go into a table. There is no queue, no owner, no measure of whether the dataset is getting better or worse.

Underneath all four is the same structural fact: Phase 1 built seams and used each one once. A seam used once is a hypothesis. A seam used ten times is architecture.

## Solution

Widen every Phase 1 seam to production breadth, and retire the identity split that made the CRM untrustworthy in the first place.

**Identity converges.** `contacts`, `clients`, `leads` and `business_parties` become views onto Party rather than parallel truths. This is not a rewrite — it is expand–contract, run as a sequence of independently shippable batches, because a single change touching 93 files cannot land green and cannot be reviewed. Each batch moves one module's readers onto the Party seam while the old tables still exist; the tables are dropped only when no reader remains.

**Every channel arrives through the same door.** Telephony, WhatsApp and web forms each become an adapter that normalises to the existing `InboundCommunicationEvent` and hands off. Nothing below the ingress seam changes — that was the point of proposing it as high as it sits, and this phase is where that claim is tested rather than asserted.

**Migration becomes a step.** An importer reads a competitor's export — or connects to their API directly for the big four — infers the mapping onto Party, Subject, Pipeline and Activity, shows the tenant what it inferred, and lets them correct it before anything is written. The inference is a model call; the write is deterministic and reversible.

**Data quality gets an owner and a number.** Everything the system distrusts — duplicate candidates, contradictory fields, parties with no reachable address, deals with no activity in 60 days — lands in one queue with an assignee and an age. The per-tenant scoreboard from Phase 1 gains a dataset-health figure that moves when the queue is worked.

**The internal loops get a home.** Issues the system raises about itself, tasks a team assigns internally, and complaints a customer escalates all become first-class records on the same renderer, rather than living in email.

## Goals

- One identity for a person or organisation across the **whole** product, with the legacy tables dropped rather than merely bypassed.
- Four inbound channels live, all through the Phase 1 ingress seam, with zero changes below it.
- A tenant can move their entire Zoho, HubSpot, Salesforce or Pipedrive dataset in a session, unattended, and see what will be written before it is.
- Every CRM record type rendered by the Phase 1 engine — no hand-written CRM list, table or form remains.
- Dataset health is a number on a dashboard that moves when someone works the queue.

## Non-Goals

- Taking money, self-serve signup, or the marketing site. That is Phase 3.
- Standing up the second and third regions. Phase 1 built the seam; Phase 3 uses it.
- Outbound messaging beyond Phase 1's single held quote path, and no cold outbound at all.
- Renderer migration for non-CRM modules. CRM only here; the rest is Phase 4 (`D28`).
- Conversation intelligence, commissions, renewals, marketing automation, the report builder. Phase 5.

## Seams

**No new seams.** This is the phase's central claim and its main risk: if a seam needs to move to accommodate a second, third or fourth use, Phase 1 got it wrong and this is when that surfaces. All three Phase 1 seams are used at breadth:

**Controller end-to-end** carries every new record surface, every importer endpoint and every queue action. Because validation, authentication, MFA and module gating are globally registered, a request through `createE2eApp` exercises tenancy, row-level security and permission resolution without restating any of it.

**AI evaluation** gains three new datasets: import field-mapping inference, data-quality classification, and per-channel extraction (a phone transcript and a WhatsApp thread are not an email, and an extractor tuned on email will quietly degrade on both). Each gets its own `EVAL_ACCEPTANCE` gate, enforced in CI.

**Inbound ingress** takes three more adapters. Each is a normaliser and nothing else. The acceptance test for this phase is not that the adapters work — it is that adding them required no change to the workflow, the party resolver, the activity writer or the schema. A diff below the seam is a finding, not an implementation detail.

## User Stories

**Sales representative — one customer, one record**

1. As a sales rep, I want the customer I open from a deal, an invoice, a support ticket and a lead to be the same record, so that I stop reconciling four half-truths in my head.
2. As a sales rep, I want a contact who changes employer to keep their history and gain a new party relationship, so that the years of context do not vanish with their email domain.
3. As a sales rep, I want every screen in the product to agree about a customer's name, address and owner, so that I never have to ask which one is right.
4. As a sales rep, I want the merge I approved last month to still hold everywhere, so that a module reading an old table does not resurrect the duplicate.

**Sales representative — the whole conversation**

5. As a sales rep, I want a call to appear on the timeline with its recording, duration and extracted next step, so that I do not type up calls.
6. As a sales rep, I want a WhatsApp thread to sit on the same timeline as the email thread with the same customer, so that the conversation reads as one conversation.
7. As a sales rep, I want a web-form enquiry to create or match a party and open a deal without anybody triaging it, so that a lead is never lost to an unattended inbox.
8. As a sales rep, I want a missed call from an unknown number that later matches a known party to be attached retrospectively, so that the history heals itself.
9. As a sales rep, I want to see which channel each entry came from, so that I know where to reply.

**Operations lead — moving in**

10. As an operations lead, I want to connect our Zoho account and have the system read it directly, so that I am not exporting and re-importing seventeen CSVs.
11. As an operations lead, I want the system to propose how each of their fields maps onto ours, so that I correct a mapping rather than build one.
12. As an operations lead, I want to see exactly what will be created, updated, merged and skipped before anything is written, so that I approve a plan rather than discover an outcome.
13. As an operations lead, I want the import to be reversible for a defined window, so that a bad mapping is a mistake rather than a catastrophe.
14. As an operations lead, I want an import that fails halfway to be resumable rather than restarted, so that a large dataset is not hostage to one network blip.
15. As an operations lead, I want records the importer was unsure about routed to the data-quality queue instead of guessed, so that uncertainty becomes work rather than corruption.
16. As an operations lead, I want the same importer to accept a plain spreadsheet from a system we have no connector for, so that "we use something obscure" is not a blocker.

**Data steward — the dataset has a caretaker**

17. As a data steward, I want one queue holding everything the system distrusts, so that data quality is a job someone does rather than a complaint someone makes.
18. As a data steward, I want each item to carry why it was raised and what the system would do about it, so that I approve a fix rather than investigate a hunch.
19. As a data steward, I want to fix a whole class of problem at once, so that a systematic import error is one action rather than four hundred.
20. As a data steward, I want dataset health as a number with a history, so that I can show the work mattered.
21. As a data steward, I want my corrections to feed the eval dataset, so that the system stops making the same mistake.

**Support agent — complaints and escalations**

22. As a support agent, I want a customer complaint to be a record on the customer's timeline, so that the next person to talk to them knows.
23. As a support agent, I want an escalation to carry its own severity, owner and clock, so that "someone is on it" is verifiable.
24. As a support agent, I want a complaint that names a deal to link to that deal, so that the commercial consequence is visible.

**Internal team — issues the system raises about itself**

25. As a team member, I want an internal task assigned to me to appear in the same list as my customer follow-ups, so that I have one list.
26. As a team member, I want issues the system raises about the data to be assignable like any other work, so that they do not accumulate unowned.
27. As an administrator, I want to see which internal issues are ageing, so that quiet rot is visible.

**Administrator — the renderer everywhere**

28. As an administrator, I want every CRM record type to look and behave identically, so that training someone on one screen trains them on all of them.
29. As an administrator, I want a density change or a mobile fix to apply to every CRM surface at once, so that consistency is structural rather than maintained.
30. As an administrator, I want to adjust which fields appear on a record type for my tenant, so that we are not stuck with someone else's idea of a deal.

**Engineer — the migration is safe**

31. As an engineer, I want the identity migration to land in reviewable batches that each keep CI green, so that a 93-file change is not one unreviewable commit.
32. As an engineer, I want the old tables to remain readable until no consumer reads them, so that a missed call site is a bug rather than an outage.
33. As an engineer, I want a test that fails when a new call site reads a legacy identity table, so that the migration does not regress behind me.
34. As an engineer, I want adding a channel to require no change below the ingress seam, so that Phase 1's central architectural bet is verified rather than assumed.

## Implementation Decisions

### Identity convergence, as expand–contract

`D08`. The blast radius makes this the one place in the programme where vertical slicing is the wrong shape. A rename touching 93 files cannot land green as a tracer bullet and cannot be reviewed as one diff.

**Expand.** Party gains everything the legacy tables carry that it does not already: the lead-specific fields, the client-specific fields, the contact-specific fields. A compatibility layer resolves a legacy id to a Party. Nothing is removed. Both forms exist and agree, because writes go to both for the duration.

**Migrate, in batches sized by module.** One ticket per consuming module, each blocked by the expand and independent of its siblings, each moving that module's reads onto the Party seam and its writes onto Party alone. CI stays green batch to batch because the old tables are still there. `leads` (93 files) is itself several batches, not one.

**Contract.** The legacy tables are dropped in a final ticket blocked by every migrate batch. A lint rule and a test — not a convention — fail the build if a new call site reads them, so the migration cannot silently regress while it is in progress.

The dual-write window is the risk. It is bounded by making the Party row canonical from the first batch: legacy tables are written for compatibility and never read as truth, so a divergence is a stale mirror rather than two competing sources.

### Channels

Three adapters, each of which normalises and stops.

- **Telephony** produces a call event with duration, direction, recording reference and, where the provider offers it, a transcript. No transcript is synthesised here — a call with no transcript is a call with no body, and the extraction tier handles that case by doing nothing rather than guessing.
- **WhatsApp** produces a message event, threaded on the provider's conversation identifier where present and on the participant pair where not.
- **Web forms** produce an event whose participants are derived from the submitted fields, with the form's own identity as the provider.

All three go through Composio (`integrations` module, server-side only), consistent with the platform rule that third-party connectivity never uses direct provider OAuth and never stores provider tokens in our database.

Per-channel extraction is measured separately. An extractor tuned on email prose degrades on a phone transcript's disfluency and on WhatsApp's fragmentary style, and a single blended accuracy figure hides exactly that.

### The importer

Two paths, one destination.

**Direct connectors** for Zoho, HubSpot, Salesforce and Pipedrive read the source API. **The universal path** accepts any spreadsheet or export. Both produce the same intermediate: a set of source records with an inferred mapping onto Party, Subject, Pipeline stage and Activity.

The inference is a model call; **the write is not**. The model proposes a mapping and a confidence per field. The tenant sees the proposal as a plan — created, updated, merged, skipped, with counts and samples — and edits it. Only then does a deterministic writer run, inside the durable workflow runtime, so a large import is resumable rather than restartable, and each batch is a memoised step.

An import is reversible for a defined window through the same snapshot mechanism Phase 1's merge reversal uses. Records the mapping was unsure about are not written speculatively; they go to the data-quality queue.

Deduplication on import reuses Phase 1's duplicate scorer with its existing thresholds. An import is precisely the moment duplicates are created at scale, and inventing a second scorer for it would guarantee the two disagree.

### Data quality

One queue, many producers: the duplicate detector, contradiction checks, reachability checks, staleness checks, and the importer's own uncertainty. Each item carries its producer, its evidence, the action the system would take, and its reversibility class — the same vocabulary Phase 1's decision record uses, so the review feed and this queue read the same shape.

Bulk resolution is a first-class action, because import errors are systematic: four hundred parties with the same malformed country code is one decision, not four hundred.

Dataset health is a composite of the open queue by class, weighted by severity, expressed per tenant and tracked over time on the Phase 1 scoreboard.

### Issues and complaints

`D27`. Internal issues, internal tasks and customer complaints are three record types on the renderer, not three bespoke modules. A complaint anchors to a Party and optionally to a Deal, so the commercial consequence of a service failure is visible where the commercial decision is made. Severity, owner and clock are fields; escalation is a stage transition through the same ledger Phase 1 built for deals, so the accountability model is not reinvented.

### Rendering

`D10`, `D28`. Every remaining CRM record type moves onto the Phase 1 engine. Hand-written CRM screens are limited to the deliberately crafted surfaces Phase 1 named — the timeline and the action review feed — plus the import plan, which is a workflow rather than a record surface.

Per-tenant layout adjustment (`D07`) becomes real here: the layout description is data, so a tenant administrator can reorder, hide and group fields on a record type, and the system can propose a layout from what the tenant actually fills in.

### Access control

Every new surface carries a permission key in both catalogues, and every template change ships a backfill migration — templates grant on role creation only, so a key added without a backfill is inert for every organisation that already exists.

## Testing Decisions

### What makes a good test here

The same rule as Phase 1: test external behaviour at the highest seam available, never implementation detail. Two additions specific to this phase.

**The migration's tests are about consumers, not about Party.** Party is already tested. What is untested is whether the accounting module still produces the same invoice after its reads move. Each migrate batch's acceptance is that its module's existing e2e suite passes unchanged — if a batch needs its tests edited, the batch changed behaviour and that is the finding.

**The seam claim is a test.** A check that fails if the diff for a new channel adapter touches anything below the ingress seam. This is the only way "adding a channel is free" stays true rather than becoming a thing that was true once.

### Seam one — controller end-to-end

Every importer endpoint, queue action, complaint and issue surface. Cross-tenant isolation, permission allow/deny, and scope narrowing on every list. Cross-tenant misses return 404, never 403.

### Seam two — AI evaluation

Three new datasets with `EVAL_ACCEPTANCE` gates:

- **Import mapping inference** — precision on field mapping, with a zero-tolerance gate on mapping a field into an identity column it does not belong in, because that is how one customer becomes another.
- **Data-quality classification** — no-false-positive gate on destructive classes; recall gate on the rest.
- **Per-channel extraction** — separate gates for transcript, WhatsApp and form, each with the no-invented-date and injection-resistance gates Phase 1 established.

### Seam three — inbound ingress

Each adapter is driven from a fixture. No provider SDK is mocked anywhere, in keeping with Phase 1: the fixture is the contract.

### Frontend

The renderer is tested as a unit against layout descriptions. Individual generated screens are not tested — that is the point of having one engine. The importer's plan screen is tested, because it is hand-written and because approving a plan is the moment a tenant's data is at stake.

### What is deliberately not tested

Provider SDK behaviour; the fifty generated record screens individually; the visual appearance of the renderer beyond structure, density and reflow.

## Out of Scope

**Phase 3** — multi-currency; payment providers beyond Razorpay and per-seat plan gating (`D20`); marketing site and self-serve signup (`D19`); GDPR operational work; standing up the second and third regions.

**Phase 4** — the four autonomy loops at full strength (`D14`); cold outbound; renderer migration for non-CRM modules (`D28`).

**Phase 5** — conversation intelligence, commissions, renewals, marketing automation, the report builder (`D25`); the MCP server.

**Not in this programme** — native mobile applications; a visual layout builder exposed to tenant administrators beyond field-level adjustment; user-defined objects beyond the Subject slot; custom roles.

## Further Notes

**The identity migration is the phase.** Channels, importer and queue are each a few weeks. Moving 181 module file references onto one identity model without an outage is the work, and it is what makes every subsequent phase cheaper. Sequencing it first is deliberate: the importer writes Party, and writing Party while three legacy tables still claim to be the truth would import the problem rather than the data.

**Phase 1's central bet is judged here.** The ingress seam was proposed at the highest possible point on the argument that adding a channel would then be free. This phase adds three. If any of them requires a change below the seam, that is the most valuable finding in the phase and should be treated as one, not patched around.

**Razorpay is the only payment adapter in the codebase.** It does not matter in this phase — nothing here takes money — but it is the reason Phase 3 is larger than it looks, and it is recorded here so the sequencing decision is visible.
