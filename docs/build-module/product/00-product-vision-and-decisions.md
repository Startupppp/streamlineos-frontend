# Product vision and decisions

Status: planned target with current-state caveats

## Product promise

Streamline Build is a work and delivery operating system for freelancers, agencies, product teams, project teams, and invited clients. It combines fast issue execution with product planning, delivery governance, client collaboration, and commercial traceability.

The product must answer five questions without spreadsheet reconciliation:

1. What was requested and by whom?
2. What did we agree to deliver?
3. What is happening now, what is blocked, and who owns it?
4. What did the client approve or reject?
5. What time, budget, invoice, payment, and outcome resulted?

## Primary customer groups

| Customer | First value | Daily need | Retention reason |
|---|---|---|---|
| Solo freelancer | Start a client project in minutes | See priorities, deadlines, feedback, time, and payment context | Fewer status meetings and fewer lost approvals |
| Agency | Standardize delivery across clients | Portfolio health, capacity, scope, approvals, margins | Repeatable delivery and client trust |
| Product manager | Convert evidence into decisions and roadmap | Triage, prioritization, goals, releases, feedback | Traceable product decisions and outcomes |
| Project/program manager | Coordinate dependencies and commitments | Milestones, risks, workload, approvals, reporting | Predictable execution across teams |
| Engineer/creator | Know the next clear action | Focused work queue, context, dependencies, proof | Less administrative work and interruption |
| Content team | Run briefs through review and publication | Calendar, versions, approvals, channel status | One accountable content pipeline |
| Client/stakeholder | Review only what is relevant | Progress, deliverables, decisions, approvals | Transparent status without internal clutter |

## Product strategy

### Opinionated core, adaptable edge

The core model stays stable: organization → module membership → workspace/project → work item → delivery evidence → approval → outcome. Templates, custom fields, views, and terminology adapt it to software, video, content, legal, consulting, and other client work.

Do not create separate products for every profession. Provide profession packs that configure the same deep modules.

### Two operating modes

1. **Visual mode** provides complete pages, tables, boards, dashboards, reports, and settings.
2. **Assist mode** lets a user ask, review a proposed action set, confirm sensitive actions, and open the exact records used.

Both modes use the same commands, policies, validation, and audit trail. AI is another caller of the same mutation interfaces.

### Progressive disclosure

Show the few actions needed now. Advanced tools stay searchable and discoverable through `More`, command search, contextual actions, and settings. A user should not face twenty unrelated sidebar links on day one.

## Confirmed product decisions

| Topic | Decision |
|---|---|
| Market | Global and India |
| Buyer | Organizations and individual professionals |
| Product form | Build sold alone or selected with other Streamline modules |
| Onboarding | One short shared flow; module-specific questions appear only when needed |
| Module selection | One or many modules; modules can be added later |
| First experience | Persona template creates a useful default; users can customize later |
| Navigation | Role-aware defaults with user-controlled pinning; permissions always win |
| Ticket opening | Full page from direct navigation; contextual split pane from lists, boards, and related-ticket clicks |
| Client access | Secure magic link with explicit project/surface grant and expiry controls |
| Client feedback | Enters Intake for triage by default; trusted sources may create tickets by policy |
| Dashboard | Default personal Command Center plus safe, versioned customization |
| AI | May read or mutate only within the caller's effective access; sensitive actions require confirmation |
| Payments | Razorpay first; direct/offline payment recording also supported |
| Financial ownership | Accounting owns invoice/payment/ledger; Build shows projection and contextual action |
| Time ownership | Timesheets is a separate module; Build embeds summaries and quick-entry actions |
| CRM ownership | CRM owns accounts/contacts/deals; Build references client and commercial context |
| Integrations | Native high-demand connectors first; first-party extensions later; no open marketplace initially |
| Mobile | Fully responsive web now; native application after web maturity |
| Scale | Solo users through thousands of users, multiple companies, and multiple products |

## Product principles

### Time to first value

- Signup to useful workspace in under five minutes for a solo user.
- A team admin can select modules, invite people, and create a first project without leaving onboarding.
- Every empty state offers one meaningful next action and one sample/template option.

### Role honesty

- A role name must match what it can do.
- `Member` must perform normal work in the scope granted to it.
- A view-only role should be named `Viewer` or expressed as a restricted custom role.
- Permission errors explain the blocked action and whom to contact without revealing inaccessible data.

