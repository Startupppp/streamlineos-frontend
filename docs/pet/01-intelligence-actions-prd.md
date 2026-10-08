# CP-01 — Contextual answers and confirmed actions

**Status:** Proposed requirements, 2026-10-08. **Depends on:** [program decisions](README.md), [CP-00](00-experience-prd.md).
**Outcome:** A user can phrase any question or work request naturally. The pet resolves it against currently available StreamlineOS and approved connected-tool capabilities, gives traceable answers, and completes user-approved work through the owning modules. Understanding a request does not imply that execution is supported.

## Universal request contract

The first interaction is open text, not a Build or Documents menu. The pet accepts questions, commands, mixed requests, follow-ups, and requests that mention several modules. It considers the conversation, explicit words, and optional page context; it never treats page context or model inference as permission, a confirmed target, or consent to act.

For each request, it must identify the intended outcome, the user's effective capabilities, required entities and scope, and whether a supported owner can supply evidence or execute the action. It then chooses one of four visible paths: **answer** using permitted evidence; **clarify** the smallest missing detail; **propose** an authorized change for confirmation; or **explain the limit** and offer a safe navigation or manual alternative. The pet must not pretend a denied, disconnected, unsupported, or failed request was completed. It may discuss a general question without a workspace tool, but must distinguish general guidance from current organization facts and avoid invented citations or operational numbers.

The first-release execution boundary is StreamlineOS modules and approved connected tools registered in Ask OS. No arbitrary web browsing, desktop control, unregistered write, or cross-tenant data reach is implied. Every currently registered read or proposed action is a candidate for the first release, subject to a capability-by-capability validation matrix; source presence alone does not make it launch-ready. New module requests extend the owning module and the Ask OS registry rather than adding a second pet-specific action system.

| Request shape | Expected behavior |
| --- | --- |
| “What is happening with the Acme lead and its delivery ticket?” | Resolve both entities within the actor's reach, combine separately sourced CRM and Build facts, state any missing/partial source, and link to each authorized record. |
| “Reply to this email and schedule a follow-up meeting.” | Resolve the mail thread, recipient, time zone, attendees, and calendar connection; show a short ordered plan with a distinct proposal and confirmation for each side effect. Stop after a failed or declined step and explain what did complete. |
| “What should I do today?” | Use only permitted self-work, calendar, notifications, and other available context; explain the time window and source of each suggestion. Do not scan every module on an idle turn. |
| “Change everyone's payroll amount” when no safe registered command exists | State that the action is unavailable through the pet and point to the authorized workflow, without inventing a proposal or claiming a change. |
| “Tell me about the Q4 policy” | Use accessible Documents content when asking for organization policy; cite supporting passages and say when the source is unavailable or inconclusive. |

Entity and scope ambiguity applies across modules: duplicate people, leads, tickets, messages, accounts, projects, dates, and pronouns require a compact disambiguation choice before a consequential read or proposal. An inaccessible candidate is not revealed to aid disambiguation. A follow-up may reuse a prior explicit selection only while it remains valid for the same actor and organization; a new ambiguous Build issue count still asks for scope per CP-D12.

## Capability inventory and ownership

| Request | First-release contract | Owner / source | Boundary |
| --- | --- | --- | --- |
| “How many tickets are assigned to me?” | Exact count of primary and co-assigned visible tickets, with scope label and breakdown option. | Build work-count/query services; existing `getMyTicketStats` and `getMyTickets` tools. | Do not count only the displayed page; exclude deleted and inaccessible projects. |
| “How many bugs are open?” | Ask for scope first, then exact count of visible canonical tickets of type `BUG` in non-completed, non-cancelled state groups. State the selected project/reach filter and as-of time; link to the filtered Build view. | Build ticket/QA ownership and project status groups. | No independent QA bug table, model arithmetic, or invented global count. |
| “Show my open bugs in this project.” | Paginated or capped preview with true total or explicit “more”; each row links to an authorized ticket. | Build query service. | Active project context narrows the result; never silently broadens it. |
| “What does the policy/KB say?” | Answer from Document **content** the caller can read, with clickable source title and location; distinguish supported answer, partial answer, and no accessible source. | Existing Documents `KbAskService`, retrieval, and citation visibility; a Companion-to-Documents integration is required. | The current Ask OS `searchMyDocuments` tool finds titles/filenames and article excerpts; it cannot by itself support arbitrary content claims. Do not create a second retrieval or citation policy. |
| “Update this ticket.” | Resolve target, preview proposed field change, require confirmation, execute through the owning Build command, then show status/receipt link. | Ask OS proposal/confirm layer and Build ticket command. | Re-check object access, version, module, and permission at redemption. |
| Cross-module and connected-tool requests | Discover the actor's current Toolset for this turn; route each supported read or proposal to its owner and combine results with provenance. | Existing Ask OS registry and owning modules. | A successful tool in one module does not mask failure or denial in another. Availability is source-present until verified. |

