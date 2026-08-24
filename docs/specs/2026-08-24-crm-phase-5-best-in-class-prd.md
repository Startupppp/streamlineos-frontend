# PRD — Phase 5: the best-in-class tier

**Status:** ready-for-agent
**Date:** 2026-08-24
**Phase:** 5 of 5
**Blocked by:** Phase 4 (the four loops at full strength) complete and deployed
**Origin:** grilling session, 2026-08-23 — decisions `D01`–`D28`; this phase carries the whole of `D25`'s third tier and the MCP server

---

## Problem Statement

After four phases the product does something no incumbent does: it runs the pipeline without being told to. It is also missing a list of things every incumbent has, and in an evaluation those absences are what get counted.

The failure mode is specific and worth naming precisely, because it is the one that kills differentiated products. A buyer runs a feature comparison. StreamlineOS wins on the row that says *autonomous pipeline maintenance*, which no competitor has and which the buyer has no frame for. It loses on six rows the buyer does understand — commission calculation, renewal management, call recording analysis, campaign automation, custom reporting, and an open integration surface — and those six rows are the ones procurement scores.

Five gaps:

1. **Conversations are processed, not understood.** Phase 2 put call transcripts on the timeline and Phase 4 extracts from them. Nothing tells a manager which of their reps talks past objections, which competitor keeps coming up in lost deals, or what the best call in the team sounded like.

2. **Commissions are a spreadsheet somebody maintains.** The system holds every deal, every stage transition, every close date and every rep — every input a commission calculation needs — and produces none of it. So the numbers that decide people's pay live outside the system of record, are reconciled by hand, and are disputed monthly.

3. **Renewals are invisible until they are late.** A closed-won deal ends. There is no renewal date, no health signal, no expansion trigger, no churn warning. For any business with recurring revenue this is not a missing feature; it is a missing half of the revenue model.

4. **Marketing automation does not exist.** Phase 4's outbound is one-to-one and reactive to a relationship's state. Nurture sequences, segmentation, campaign attribution and lifecycle messaging are a different shape of problem and none of it is built.

5. **Reporting is whatever we shipped.** Fixed dashboards answer the questions we anticipated. Every business has questions we did not, and "raise a ticket for a report" is the answer that made people hate the last CRM.

And one structural gap: **the product cannot be programmed against**. Phase 2 imports from competitors and Composio connects outward, but there is no surface through which a customer's own tooling — or an agent — can read and act on their CRM.

## Solution

Close the feature comparison, then open the platform.

**Conversation intelligence.** Transcripts already arrive. This phase analyses them: talk ratio, objection handling, competitor mentions, question rate, next-step commitment, and per-rep trends over time — with the coaching surfaced to managers rather than the raw analytics dumped on them.

**Commissions.** Plans expressed as rules over data the system already holds, calculated continuously rather than monthly, with every figure traceable to the deals that produced it and a dispute path that shows the working.

**Renewals and expansion.** A closed-won deal produces a customer lifecycle record with a renewal date, a health score, usage and engagement signals, and triggers that open the renewal or expansion opportunity early enough to act on.

**Marketing automation.** Segments defined over Party, Subject and Activity; sequences built from the same held outbound machinery Phase 4 hardened; attribution that survives the multi-touch reality rather than crediting last click.

**A report builder.** A tenant defines their own question over their own data, safely — inside their tenancy, inside their scope, inside a cost bound.

**An MCP server.** The customer's tooling and their agents reach the CRM through a first-class, permission-respecting interface, so the product becomes something built on rather than only used.

## Goals

- Every row on a standard CRM feature comparison is answerable, so the evaluation turns on the differentiator rather than on absences.
- A commission figure can be traced to the deals that produced it without leaving the product.
- Recurring revenue is modelled: renewal dates exist, health is scored, and churn risk surfaces early enough to act.
- A tenant can answer a question we did not anticipate without our involvement.
- An external agent can read and act on a tenant's CRM under exactly the permissions a person would have.

## Non-Goals

- Native mobile applications.
- A visual layout builder for tenant administrators beyond the field-level adjustment Phase 2 shipped.
- User-defined objects beyond the Subject slot. The Subject slot is the answer to industry variation (`D03`) and remains so.
- Custom roles. Six standings, decided, and not reopened here.
- Becoming a marketing suite. Automation here serves the CRM's own revenue loops; it does not chase a separate category.
- Any relaxation of the autonomy safety model. New capability, same constraints.

