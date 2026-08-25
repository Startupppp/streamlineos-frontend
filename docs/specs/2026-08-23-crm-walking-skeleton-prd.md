# PRD — CRM walking skeleton: the self-maintaining record

**Status:** ready-for-agent
**Date:** 2026-08-23
**Phase:** 1 of 5 (see *Out of Scope* for what the later phases carry)
**Origin:** grilling session, 2026-08-23 — 28 decisions recorded, referenced below as `D01`–`D28`

---

## Problem Statement

A salesperson using StreamlineOS today has to tell the CRM what they already did. They make the call, then log the call. They send the quote, then update the stage. They learn the champion left, then remember to write it down. Most of the time they don't, so the pipeline is a work of fiction: deals sit in stages they left weeks ago, contacts have moved companies, the same customer exists three times, and the forecast is built on all of it.

The system makes this worse in three specific ways:

1. **The same human exists three times.** A person can be a `contact`, a `client`, a `lead`, a `business_party`, and an `organization_people` row depending on which module they entered through. Nothing reconciles them. Accounting's customer and CRM's client are different records that happen to share a name, so no screen can honestly claim to show "everything about this customer".

2. **Every module invented its own screens.** Lists, tables, forms and filters were written by hand per module, so spacing, density, empty states and responsive behaviour differ everywhere. Under 30% of component files use responsive breakpoints at all, so the product is effectively desktop-only in places nobody has audited.

3. **The AI assists rather than acts.** There are copilot tools and draft generation, but a human still has to invoke them and still has to type the result into a form. The work was never removed — it was made slightly faster.

The result: the people who own the pipeline don't trust it, and the people who maintain it resent it.

## Solution

The CRM maintains itself.

Communications flow in — email, calendar, calls, messages. The system reads them, decides what they mean, and writes the consequences directly to the record: it creates the party if they're new, opens or advances the deal, logs the activity with its extracted next step, and schedules the follow-up. Nobody is asked to confirm. The rep's inbox and phone are the interface; the CRM is the consequence.

Where an action leaves the building — a message to a customer — it goes into a hold window first. The system still decides and still acts alone, but there is a short, visible interval in which a human can stop it. Everything else is instantly reversible and everything, without exception, is recorded: what was decided, from which inputs, by which model and prompt version, and whether it can be undone.

Underneath, one record of a person or organisation replaces the current three. A **Party** carries roles rather than living in role-specific tables, so the same customer is one row whether CRM, accounting or support is asking. Alongside it, a **Subject** slot holds the thing being transacted — the property, the candidate, the shipment, the policy — which is what lets one fixed schema serve any industry instead of forcing every business to bend Contacts into a shape they aren't.

And every list, record and form in the CRM is rendered by one engine from a stored layout description, not hand-written per screen. Fixing density, empty states or mobile behaviour becomes one change instead of two hundred, and the layout becomes something the system can adapt per tenant rather than something frozen at compile time.

## Goals

- One end-to-end autonomous path running in production against real auth, real tenancy and a real domain.
- One identity for a person or organisation across CRM, replacing the three that exist today, without breaking the modules that read the old ones.
- One rendering engine behind every CRM record surface, responsive by construction.
- Every autonomous action recorded, scored and reversible or held.
- The architectural questions answered by working code before anything is replicated across fifty screens.

## Non-Goals

- Feature parity with the existing CRM surface. Phase 1 covers one vertical slice, not fifty routes.
- Migrating downstream consumers. `billing`, `finance`, `deals` and `leads` continue reading the existing tables untouched.
- Any customer-facing autonomous messaging beyond the single quote path, and no cold outbound at all.
- Standing up second and third regions. Phase 1 builds the seam; Phase 3 uses it.
- Taking money. No payment provider, no plan gating, no marketing site.

## Why a walking skeleton

The programme this spec belongs to is large: all four autonomy loops, all three feature tiers, three regions, a full commercial launch. Scope was deliberately left unbounded by the product owner (`D25`), which means **sequence is the only remaining control** (`D26`).

A walking skeleton answers every hard architectural question — does the Party model hold, does the renderer produce a screen anyone wants to use, does autonomous action survive contact with real data, is the audit trail actually reviewable — while each answer still costs weeks rather than a year. Everything after Phase 1 is additive and independently shippable, so work can stop at any phase boundary and still leave something real.