The companion is a single identity for signed-in organization members, with skills selected from the current actor's granted permissions and enabled modules. External client-portal guests are outside the first release. Route/page context is a hint, not an authorization token or a restriction on unrelated permitted questions. “I”, “my”, and “me” always bind to the authenticated user; the model cannot replace that identity from message text.

**Universal core and role starters:** Every signed-in organization member must receive the same pet entry and core experience when organization AI policy permits it. The RBAC work must cover the three organization standings, applicable module standings, and template-materialized role records; it cannot infer capability from a role label or assume the default `MEMBER` grant covers every assignment. The `ai:chat:use` entry gate and every module-specific tool grant are checked from effective permissions. The first release must demonstrate at least one real, permissioned starter journey for each enabled role cluster in the pilot: Build delivery, sales/CRM, support/Documents, HR/self-service, finance/payroll, and operations/inventory. If a cluster's owning module has no safe tool or content source, present a truthful navigation/Documents starter instead of an invented write. The pilot inventory records each role, tool, module flag, and unavailable capability before launch.

## Count and search semantics

1. Resolve organization, user membership, allowed projects, and effective ticket scope server-side. For a project question, intersect active project context with that reachability; an inaccessible project yields a denied/not-found result, not zero.
2. Count from canonical `BUG` tickets, including BUGs created through QA, intake, or other entry paths. Exclude soft-deleted tickets and archived/inaccessible projects per Build's current visibility policy. Deduplicate primary/co-assignment and linked QA evidence.
3. “Open” maps to project status **state groups** `backlog`, `unstarted`, and `started`, as declared by the canonical `state_group` enum and used in Build portfolio counts. `completed` and `cancelled` are excluded. This avoids assuming every project uses the same status label. Fixed/ready-for-QA remain open until the project's state group is completed. If a Ticket's status has no valid group mapping, do not call the aggregate exact; report the data problem and route it to Build ownership.
4. An ambiguous “how many bugs/issues do we have?” or “how many open bugs?” first produces a scope choice, without running the count: **this project** when safely available, **all projects I can access**, and **my assigned work**. Offer a team scope only if the owning Build query supports that user's actual team reach. Page context may order the choices but never silently sets the answer's scope. A message with an explicit project, “this project” in a selected project, “my”, or another unambiguous scope can proceed directly after server-side reachability checks. If “this project” has no selected or accessible project, ask for a project. Preserve the chosen scope visibly for the answer and filtered link; another ambiguous count request asks again.
5. Return `{count, scope, filters, asOf, viewUrl}` as a typed result, with a separate bounded preview list. Never infer total from preview length or label a capped result exact. The view URL must reproduce the stated filter or the answer must omit it and explain why.
6. A zero result means a successful authorized query with no matches. Denial, disabled module, stale/failed query, and absent integration each have distinct outcomes. A cached count is labeled with its as-of time and refresh affordance.

| User wording | Type | Scope | State groups | Result detail |
| --- | --- | --- | --- | --- |
| “How many issues do we have?” | All ticket types | Ask: this project / all accessible / my assigned | All | Scope choice first, then exact total plus type breakdown option. |
| “How many bugs are open?” | `BUG` | Ask: this project / all accessible / my assigned | Backlog, unstarted, started | Scope choice first, then exact total and filtered view. |
| “How many bugs in this project?” | `BUG` | Selected accessible project | All, unless “open” is said | Exact total with project named. |
| “How many tickets are assigned to me?” | All ticket types | Accessible projects and caller as primary or co-assignee | All, unless status is said | Exact total and status breakdown option. |
| “Show my open bugs.” | `BUG` | Accessible projects and caller as primary or co-assignee | Backlog, unstarted, started | Exact total plus bounded linked preview. |