## Seams

**No new seams for the features.** Conversation intelligence consumes activities. Commissions consume the stage-transition ledger. Renewals consume deals and activities. Marketing automation consumes Phase 4's outbound path with its guardrails intact — a sequence is many held sends, not a bypass.

**New — the query surface.** The report builder needs a way to express a tenant's question and execute it safely, and no existing seam does that. This is the phase's one genuinely new seam and it is the most dangerous thing in the programme, because it is user-supplied logic running against a multi-tenant database.

**New — the MCP server.** A protocol surface over existing services. It introduces no new business logic and calls the same services a controller calls, with the same permission resolution. Where a capability does not exist as a service, it is built as a service and the MCP server calls it — the protocol layer never reaches past the service boundary into a repository or a schema.

**Existing — AI evaluation.** New datasets for conversation analysis and for report-builder query generation, each with `EVAL_ACCEPTANCE` gates in CI.

## User Stories

**Sales manager — conversation intelligence**

1. As a sales manager, I want to see the talk ratio on my reps' calls, so that coaching is based on what happened rather than what was reported.
2. As a sales manager, I want to know which objections come up most and how each rep handles them, so that I coach the pattern rather than the anecdote.
3. As a sales manager, I want competitor mentions extracted across all calls, so that I learn who we are actually losing to.
4. As a sales manager, I want to find the calls that preceded our best closes, so that "what good sounds like" is an example rather than an opinion.
5. As a sales manager, I want a rep's trend over a quarter, so that I can tell improvement from a good week.
6. As a sales rep, I want my own call analysis before my manager sees it, so that the tool feels like coaching rather than surveillance.

**Finance — commissions**

7. As a finance lead, I want commission plans expressed as rules over our data, so that the calculation lives where the data lives.
8. As a finance lead, I want tiers, accelerators, caps, splits and clawbacks supported, so that our real plan is expressible rather than approximated.
9. As a finance lead, I want commissions calculated continuously, so that month-end is a review rather than a reconstruction.
10. As a sales rep, I want to see my commission accrue in real time against my quota, so that I know where I stand.
11. As a sales rep, I want every figure to break down to the deals that produced it, so that a dispute is a conversation about facts.
12. As a finance lead, I want a plan change to be dated and never retroactive by accident, so that historical payouts stay reproducible.
13. As a finance lead, I want a clawback on a deal that reverses to be automatic and recorded, so that corrections are not a manual chase.

**Account manager — renewals and expansion**

14. As an account manager, I want every closed-won deal to produce a renewal with a date, so that recurring revenue is a record rather than a memory.
15. As an account manager, I want a health score from real signals — usage, engagement, support history, sentiment — so that risk is visible before it is terminal.
16. As an account manager, I want the renewal opportunity opened early enough to work, so that renewal is a process rather than a scramble.
17. As an account manager, I want expansion signals surfaced, so that growth in an existing account is not left to chance.
18. As an account manager, I want churn risk to trigger the same autonomous loops a new deal does, so that retention gets the same machine attention acquisition does.
19. As a finance lead, I want recurring revenue reported as a movement — new, expansion, contraction, churn — so that the number is explicable.

**Marketing lead — automation**

20. As a marketing lead, I want to define a segment over any CRM data, so that targeting is not limited to the fields someone anticipated.
21. As a marketing lead, I want a nurture sequence that respects consent, frequency caps and working hours exactly as one-to-one outbound does, so that scale does not weaken the guardrails.
22. As a marketing lead, I want a contact who replies to exit the sequence immediately, so that automation never talks over a human conversation.
23. As a marketing lead, I want multi-touch attribution, so that credit reflects the journey rather than the last click.
24. As a marketing lead, I want campaign performance tied to closed revenue, so that spend is judged on outcomes.
25. As a marketing lead, I want a sequence to be pausable globally and per segment without a deploy, so that a mistake is stoppable.

**Analyst — the report builder**