## Seams

Three seams total. Two already exist and are preferred; one is new and sits at the highest point available.

**Existing — controller end-to-end.** The `createE2eApp` harness boots the real application with the real global guard stack, signed tokens and membership fixtures. Because validation, authentication, MFA and module gating are registered globally, a request through this seam exercises tenancy, row-level security and permission resolution without any of it being restated in the test. This is the highest seam in the backend and the default for everything in this spec.

**Existing — AI evaluation.** The `runEval` harness with `EVAL_ACCEPTANCE` gates and the existing scorer set (grounding, schema, safety, refusal, citation) is the seam for every model-mediated decision. Extraction quality, stage inference and draft quality are measured here, not in unit tests, and the gate runs in CI so a prompt or model change that regresses accuracy fails the build.

**New — inbound comms ingress.** One entry point that accepts a normalised inbound communication event, whatever its origin. Every provider adapter — email, calendar, telephony, messaging — normalises to this shape and hands off; nothing downstream knows which provider produced the event. This is the single new seam, and it is proposed at the highest possible point deliberately: it lets the entire autonomous pipeline be driven end to end in tests with a fixture event, so no test ever mocks a provider SDK, and adding a channel in Phase 2 requires no change below the seam.

## User Stories

**Sales representative — the record maintains itself**

1. As a sales rep, I want emails I send and receive to appear on the right party and deal automatically, so that I never copy correspondence into the CRM.
2. As a sales rep, I want a new party created automatically when someone unknown emails me, so that I never fill in a "new contact" form.
3. As a sales rep, I want calendar meetings logged against the deal with their attendees resolved to parties, so that the timeline is complete without me touching it.
4. As a sales rep, I want a call I make to be transcribed and summarised onto the deal, so that I do not write call notes.
5. As a sales rep, I want the next step extracted from what was actually said and turned into a dated task, so that I do not maintain a separate to-do list.
6. As a sales rep, I want the deal stage advanced when the conversation clearly shows it moved, so that I am not nagged to update a dropdown.
7. As a sales rep, I want to correct any decision the system made, so that I stay in control of my own pipeline.
8. As a sales rep, I want my correction to change future behaviour, so that I am not fixing the same mistake every week.
9. As a sales rep, I want to see plainly which fields were set by the system and which by a human, so that I know what to trust.
10. As a sales rep, I want a single timeline per party spanning email, calls, meetings and quotes, so that I can prepare for a conversation in one screen.
11. As a sales rep, I want to work the whole flow on my phone, so that I can act between meetings.
12. As a sales rep, I want a quote generated from the deal and sent, so that I do not rebuild pricing in a separate tool.
13. As a sales rep, I want a short window to stop a message the system decided to send, so that an unexpected decision never reaches my customer.
14. As a sales rep, I want to know when the system chose *not* to act, so that silence is informative rather than ambiguous.

**Sales manager — trust and oversight**

15. As a sales manager, I want the pipeline to reflect reality without chasing reps for updates, so that I stop spending my week on data collection.
16. As a sales manager, I want to see how often the system's decisions were corrected, so that I can judge how much to trust it.
17. As a sales manager, I want to review everything the system did across my team in one feed, so that oversight is a single habit rather than fifty screens.
18. As a sales manager, I want to reverse anything reversible from that feed, so that correction costs one click.
19. As a sales manager, I want to switch a dense view on for pipeline review, so that I can see forty rows instead of twelve.
20. As a sales manager, I want deals flagged when they have gone quiet, so that neglect surfaces before the quarter ends.

**Data steward — the queue that fixes rot**

21. As a data steward, I want duplicate parties detected and merged automatically, so that the same customer stops existing several times.
22. As a data steward, I want to review merges the system was not confident about, so that ambiguous cases get a human.
23. As a data steward, I want a merge to be reversible, so that a wrong merge is an inconvenience rather than an incident.
24. As a data steward, I want contradictory information across sources surfaced, so that I know which record to believe.
25. As a data steward, I want stale and orphaned records surfaced continuously, so that rot is visible rather than discovered.
26. As a data steward, I want to see the health of my whole dataset as a number that moves, so that the work has a scoreboard.