### Client confidence

- Client-facing screens contain approved language and records only.
- Drafts, private notes, internal estimates, margin, credentials, and security data never leak into client projections.
- Every approval records actor, time, version, decision, optional comment, and source.

### Operational trust

- Writes are idempotent where retries are possible.
- Every important mutation is audited.
- Long work is asynchronous, observable, and resumable.
- The UI distinguishes empty, loading, filtered-empty, unauthorized, unavailable, and failed states.

### Source-of-truth discipline

| Domain | Owner | Build consumes |
|---|---|---|
| Organization identity and entitlements | Platform | membership, enabled modules, plan limits |
| Work delivery | Build | native records |
| Customer/account/contact/deal | CRM | references and read projection |
| Time entry and timesheet approval | Timesheets | totals, status, quick entry |
| Invoice, tax, payment, ledger | Accounting | amount/status/aging projection and action link |
| Mail and calendar | Home | linked messages/events |
| Files | File platform | authorized file metadata and signed access |

## Recommended plan shape

Existing plan names remain Free, Startup, Professional, and Enterprise. Exact prices and quotas stay in the commercial catalog, not hard-coded in Build.

### Free

- One organization, up to three internal users, three client organizations, and five active projects.
- Core tickets, board/list/table, forms, intake, basic client portal, one import, limited automation/AI, basic reports, standard branding, and bounded storage/activity history.
- Full export, account recovery, MFA support, audit access for the user's own actions, and secure authorization remain available.

### Startup

- More users, clients, projects, storage, views, automations, AI allowance, integrations, and templates.
- Time/budget projection, richer portal branding, workload, and standard portfolio reporting.

### Professional

- Advanced goals, releases, product feedback, portfolios/programs, approvals, QA, incident and risk workflows, granular custom roles, advanced reports, cross-module automation, and governance.

### Enterprise

- Unlimited clients subject to fair-use/system limits, SSO/SCIM, advanced audit/export/retention, policy controls, enterprise integrations, support commitments, and optional private deployment later.

Top-ups may increase clients, storage, automation runs, AI allowance, or external guests. A top-up never expands permissions automatically.

## Differentiation target

The product should win through connected outcomes:

- Faster activation than heavyweight enterprise tools.
- More delivery governance than lightweight boards.
- More client accountability than internal product trackers.
- More product evidence and release traceability than freelancer suites.
- More commercial context than engineering-only trackers.
- Fewer context switches because each record opens the owning module with prefilled context.

These are product targets. Marketing may use them only after comparative tests and current-product evidence support the claim.

## Success measures

### Activation

- Signup completion rate.
- Median time from signup to first created or imported project.
- Percent of workspaces with first invite accepted within 24 hours.
- Percent with first ticket moved to done within seven days.
- Percent with first client grant and client action completed.

### Weekly value

- Weekly active creators, collaborators, and clients.
- Planned versus completed work.
- Median intake-to-triage time and blocked duration.
- Approval response time and change-request leakage.
- On-time milestone/release rate.
- Hours, budget, invoice, and payment coverage for eligible client projects.

### Trust

- Authorization-denial correctness, cross-tenant negative tests, invite failures, duplicate writes, cache staleness incidents, public-link incidents, and audit coverage.
- P95 page/read latency, mutation latency, job delay, notification delivery, error rate, and recovery success.

## Explicit deferrals

- Native mobile applications until responsive web reaches release gates.
- Third-party extension marketplace.
- Customer-selectable data residency at initial launch.
- Broad self-hosting until deployment, upgrades, support, and security can be operated reliably.
- Duplicate CRM, Timesheets, or Accounting ledgers inside Build.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Complete Build-alone and multi-module activation, role-aware default navigation, an authorized first project/ticket, and a usable first-session Command Center.
- [ ] Make Visual and Assist modes call the same validated commands and access policy; require action preview and confirmation for sensitive AI effects.
- [ ] Verify direct ticket URLs, contextual split panes, return state, client Intake feedback, and secure project/surface-scoped magic-link access in real browser journeys.
- [ ] Enforce Free, Startup, Professional, and Enterprise capabilities through the commercial catalog, including Free client limits, Enterprise policy, top-ups, over-limit recovery, and unchanged authorization.