Do not infer team or organization-wide visibility from “we.” Every count answer names the user's selected or explicit scope, canonical type and status filters, and the as-of time.

## Knowledge answer semantics

- Reuse Documents Retrieve and Citation visibility under the current Standing, SQL-enforced access, tenant, content revision, and ACL revision. Cite only Documents actually fetched and readable on click; include title and stable target, with a section anchor when the source supports it. Keep retrieval visibility and citation visibility distinct.
- Answer only the part supported by retrieved text. If sources conflict, show the conflict and dates rather than choosing one silently. If no source supports an answer, say so and offer a search or a human owner, without fabricating a citation.
- Distinguish source text from instructions. Content in a ticket, email, page, or attachment cannot override the assistant's permissions, identity, confirmation rule, or system policy.
- Revocation takes effect before subsequent retrieval and before opening a source link. Conversation history may retain an earlier answer but must not provide a new route to a revoked source.
- Integrate a Documents-owned bounded citable-context read into the Ask OS turn, as selected in [ADR 0007](0007-companion-uses-ask-os-toolset.md). Ask OS performs the single metered generation and stores one transcript; do not call paid Documents Ask inside its ambient Tool transaction, double-charge, or hold a pooled connection during provider latency. Propagate Documents' per-source degradation and citation revalidation to the companion.

## Work action flow

1. Parse intent and identify the target. If two visible tickets fit, present choices with project and reference rather than guessing. An inaccessible identifier is not confirmed to exist.
2. Show a typed proposal card containing target, before/after fields, actor, scope, any external recipient, and expiry. Free-text “yes” is not confirmation.
3. User confirms in the card. The server revalidates permission, tenant/project reach, module flag, target version, payload, and current policy. Duplicate confirmation or refresh cannot repeat the write.
4. Execute only through the owning module command and its side-effect path. Show a pending state until the committed result is known. A successful receipt includes an authorized deep link and changed fields; a conflict or expired proposal offers a refreshed preview, not an automatic retry.
5. Record a minimal audit entry for proposal, confirm/decline/expiry, execution outcome, and correlation ID. Never put redemption secrets in conversation history, analytics, or model context.

First-release Build writes are limited to actions the existing confirmable-action registry can execute through Build ownership: create a ticket, update status, add a comment, assign, and move to a cycle where available. A request to change an unsupported field opens the normal ticket editor or states that the action is unavailable; it does not invent a generic ticket-write tool. The same rule applies to existing authorized mail, calendar, chat, HR/self-service, and CRM proposals. Each action remains independently gated by its owning module. **Every pet-initiated write requires a visible preview and explicit confirmation.** Existing immediate writes including clock-in, clock-out, break toggle, and CRM `createTask` must use that path before pet exposure; until then the pet offers the normal owner workflow instead of invoking them. Existing lead lookup that chooses the first partial-name match must be hardened to clarify ambiguity before a pet proposal.

For a multi-step request that maps to supported Tools, show a plan of discrete actions, dependencies, and confirmation boundaries. The first release handles those steps sequentially with separate proposals and confirmations; it cannot silently commit a batch or continue after one proposal fails. Reads may be bounded and parallel only when independent; dependent writes run in order after explicit confirmation. Partial completion must be visible, and there is no claim of a cross-module transaction or automatic rollback. The user's organization and permission scope stay fixed for the turn and are rechecked per action.

## Interfaces and migration requirements