**Organisation administrator — configuration and control**

27. As an org admin, I want to define what a party, deal or subject means in my business, so that the CRM uses my vocabulary rather than generic labels.
28. As an org admin, I want to add fields specific to my industry without an engineer, so that I am not blocked on a release.
29. As an org admin, I want the system to propose a layout based on how we actually work, so that I do not start from a blank configuration screen.
30. As an org admin, I want to override anything the system proposed, so that automatic adaptation never traps me.
31. As an org admin, I want to control which autonomous actions are enabled for my organisation, so that I can adopt gradually.
32. As an org admin, I want to see my organisation's accuracy record per action type, so that enabling something is an evidence-based decision.
33. As an org admin, I want the hold window length to be mine to set, so that it matches how fast my team actually reads notifications.
34. As an org admin, I want existing role standings to govern the new CRM exactly as they govern every other module, so that access is not a second thing to administer.
35. As an org admin, I want per-person permission grants to work here too, so that narrowing one person's capability does not require a new role.

**Prospect and new customer — getting in**

36. As a prospective customer, I want to bring my existing CRM export in and see my own data, so that I can evaluate against reality rather than a demo dataset.
37. As a prospective customer, I want the system to work out what my columns mean, so that I never fill in a field-mapping grid.
38. As a prospective customer, I want to see exactly what will be created before it is, so that I can trust the import.
39. As a prospective customer, I want to undo an import completely, so that a bad first attempt costs nothing.
40. As a customer, I want to export everything I have put in, in an open format, at any time, so that I am never locked in.

**Platform operator — running it**

41. As the operator, I want every autonomous action recorded with its inputs, model and prompt version, so that I can explain any decision after the fact.
42. As the operator, I want a failed step to retry from where it failed rather than the beginning, so that a transient provider error does not duplicate work or drop it.
43. As the operator, I want to replay any past execution, so that debugging an autonomous system is possible at all.
44. As the operator, I want accuracy regressions to fail CI, so that a prompt change cannot quietly degrade production.
45. As the operator, I want a kill switch per action type, so that I can stop a misbehaving behaviour without taking the product down.
46. As the operator, I want inference spend visible per organisation, so that an unprofitable tenant is visible before the invoice.
47. As the operator, I want a tenant's data pinned to a region, so that residency is a property of the data rather than a promise.

**Compliance**

48. As a compliance owner, I want personal data redacted before it reaches a model provider wherever the task allows, so that exposure is minimised by default.
49. As a compliance owner, I want an erasure request to reach every store including evaluation datasets, so that erasure is complete rather than nominal.
50. As a compliance owner, I want automated decisions to be explainable from recorded facts, so that I can answer a subject access request.

## Implementation Decisions

### Identity: one Party, extending the existing person model

`D06`. The CRM gains a **Party**: a single record for a person or an organisation, carrying **roles** (lead, contact, customer, vendor, candidate) rather than living in a role-specific table. A party holds one role, several, or none, and gaining a role is a state change rather than a new record.

This must **extend the existing person model rather than become a fourth identity**. The platform already treats `organization_people` as the person and everything else as a facet of one, resolved through a single seam that re-asserts organisation scope on every query and returns an unresolved *value* rather than throwing. Party adopts that discipline exactly: a party resolves through one seam, resolution short-circuits and reports which path answered, and callers never query a facet directly to infer another. A cross-tenant subject resolves unresolved and surfaces as 404, never 403.

Existing `contacts`, `clients`, `leads` and `business_parties` tables are **not touched in Phase 1** and their consumers continue to read them. Reconciliation is Phase 2 (`D08`).

### The Subject slot

`D06`. **Subject** is the polymorphic-by-configuration slot for the thing being transacted — property, candidate, load, policy, unit, course. It is a first-class entity with a tenant-defined type, its own custom fields, and typed links to parties and pipelines.

This is the load-bearing piece of the horizontal bet (`D01`). Without it, "works for any industry" reduces to relabelling, and a recruiter's candidate has to masquerade as a contact. With it, one fixed schema genuinely models businesses that transact different things.

Subject relationships use an **exclusive arc or a link table per relationship**, never a dual-purpose `entity_type` + `entity_id` pair — that pattern is banned for new tables because it carries no referential integrity and defeats the composite tenant key.