26. As an analyst, I want to build a report over our own data without engineering involvement, so that a new question is not a ticket.
27. As an analyst, I want to join across parties, deals, activities and subjects, so that the interesting questions are expressible.
28. As an analyst, I want my report to respect my own permissions and scope, so that sharing it cannot leak what I could not see.
29. As an analyst, I want a report I write to be schedulable and deliverable, so that a recurring question answers itself.
30. As an administrator, I want an expensive report to be bounded rather than able to degrade the platform, so that one analyst cannot slow everyone.

**Developer — the MCP server**

31. As a developer, I want to read and write our CRM from our own tooling, so that StreamlineOS fits our stack rather than replacing it.
32. As a developer, I want the interface to enforce exactly the permissions a person would have, so that integration is not a privilege-escalation path.
33. As a developer, I want an agent I build to act on our CRM under a scoped, revocable credential, so that automation is governable.
34. As a developer, I want every action taken through the interface recorded like any other, so that programmatic changes are as auditable as human ones.
35. As a security lead, I want the interface to be off by default and enabled deliberately, so that surface area is a choice.

## Implementation Decisions

### Conversation intelligence

Transcripts arrive through Phase 2's telephony adapter and are already stored as activity bodies. Analysis is a scheduled workflow over completed calls, producing a structured analysis record per call — talk ratio, question rate, objection instances with handling classification, competitor mentions, next-step commitment — plus per-rep aggregates over time.

Three constraints, each of which changes the design:

- **Analysis is per call and cached.** Re-analysing on every view would be the single largest model cost in the product. The source text is hashed, so an unchanged transcript is never re-analysed.
- **The rep sees their own analysis first.** A coaching tool that arrives as a surveillance report is a tool people route around, and a CRM people route around is the problem this programme exists to fix.
- **Recording and analysis are consent-gated per jurisdiction**, reusing the existing consent model rather than a second one. Two-party-consent jurisdictions are a legal constraint, not a setting.

### Commissions

Plans are rules over data the system already holds: the stage-transition ledger gives the close, the deal gives the value and owner, splits are a relationship on the deal. Nothing new needs capturing, which is what makes this tractable.

- **Calculated continuously, stored as a running accrual**, so month-end is a review of a number people have been watching rather than the first time anyone sees it.
- **Every figure decomposes to its contributing deals.** A commission number nobody can interrogate is a number that gets disputed and then rebuilt in a spreadsheet, which returns the problem to where it started.
- **Plans are dated and versioned.** A payout must reproduce from the plan in force when it was earned, not the current one. Retroactive change is possible but explicit and recorded.
- **Money is integer minor units throughout**, per the platform rule. A commission is a percentage of a percentage and it is exactly where rounding drift becomes visible; rounding happens once, at payout, with the rule stated.
- **Reversal is automatic.** A deal that reverses claws back through the same ledger, recorded.

### Renewals and expansion

A closed-won deal produces a **customer lifecycle record**: renewal date, term, value, health score and signal history. This is a new record type on the renderer, not a bespoke module.

Health is composite and explicable — usage where the tenant supplies it, engagement from Phase 2's timeline, support history, and sentiment from conversation intelligence — and every score decomposes into its inputs, for the same reason commissions do.

Renewal and churn-risk triggers feed Phase 4's existing loops rather than new ones. A renewal is an opportunity; the outbound loop already knows how to work an opportunity under a hold window. Building a parallel retention machine would give the product two autonomy models to reason about.

### Marketing automation

Segments are expressed through the same query surface the report builder uses — one way to express "which records", not two.

Sequences are built on Phase 4's outbound path with every guardrail intact: consent checked at send time, frequency caps shared across all loops so a sequence and a follow-up cannot both fire, working hours honoured, hold window applied. **A sequence is many held sends, not a bypass**, and that is the load-bearing decision in this section.

Reply detection exits the sequence immediately. Automation that talks over a human reply is the single most damaging behaviour in this category.

Attribution is multi-touch over the activity timeline, which already holds every touch across every channel — the data that makes attribution honest is a Phase 2 byproduct.

### The report builder, and the query surface

This is the most dangerous thing in the programme: user-supplied logic executing against a multi-tenant database. The design is defensive by construction.

