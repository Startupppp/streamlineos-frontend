# Step 1 — Product Strategy and Customer Needs

> **Supporting specification:** [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md) owns scope and priority. This file supplies detailed jobs and metrics only.

## The customer problem

Customers do not need “more documents.” They need reliable answers and durable decisions without searching across tools, asking the same people again, or trusting stale content. The product must reduce the cost of creating, finding, validating, and maintaining knowledge.

## Primary jobs to be done

| Job | User outcome | Product proof |
|---|---|---|
| Capture knowledge while work happens | Important context is not lost after a ticket, project, incident, or support conversation closes | Record-linked page creation; template completion; capture-to-draft conversion rate |
| Find a specific page | The user reaches the right page without knowing its folder | Search success, reformulation rate, time to open |
| Get an answer | Ask returns a grounded answer or honestly says it cannot | Citation-open rate, supported-answer rate, no-answer recovery, feedback |
| Judge trust | The user can tell owner, freshness, verification, and source before acting | Trust metadata visibility; stale-content incidents; verified coverage |
| Maintain at scale | Owners can repair stale, unowned, overexposed, or broken content in batches | Health backlog age; remediation throughput |
| Share safely | The correct people get the intended access and revoked users lose it quickly | Grant success, revocation propagation, zero-leak tests |
| Recover from mistakes | Edits, deletion, imports, and automation are reversible | Restore success, conflict recovery, purge exceptions |
| Publish externally | Customers can expose selected help content without exposing internal context | Public-page availability, deflection, no private metadata leaks |
| Work with business files | A user can upload, organize, preview, search, share, and export common office files without losing access control | File task success, preview success, search recall, version recovery |
| Analyze operating data | An operator can use a read-only list, pivot, chart, or metric over authorized StreamlineOS records without repeated CSV copy/paste | Live-block use, refresh success, fewer manual exports, decision time |

## Personas

- **Reader:** searches, asks, follows citations, and needs fast trustworthy answers.
- **Contributor:** creates and updates pages during daily work.
- **File collaborator:** organizes folders, uploads office files, shares them, and recovers versions.
- **Operator or analyst:** imports XLSX/CSV and consumes refreshable, permission-aware business data.
- **Knowledge owner:** verifies, reviews, organizes, and responds to gaps.
- **Space manager:** controls membership, structure, archive, and templates for a domain.
- **Organization administrator:** sets retention, audits access, handles export/purge, and monitors health.
- **External reader:** consumes an explicitly published page without authenticated product chrome.

Each page must serve one primary persona. Admin controls may coexist only when they do not bury the reader’s next action.

## Product principles

1. **Find before organize.** Search, Ask, recents, backlinks, and record links matter more than perfect folder trees.
2. **Trust is part of the result.** Owner, verification, freshness, access, and citations appear where a decision is made.
3. **Knowledge follows work.** A page may link to a project, issue, incident, meeting, customer, or decision without duplicating those records.
4. **Governance is a loop.** Detect a gap, assign an owner, create or repair content, verify, measure reuse, and review again.
5. **Safe by default.** Server authorization, reversible lifecycle, least privilege, and non-leaking errors are product features.
6. **Human accountability for AI.** AI can draft and explain; a named human owns publishing and verification.
7. **Progressive disclosure.** Readers get a quiet page. Editors and admins reveal tools when needed.
8. **Measure value, not activity.** Page count and AI message count are not success metrics.
9. **Compatibility before cloning.** Make common office files safe and useful first; build native editing only for workflows where StreamlineOS data creates a clear advantage.

## North-star and guardrail metrics

### North-star

**Weekly successful knowledge resolutions:** unique user sessions in which the user opens a useful page or receives a positively rated, cited answer without repeating the query within ten minutes.

### Leading metrics

- Median time to first useful result.
- Search success and zero-result rate by tenant and query class.
- Ask supported-answer rate and citation-open rate.
- Percentage of active pages with owner, review date, and verification state.
- Median stale/unowned gap age.
- Percentage of pages created from work context that are reused by another person.
- Content reuse across modules, measured by links and cited answers, not copies.

### Guardrails

- Zero cross-tenant or unauthorized title/snippet/citation disclosures.
- Page read p95 < 250 ms at the server; list/search p95 < 500 ms; Ask first-token p95 < 2.5 s when the provider is healthy.
- Error rate < 0.1% for page reads and < 1% for AI requests excluding client cancellations.
- Revocation visible to reads/search/Ask within 60 seconds, with detail reads fail-closed immediately.
- Background index freshness p95 < 60 seconds and p99 < 5 minutes.
- Monthly infrastructure and provider cost per weekly active user remains inside an approved budget; AI has explicit tenant quotas.

## Feature priority

The complete Must/Basic/Good/WOW classification, exclusions, edge-case checklist, current implementation baseline, and phased release order live only in [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md). This strategy file owns customer jobs, personas, principles, metrics, content requirements, and the decision test below; it does not maintain a second roadmap.

## Content design requirements

Every starter template should encode only information that improves retrieval and trust:

- outcome/purpose;
- owner and intended audience;
- last reviewed / next review;
- source or decision links;
- steps, decision, or answer body appropriate to the template;
- known limitations and escalation path where relevant.

Templates should avoid decorative sections, generic mission text, and fields that customers routinely leave blank. Template completion and later reuse decide whether a field survives.

## Decision test for every new feature

A feature enters delivery only if all answers are “yes”:

1. Does it solve one named job above for a named persona?
2. Is the current workaround frequent, costly, or risky?
3. Can success be measured within one release cycle?
4. Can an existing module or interface provide most of it?
5. Does it preserve authorization, reversibility, and a non-AI fallback?
6. Is its ongoing storage, compute, provider, and support cost explicit?
7. Is it more valuable than the P0/P1 item it would displace?