### The rest of the core

`D06`. **Pipeline** carries the money motion with tenant-configurable stages. **Activity** is one timeline covering calls, emails, meetings, notes and tasks. **Document** covers attachments and generated artefacts including quotes. Every entity carries JSONB custom fields for tenant-specific data; anything with a lifecycle — approvals, comments, notifications, audit entries — gets its own normalised table, never a JSONB array.

Schema rules follow the platform standard without exception: UUID primary keys, non-nullable indexed `org_id` on every tenant table, money as integer cents, tenant-scoped uniqueness as a composite index rather than a bare global unique, composite indexes leading with `org_id`, soft delete as the default with every read filtering it and partial indexes excluding deleted rows.

### Tenancy and region

`D09`. New CRM tables are added to the **approved row-level-security matrix** and enabled only once every service path uses the tenant transaction wrapper and the missing-GUC and cross-tenant tests pass. RLS is not blanket-enabled and not forced — the platform's selective approach stands. Where RLS is on, absence of the tenant GUC fails closed.

Two consequences must be respected throughout: a covering index on an RLS table has to include `org_id` itself or the planner refuses an index-only scan; and any side effect fired after a request must not borrow the request's transaction — deferred work either registers an after-commit hook or opens its own tenant transaction.

`D13`. **Region is a tenant attribute from the first migration.** All storage access goes through a region-aware resolution layer and no code assumes a single database endpoint. Only one region is deployed in Phase 1; the seam exists so Phase 3 is configuration rather than a refactor.

### Inbound ingress and the autonomous pipeline

The new seam. Provider adapters normalise to a single inbound communication event: origin channel, participants, content, timestamps, thread identity, tenant, and provider-native identifiers for idempotency. Everything downstream is provider-agnostic.

The pipeline that consumes it is a **durable workflow** (`D11`): resolve tenant and region → resolve or create parties → attach to thread and deal → classify → extract → decide → act → record → score. Each step is checkpointed so a failure retries from the last good step, long waits are first-class rather than cron intervals, and history is replayable — which is what makes after-the-fact review of an autonomous system possible at all.

Work is enqueued through the **existing transactional outbox** so nothing is scheduled for a transaction that did not commit, with a relay draining to the workflow engine. Inbound events carry an idempotency key derived from provider identifiers, reusing the platform's existing idempotency store: replay returns the first result, in-flight returns 409.

### Model routing and cost

`D17`. Three tiers, escalating only when the work demands it. **Deterministic** handles thread matching, domain-to-party resolution, calendar parsing, bounce detection and anything else with a correct answer — the majority of the pipeline, cheaper and more accurate than a model. **Small model** handles bulk classification and extraction. **Frontier model** handles drafting and genuine reasoning only.

Every call goes through the **existing AI gateway**, which reserves credits atomically before the provider call and refunds only on provider failure — never check-then-spend. Context assembly obeys the platform's efficiency rules: fewest queries, explicit projection, hard caps on rows and text, short-circuit before any provider call when there is no eligible context, and never re-embed unchanged content. Transcripts are summarised once and reused rather than re-read per query.

**AI is barred from the authorisation path.** No model output may influence a permission decision, and permission data does not egress to a provider.

### Autonomy and the hold window

`D15`, `D16`. Actions execute without approval. They are classified by consequence:

- **Internal** — create or update a party, log an activity, advance a stage, create a task, merge a duplicate: executes immediately, always reversible.
- **Reversible external** — schedule or move a meeting: executes immediately, participants notified.
- **Irreversible external** — a message or quote to a customer: executes autonomously but enters a **hold window**, default 60 seconds and tenant-configurable, during which any authorised human can cancel. The hold is implemented on the durable workflow's wait primitive, not a polling job.

Every action, in all three classes, writes an audit record carrying the triggering event, the inputs considered, the model and prompt version, the decision, the confidence, the reversibility class and the reversal handle. Reversal is a first-class operation, not a manual database edit.

A per-action-type kill switch exists at both platform and organisation level.

### Accuracy measurement

`D18`. Three layers, all built in Phase 1 because with no approval gate, measurement *is* the safety mechanism.

