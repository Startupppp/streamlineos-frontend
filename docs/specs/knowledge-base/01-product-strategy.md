# Step 1 — Product Strategy and Customer Needs

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

## Personas

- **Reader:** searches, asks, follows citations, and needs fast trustworthy answers.
- **Contributor:** creates and updates pages during daily work.
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

### P0 — Trustworthy core

- Correct My pages and Shared with me.
- Canonical page/space/project/share authorization on every read and mutation.
- Full search with snippets, facets, URL state, cursor paging, and Quick find handoff.
- Bounded page/space/review/template/trash/source/job collections.
- Page card/row action consistency.
- Space archive/restore and members visibility.
- Searchable trash with bulk restore/purge.
- Reliable page history, conflict resolution, and offline-safe drafts.
- Mobile Wiki navigation and page metadata/comments access.
- Visible owner, freshness, verification, and access state on result and page surfaces.
- Honest error/denied/empty states with request ids and retry.

### P1 — Governance and quality loop

- Content Health page with presets: stale, unowned, unverified, empty, broken links, overexposed, overdue review.
- Assignable Ask gaps: unanswered query → owner → draft/update → verification → resolved.
- Bulk owner, review, verify, archive, move, and access repair.
- Space roles and review policies.
- Permission-safe analytics for search, Ask, reuse, gaps, freshness, and public deflection.
- Research briefs with durable citations and a review owner.
- Notifications for direct shares, review assignments, mentions, and ownership only; avoid noisy activity feeds.

### P2 — Differentiated intelligence with measured demand

1. **Evidence Trail:** every important claim in an AI answer can expand to the exact page version, source passage, owner, verification state, and access-safe change history. This improves trust rather than adding an AI gimmick.
2. **Answer-to-Fix Loop:** when Ask cannot support an answer, the user can create a gap. The system proposes the smallest page change, routes it to the owner, preserves the original query, and measures whether the fix later resolves similar questions.
3. **Knowledge Packets:** an incident, launch, onboarding, customer escalation, or decision can expose a curated, live packet of linked records and pages. The packet references source records rather than copying them.
4. **Freshness Budgets:** different knowledge classes carry different review expectations. A runbook may require 30-day review; a principle may allow 365 days. Budgets are policy plus alerts, not an opaque AI score.
5. **Contradiction Queue:** retrieval detects materially conflicting claims across current pages and presents both with owners and versions for human resolution. It never auto-rewrites either page.
6. **Change Impact Preview:** before archiving, moving, or restricting a page, show affected backlinks, Ask citations, public links, packets, and automations.

These features are “ahead” because they close the trust-and-maintenance loop inside the operating system. They are not P0 because they depend on correct ownership, versioning, links, ACLs, and telemetry.

## Features deliberately not built now

| Feature | Reason |
|---|---|
| Arbitrary relational databases inside pages | High complexity, duplicates Build/CRM data, weakens a clear page model |
| Board/calendar/timeline views of pages | No strong knowledge job; filters and health presets cover current needs |
| Template marketplace | Starters and organization templates solve the job without moderation/billing/discovery overhead |
| Autonomous AI publishing or access changes | Unsafe, hard to audit, and removes human ownership |
| Separate project-wiki backend | Duplicates content, search, ACL, history, and indexing |
| Always-on multiplayer cursors | Costly and not required for the current autosave/conflict job; revisit from measured concurrent-edit demand |
| Social reactions, follower counts, or gamification | Activity is not knowledge quality |
| A second generic dashboard | Content Health and Analytics must drive actions, not display vanity totals |
| Per-feature search infrastructure | One retrieval/indexing module should serve Wiki, Ask, public help, and contextual lookup through projections |

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