- **Not raw SQL.** A structured query description — entities, joins from a declared graph, filters, aggregations, ordering — compiled by us into parameterised SQL. A tenant never supplies SQL text, so SQL injection is not mitigated, it is unrepresentable.
- **Tenancy and scope are applied by the compiler, not by the query.** Every generated query carries the org predicate and the requester's DataScope. A report cannot opt out because the opt-out is not expressible.
- **Sharing re-evaluates against the viewer.** A report shared with someone of narrower scope returns their rows, not the author's. This is the leak everyone builds first and discovers second.
- **Bounded by construction** — statement timeout, row cap, result cap, join-depth cap, and a per-tenant concurrent-report limit. An expensive report fails politely rather than degrading the platform.
- **Natural language is a front end to the builder, never to the database.** A model may propose a query description, which is then shown to the user and compiled through the same path. The model never emits SQL and never touches the database.

### The MCP server

A protocol surface over existing services, off by default, enabled deliberately per tenant.

- **The same permission resolution as any request.** A capability resolves through `AccessService` exactly as a controller does. There is no service-account bypass and no ambient authority.
- **Scoped, revocable credentials**, reusing the existing API token model rather than a parallel one.
- **Every action recorded** in the same audit trail as a human action, attributed to the token and its owner.
- **Never past the service boundary.** Where a capability does not exist as a service, the service is built and the protocol layer calls it. A protocol layer that reaches into repositories becomes a second, unguarded API.
- **AI is barred from the authorization decision path**, per the platform rule. An agent may act within permissions it holds; it may never influence what those permissions are.

## Testing Decisions

### What makes a good test here

The same rule throughout, with one addition specific to this phase: **for anything that produces a number people are paid on or decisions are made from, the test asserts reproducibility, not just correctness**. A commission that is right today and different tomorrow from the same inputs is wrong.

### Seam — controller end-to-end

Every new surface, with cross-tenant isolation and permission allow/deny. The report builder gets the heaviest treatment in the programme:

- A report authored by a broad-scope user and viewed by a narrow-scope user returns the narrow rows.
- A query description crafted to escape its tenancy fails to compile.
- Every bound — timeout, row cap, join depth, concurrency — is asserted by exceeding it.

### Seam — MCP

Driven from fixtures at the protocol level. A token with narrow permissions cannot reach a capability outside them; a revoked token fails immediately; every action appears in the audit trail attributed to the token.

### Seam — AI evaluation

- **Conversation analysis** — accuracy on objection and competitor extraction, with a zero-tolerance gate on attributing speech to the wrong speaker, since that is what makes coaching data libellous rather than useful.
- **Query generation** — the gate is not query quality but safety: a natural-language request that would produce a cross-tenant or out-of-scope query must fail to compile, every time, including under adversarial phrasing.

### Determinism

Commission calculation, health scoring and attribution are unit-tested against worked examples with known answers, including the edge cases that generate disputes: a deal closing on a plan-change boundary, a split across a leaver, a clawback after payout, a renewal that partially contracts.

### What is deliberately not tested

Provider behaviour; the aesthetic quality of generated reports; the analytical validity of a tenant's own report definitions.

## Out of Scope

**Not in this programme** — native mobile applications; a visual layout builder beyond field-level adjustment; user-defined objects beyond the Subject slot; custom roles.

**Beyond this programme** — anything further is a new programme with its own grilling session. This PRD closes the arc that began on 2026-08-23.

## Further Notes

**This phase is the least architecturally interesting and the most commercially decisive**, and it is worth saying so plainly. Nothing here changes how the system works. All of it changes whether a buyer can choose it. Sequencing it last is correct — these features are worth little on a product nobody trusts, and worth a great deal on one that already runs the pipeline by itself — but "last" must not become "never", because the feature-comparison table does not care how good the autonomy is.

**The report builder is where a data breach would come from.** Every other surface in the product has a fixed query shape written by us. This one lets a tenant describe a question and have us execute it. The compiler design — structured description in, parameterised SQL out, tenancy applied by the compiler, sharing re-evaluated against the viewer — is what makes that safe, and none of those four properties is optional or negotiable for delivery speed.

**The MCP server is a smaller build than it looks and a larger risk than it looks.** The build is small because it exposes services that exist. The risk is that a protocol surface invites reaching past the service boundary for convenience, and the moment it does, the product has a second API with none of the first one's guarantees.

**One dependency reaches backwards.** Cold outbound in Phase 4 needs domain warming and platform approvals started far earlier than the phase itself. If Phase 5 planning is happening and that clock has not started, it is late — and this note exists because it is the kind of dependency that is only ever noticed from the far end.