**Golden evals** run in CI against a versioned dataset per autonomous action type, gated by the existing acceptance thresholds; a regression fails the build. **Shadow scoring** samples live decisions with a second cheap pass and routes low-confidence outcomes to a review queue even though approval is not required. **Per-tenant scoreboard** exposes real counts per action type — actions taken, corrections made, correction rate over time.

Every human correction is captured in a form that can be promoted into the eval dataset, so accuracy compounds rather than plateauing. Promotion is deliberate, not automatic, and consented or synthetic data only — eval datasets are within scope of erasure (`D24`).

### Rendering

`D10`, `D28`. Every CRM list, table, record view, form and filter is produced by **one engine** from a stored layout description. Hand-written CRM screens are limited to a small set of deliberately crafted surfaces — the timeline and the action review feed — where bespoke design earns its keep.

The layout description is data, which is what makes `D07` possible: the system can propose and revise a tenant's layout, and an administrator can override it. Overrides win and are versioned.

Density is a first-class property of the engine: comfortable by default, compact available per view. Responsive behaviour is defined once in the engine — tables become cards below the breakpoint, navigation collapses, touch targets meet minimums — rather than per screen.

**Design tokens are extracted and applied platform-wide immediately**, ahead of any renderer work. Colour, type scale, spacing, radius, shadow and density become one system every existing module inherits, so the platform reads as one product long before the renderer reaches module sixty.

### Access control

New CRM permission keys follow the established `module:resource:action` convention with the module segment first, are registered in both the backend catalogue and the frontend union, and are added to role templates **with a backfill migration** — a template change alone reaches new organisations only. Endpoints carry the permission guard explicitly, list endpoints apply the resolved data scope, and every permission mutation bumps the access version inside the same transaction.

The six standings are unchanged. No new role type, no custom roles.

### API conventions

Cursor pagination on all list endpoints with the standard hard page cap. Descriptive route parameters that name what they identify, never a bare identifier. Idempotency keys accepted on all mutating endpoints. Explicit column projection with minimal DTOs, never raw ORM rows, and never an unprojected relation to global users. Zod validation at the boundary, strict on unknown keys.

## Testing Decisions

### What makes a good test here

A good test drives the system the way something outside it does and asserts on what that outsider can observe. For this feature that means: post an inbound event, then assert on the records, the audit trail and the queued outbound — never on which service was called, which prompt was assembled, or how many times a model ran.

Three rules follow. **Never assert on a mock's call count** as a proxy for behaviour. **Never assert on model output text**; assert on the structured decision the model produced and let the eval seam judge quality. **Never write a test that passes with row-level security disabled** — every data test runs as the application role with the tenant GUC set, because the owner role bypasses RLS and its results hide every isolation bug.

A transaction mock that does not invoke its callback silently voids every assertion inside it; where a transaction is mocked at all, that behaviour is asserted first.

### Seam one — controller end-to-end (existing, primary)

Prior art: 120 existing `*.e2e-spec.ts` suites, notably the contacts, deals, quotes and party controller suites, all built on the `createE2eApp` harness with its token-signing, membership-state and MFA-policy helpers.

Covered here:

- The whole inbound path, driven by a fixture event through the ingress seam: party created, thread attached, activity logged, next step extracted, stage advanced, audit written.
- Party resolution and merge, including the reversal of a merge.
- Subject creation, linking, and retrieval through a tenant-defined type.
- Custom field write and read round-trip.
- Every new endpoint tested for allow and deny against each standing, and for data scope narrowing.
- **Cross-tenant isolation with two real accounts** on every endpoint accepting an identifier, asserting 404 rather than 403 for another organisation's record.
- **Missing tenant GUC fails closed**, asserting the insufficient-privilege failure rather than a silent empty result.
- Idempotency: the same inbound event delivered twice produces one set of consequences; replay returns the first result; concurrent delivery returns 409.
- Hold window: an irreversible action is queued not sent; cancellation within the window prevents send; expiry sends exactly once.
- Import: preview matches what is committed, and rollback restores the prior state exactly.
- Export: every entity round-trips without loss.

### Seam two — AI evaluation (existing)

Prior art: the five existing eval suites, particularly the CRM drafts and extraction suites, on the `runEval` harness with `meetsGate` and the shared acceptance thresholds. The existing schema, grounding, safety and refusal scorers are reused; a new scorer is added only if extraction correctness cannot be expressed by the schema scorer.