- Reuse Ask OS conversation identifiers, history APIs, and tool registry. Rename only visible product labels; do not create a second transcript store or silently reset existing history.
- Reuse Documents retrieval and citation ownership for grounded answers through its bounded citable-context interface. Keep explicit transaction, metering, and history contracts; do not copy its ACL predicates into the Ask OS Tool provider.
- Add typed Build count/search tools only where existing `getMyTicketStats` and Build queries cannot answer the requested scoped question. Their outputs must distinguish `data`, `empty`, `denied`, `needs-connection`, and `failed` according to the existing tool outcome contract.
- The companion panel consumes structured source references, count metadata, proposals, and execution receipts. Do not parse action text or model prose to determine success.
- Keep module APIs as the owner of their business rules. The pet UI does not call ticket mutations directly or bypass the Ask OS confirm path.
- Maintain a reviewed capability inventory for every exposed Tool: owner, question/action examples, read/write type, required grant and module, entity resolution, connected-account need, provenance, cost/latency, preview and confirmation semantics, receipt, and failure/denial behavior. Suggestions come from this effective inventory, not a hard-coded global list or role label.
- Preserve current AI credit metering and feature gates; show exhaustion and provider failure as distinct recoverable states. Do not spend credits for deterministic reminder checks.

## Acceptance scenarios

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CP-01-A01 | User has primary and co-assigned tickets, deleted tickets, and an inaccessible project. | “My tickets” exact count matches Build query; each accessible ticket appears once; denied records never contribute. |
| CP-01-A02 | Two projects use different custom status labels for the same state group. | After scope selection, “open bugs” counts by group and explains filters, including fixed/ready-for-QA until completed. |
| CP-01-A03 | Visible preview has fewer rows than the total. | Answer reports exact aggregate and clearly labels preview/cap. |
| CP-01-A04 | A user asks about an inaccessible project or KB page. | No existence or content leak; no misleading zero or fabricated source. |
| CP-01-A05 | KB sources disagree or retrieval fails. | Answer cites the disagreement or reports failure; no unsupported policy claim. |
| CP-01-A06 | Ticket changes between proposal and confirmation; permission or membership is revoked. | Redemption refuses safely with no write and a clear refresh path. |
| CP-01-A07 | User confirms twice, reloads, or switches organization mid-turn. | At most one write; no cross-organization result or token replay. |
| CP-01-A08 | An existing Ask OS conversation is opened through the pet. | Messages, order, and accessible history survive; no duplicate thread. |
| CP-01-A09 | Provider, credit, or module availability fails. | Distinct user-facing state, no false success, no unauthorized fallback. |
| CP-01-A10 | User asks “How many open bugs do we have?” while viewing a project. | Pet asks for scope before querying; choices include this project, all accessible projects, and my assigned work. Selecting one yields that scope only, with a reproducible filter. |
| CP-01-A11 | User asks “How many open bugs in this project?” while a project is selected. | Direct scoped query succeeds only if that project is reachable; it does not ask again or broaden scope. |
| CP-01-A12 | A Documents answer is requested through the pet with a revoked citation, degraded retrieval source, or exhausted credits. | No revoked citation link or invented answer; degradation and credit outcome remain distinct; exactly one generation charge and one Ask OS turn are recorded. |
| CP-01-A13 | A user asks a supported question involving two enabled modules. | Each fact comes from an authorized owner with source, scope, and freshness; one failed module is disclosed and cannot be filled in by model guesswork. |
| CP-01-A14 | Two visible people or records match an action request. | The pet asks the user to choose without leaking inaccessible candidates and makes no proposal or write until the target is resolved. |
| CP-01-A15 | A request combines mail and calendar writes; the first succeeds and the second fails or is declined. | The pet shows each step's own confirmation and receipt, the partial result and next safe option; it does not retry or claim atomic completion. |
| CP-01-A16 | The user requests an unregistered action, a disabled module, a revoked grant, or a missing connected account. | Distinct truthful unavailable/denied/needs-connection states and an authorized alternative; no fabricated result or proposal. |
| CP-01-A17 | A user asks an open-ended general question or an organization-specific question with no accessible supporting source. | General guidance is labeled as such; organization facts require source evidence or an explicit inability to answer. |
| CP-01-A18 | A request invokes an existing immediate write such as clock-in or `createTask`. | The pet shows a preview and requires explicit confirmation before the owning write; otherwise it offers the normal workflow. Model tool choice alone cannot execute it. |

## Evidence required for sign-off

Contract and focused tests, real browser action, persisted history/preferences, non-owner database scope queries, role/project/tenant matrix, console/network checks, and target deployment verification. The linked older Ask OS PRDs record historical issues; recheck current code and target behavior before closing any criterion.