Covered: entity and next-step extraction accuracy; stage inference accuracy; duplicate-match precision and recall, weighted so that a false merge costs far more than a missed one; draft quality and groundedness; refusal behaviour on ambiguous or adversarial input. All gated in CI.

### Seam three — inbound ingress (new)

The seam exists so that no test mocks a provider SDK. Provider adapters get thin unit tests asserting only that a real provider payload normalises to the correct event shape; everything downstream is tested through it.

### Frontend

Prior art: the 72 existing frontend test files. The renderer is tested as a unit against layout descriptions — given a description, the correct structure renders, the correct fields are editable, density switches, and the layout reflows below the breakpoint. Individual generated screens are not tested; that is the point of having one engine.

### What is deliberately not tested

Model output wording. Provider SDK internals. Generated screens individually. Anything requiring a live provider credential in CI.

### Verification beyond the suite

Typecheck and mocked tests are not proof this works. Because this feature touches row-level security, post-commit side effects and background execution, the exit criterion is the real application booted and a real inbound event driven end to end — a swallowed insufficient-privilege error passes every static check.

## Out of Scope

**Deferred to Phase 2** — remaining CRM record types and surfaces on the renderer; the remaining core integrations (telephony, WhatsApp, web forms) beyond the first channel; the AI universal importer's direct connectors to Zoho, HubSpot, Salesforce and Pipedrive; the data-quality queue at full breadth; the internal issue tracker and complaints handling (`D27`); reconciling the legacy identity tables and migrating `billing`, `finance`, `deals` and `leads` (`D08`).

**Deferred to Phase 3** — multi-currency; payment providers and per-seat plan gating (`D20`); marketing site and self-serve signup (`D19`); GDPR operational work including subprocessor register and erasure tooling (`D24`); standing up the second and third regions on the Phase 1 seam.

**Deferred to Phase 4+** — the inbound, forecasting and outbound loops at full strength (`D14`); cold outbound entirely, which cannot launch before domain warming and platform approvals complete regardless of build progress; the best-in-class tier including conversation intelligence, commissions, renewals, marketing automation and the report builder (`D25`); renderer migration for the remaining modules, settings first (`D28`); the MCP server.

**Not in this programme** — native mobile applications; a visual layout builder exposed to tenant administrators; user-defined objects beyond the Subject slot; custom roles.

## Further Notes

**This spec assumes Phase 0 has run.** A ranked quality audit of the existing codebase has not been performed. Size was measured — roughly 977,000 lines, 727 tables, 206 migrations, 66 backend modules — and one genuine architectural defect was confirmed: three competing identity models. Whether the rest is sound is unverified, and the claim that "the architecture is bad" remains partly untested. Phase 0 also extracts the design tokens and adds the missing observability layer, both of which this phase depends on.

**Three infrastructure gaps block this phase.** There is no durable job queue, only cron polling — which cannot carry event-driven autonomous work, because polling adds latency to every action and a crash mid-batch leaves no record of what completed. There is no observability: no error tracking, no tracing, no structured logging, which means after-the-fact review of an autonomous system would have nothing to review. There is no payment provider, which blocks Phase 3 rather than this one.

**Four external clocks run independently of build progress** and should be started immediately: OAuth verification for restricted mail scopes, which requires a third-party security assessment and gates the most important channel; platform approval for business messaging; email domain warming, which takes weeks of gradual volume and cannot be accelerated; and payment provider business verification.

**Ten accepted risks** are recorded in the decision record accompanying this spec. The three most likely to affect this phase: fully autonomous customer-facing action with no approval gate, mitigated by the hold window and measurement but not removed; three regions committed with a single operator, where the region seam in this phase is the main defence; and the scope of the wider programme, which the walking-skeleton sequence exists specifically to make survivable.

**On the horizontal bet.** One schema serving every industry rests entirely on the Subject slot being sufficient. If a real vertical proves it is not, the fallback is user-defined objects — which is the metadata platform explicitly not being built. Phase 1 should be treated as the test of that assumption, and Subject should be exercised against at least two genuinely different industry shapes before Phase 2 replicates the model across fifty surfaces.
