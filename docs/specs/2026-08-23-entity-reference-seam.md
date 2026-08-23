# PRD — One answer to "what business record is this chat thing pointing at"

Status: ready-for-agent
Date: 2026-08-23
Scope: candidate C2 from the 2026-08-23 verified architecture review (`architecture-review-20260823-verified.html`)
Sequenced after: the module-namespace seam PRD (2026-08-23), which settles module authority before this work starts leaning on it
Sequenced before: any work that adds a new record type to chat — leads, employees, invoices, stock items

## Problem Statement

People work in chat. A conversation is where a ticket gets triaged, a deal gets chased and an incident gets run, so the product needs a chat message to be able to point at a business record, show what it is, and offer the actions the reader is allowed to take.

Today that is built four times, four different ways, and none of them can be extended without writing a fifth.

**A chat user can read the name of any record they have no permission to see.** The route that opens an entity-linked channel takes a record type and a record id from the URL and is gated on `chat:channels:read` — a permission every chat user holds. It then reads the record's own title out of the owning module's tables and puts it in the channel name. Six record types are reachable this way: project, client, task, sprint, release, incident. A person with zero Build permissions can walk ids and harvest ticket titles, project names and **customer names**. If a channel for that record already exists, the same request silently adds the caller to it as a member.

**An unfurled record shows what it was, not what it is.** When an action posts a system message, the record's title, status and number are copied into the message at send time. That copy is never re-checked. A reader who never had, or has since lost, `build:tickets:view` still reads the ticket's title in scrollback forever, and everyone reads a status that stopped being true the moment someone changed it.

**Adding a record type means editing chat.** A record type must be added to a hard-coded list of six, to a Zod enum, to a `switch` that imports the owning module's tables, and — if it needs actions — to a controller that imports those tables again. Chat currently imports Build's `tickets`, `projects`, `project_members` and `ticket_activity_log` directly, plus a Build status utility. That is cross-module access through another module's tables, which the repository rules forbid, and it is why leads, employees and invoices have no path into chat at all.

**The same idea is stored two ways.** A chat channel can point at a record through an untyped type/id pair, or at a deal through a dedicated foreign key sitting in the next column. CRM creates its channels one way and everything else the other, so "find the channel for this record" has two answers depending on which module you came from.

For a developer or a coding agent the cost compounds: asked "how does chat reference a ticket", there are four correct answers and no way to tell which one a given surface used.

## Solution

One module answers the question, and every surface asks it.

An **entity reference** becomes a first-class thing the platform can resolve: given the organization, the person asking, and a reference, the module returns either a display card the asker is allowed to see, or nothing. Nothing is a value, not an error — the caller decides whether that renders as "a ticket you can't see" or as a 404. This is the shape the person seam already uses, and it is the shape that makes the leak unrepresentable: a caller who cannot express "resolve this without checking access" cannot leak a title by forgetting to check.

The module also answers the second half: given a reference and an actor, which actions may this person take on it. Chat stops knowing that a ticket has a status, that a status change needs project membership, or that a project has a workflow. It knows only that a reference has actions, that actions have labels, and that submitting one returns a result.

Each product module registers an **adapter**. Build registers one covering its tickets, projects, sprints, releases and incidents. CRM registers one covering clients and deals. Two adapters on day one, which is what makes this a seam rather than a hypothetical. A third module joins by writing an adapter — no edit to chat, no new enum member, no new controller.

The two storage mechanisms collapse to one. The type/id pair stays as what the rules already permit it to be — a dedupe pointer used to find an existing channel for a record — and stops being the path through which a record is resolved. The deal foreign key goes away; a deal becomes a reference like everything else.

From the outside: an unfurled ticket shows its current title and status to people who may see it, and shows a locked placeholder to people who may not. The actions on it are the ones that person can actually perform. Opening an entity channel for a record you cannot see returns not-found. And sharing a lead in chat becomes a CRM change, not a chat change.

## User Stories

1. As a chat user, I want a shared record to show its current title, so that I am not reading a title that changed last week.
2. As a chat user, I want a shared record to show its current status, so that I do not act on a stale state.
3. As a chat user, I want a record I may not see to render as a locked placeholder, so that the conversation still makes sense without leaking the record.
4. As a chat user, I want a deleted record to render as unavailable rather than vanish, so that the surrounding conversation stays readable.
5. As a chat user, I want to open the record from the reference, so that I can move from the conversation to the work.
6. As a chat user, I want only the actions I am permitted to perform to be offered, so that I do not hit a refusal after choosing one.
7. As a chat user, I want to change a ticket's status from the conversation, so that I do not have to leave chat to do it.
8. As a chat user, I want to assign a ticket from the conversation, so that ownership is settled where it was discussed.
9. As a chat user, I want to set a due date from the conversation, so that a commitment made in chat is recorded on the record.
10. As a chat user, I want to turn a message into a ticket, so that a request raised in chat does not get lost.
11. As a chat user, I want the record's channel to be found rather than duplicated, so that one record has one conversation.
12. As a chat user, I want a record's channel name to follow the record when it is renamed, so that the channel does not drift out of date.
13. As a CRM user, I want to share a deal in chat, so that a negotiation can be discussed with its context attached.
14. As a CRM user, I want to share a client in chat, so that account conversations carry the account.
15. As a Build user, I want to share a project, sprint, release or incident in chat, so that delivery conversations carry their subject.
16. As an incident responder, I want the incident reference to show its live severity and status, so that a war room reads the truth.
17. As a member with no Build permissions, I want a Build reference to reveal nothing beyond its type, so that chat is not a way around the module's gates.
18. As a member whose access was revoked, I want references shared before the revocation to stop showing me their contents, so that revocation is retroactive in scrollback.
19. As a member of another organization, I want a reference to a record in this one to be indistinguishable from a reference to a record that does not exist, so that the API is not an existence oracle.
20. As a chat user, I want opening an entity channel to require permission to see the record, so that opening a channel is not a read of the record by another name.
21. As a chat user, I want not to be silently added to a channel by requesting it, so that my membership reflects a decision I made.
22. As an organization owner, I want chat's actions on a record to enforce the same rules the module enforces, so that chat is not a softer path to the same write.
23. As an organization owner, I want a record's audit trail to be identical whether the change came from chat or from the module, so that the log is one story.
24. As a security reviewer, I want object-level access re-asserted at read time rather than at send time, so that a captured snapshot cannot outlive the grant that justified it.
25. As a security reviewer, I want resolution to re-assert the organization on every query rather than lean on row-level security, so that a missing tenant context fails closed.
26. As a security reviewer, I want a reference that cannot be resolved to return the same shape as one that is forbidden, so that the two are not distinguishable.
27. As a security reviewer, I want the module to expose no way to resolve a reference without an actor, so that skipping the access check is not something a caller can do by accident.
28. As a security reviewer, I want the actions list to be derived from the same authority the action handler enforces, so that a hidden action and a refused action agree.
29. As a security reviewer, I want an action submitted directly to still be authorized, so that hiding it in the interface is cosmetic and the handler is the boundary.
30. As a security reviewer, I want batch resolution to check access per reference rather than once for the batch, so that one visible record does not carry nine invisible ones.
31. As a developer, I want one interface that answers what a reference points at, so that I cannot pick the wrong one of four.
32. As a developer, I want chat to stop importing another module's tables, so that the module boundary the rules describe is the one the code has.
33. As a developer, I want the record types to come from registered adapters rather than a hard-coded list, so that the list cannot fall out of date.
34. As a developer, I want adding a record type to be an adapter, so that the seventh type costs what the second one did.
35. As a developer, I want one storage mechanism for "this channel is about that record", so that finding a record's channel has one answer.
36. As a developer, I want the reference type vocabulary to be owned by the registry, so that a type that no module claims is rejected at the boundary.
37. As a developer, I want unresolvable to be a returned value rather than a thrown error, so that a batch of ten references does not fail because one is gone.
38. As a developer, I want the adapter interface small enough to implement in one sitting, so that a module owner is not discouraged from joining.
39. As a coding agent, I want one place to look when asked how chat references a record, so that my next task does not add a fifth mechanism.
40. As a coding agent, I want the rule stated in the repository rules, so that the seam is not re-litigated.
41. As a QA engineer, I want allow and deny cases per record type, so that coverage is not just the type someone remembered.
42. As a QA engineer, I want a case proving a revoked reader loses scrollback contents, so that the retroactive property is pinned.
43. As a QA engineer, I want a case proving the entity-channel route refuses a record the caller cannot see, so that the live leak has a regression net.
44. As a QA engineer, I want cross-tenant cases on every changed route, so that a correctness fix is not a new hole.
45. As a QA engineer, I want the existing chat action route specs to keep passing unchanged, so that the refactor is provably behaviour-preserving where it should be.
46. As an operator, I want resolution batched per message page rather than per reference, so that a busy channel does not multiply queries.
47. As an operator, I want resolution to add no new wildcard cache scans, so that Redis cost does not rise.
48. As an operator, I want the deal foreign key migration to be additive and reversible, so that it ships without a maintenance window.
49. As an operator, I want existing entity channels to keep working after the change, so that no conversation is orphaned.
50. As an operator, I want a reference to a record in a module the organization has disabled to resolve as unavailable, so that entitlement changes do not produce errors in scrollback.

## Implementation Decisions

### The seam

**One new module, and it is the only way to resolve a reference.** It owns the reference vocabulary, the adapter registry and the two questions. It is modelled directly on the person seam in the directory module, which is the repository's existing precedent for "resolve a subject, return a discriminated result, unresolved is a value".

**Unresolvable and forbidden are the same answer.** The result is a discriminated union whose failure arm carries the reference and nothing else. Deleted, never existed, wrong organization and not permitted all produce it. A caller cannot tell them apart, so a caller cannot leak the difference.

```
type EntityReference = { type: string; id: string }

type EntityResolution =
  | { status: "resolved"; card: EntityCard }
  | { status: "unresolved"; reference: EntityReference }
```

**There is no unauthenticated resolve.** The interface takes the organization and the acting person as required parameters. There is deliberately no variant that skips the access check — the unsafe state is not guarded, it is unrepresentable. This is the specific change that closes the entity-channel-name leak, because the leak exists today only because a resolver with no actor parameter was available to call.

**The card is display-only and uniform.** Type, id, a title, a short subtitle, a status label, and a canonical href. Nothing module-specific and nothing sensitive: a money figure, an assignee's contact details or a customer's terms stay behind their own gates at their own endpoints. A module that wants a richer card grows the card shape for everyone, deliberately, rather than smuggling fields through a loose bag.

**Batch is the primary shape.** A message page carries many references, so the interface resolves a list and returns a result per reference, in order. The single-reference form is a convenience over it. Adapters receive the whole list for their type at once so they can answer in one query rather than one per reference.

**Actions are data.** `actionsFor` returns, per reference, the actions this actor may take: a stable action id, a human label, and whatever input the action needs described declaratively. Chat renders them and submits them; it does not know what any of them mean.

**Action submission goes through the seam too.** The action handler lives with the adapter, in the owning module, and runs that module's own rules — membership checks, workflow validity, audit entry, activity log. Chat's contribution is the system message it posts afterwards.

### The adapters

**Two on day one, and that is the justification.** Build registers ticket, project, sprint, release and incident. CRM registers client and deal. One adapter would make this a hypothetical seam; two make it a real one.

**Each adapter owns its own permission mapping**, because the keys are not uniform and pretending they are is how the current leak reads six record types behind one chat key. The mapping as it stands in the catalog today:

| Reference type | Read key | Owning module |
|---|---|---|
| ticket | `build:tickets:view` | Build |
| project | `build:view` | Build |
| sprint | `build:sprints:view` | Build |
| release | `build:view` | Build |
| incident | `build:incidents:view` | Build |
| client | `crm:clients:read` | CRM |
| deal | `crm:deals:read` | CRM |

**Object-level access is the adapter's job, not the registry's.** Holding the read key is necessary, not sufficient — a ticket still has to be in a project the person can reach, and the resolved data scope still applies. The adapter re-asserts organization in its own predicates rather than relying on row-level security, matching the person seam's stated rule.

**Module entitlement is checked before the adapter runs.** A reference into a module the organization has disabled resolves unresolved rather than erroring, so disabling a module degrades scrollback instead of breaking it.

**An unregistered type is rejected at the boundary.** The Zod enum of six literals is replaced by a check against the registry, so the vocabulary has one source and a type no adapter claims is a validation failure, not a silent null.

### What changes in chat

**The four chat action endpoints keep their routes, their request shapes and their responses.** They stop importing Build tables and the Build status utility and delegate to the seam. Their existing permission decorators stay, so the currently passing guard-tier specs keep passing unchanged — that is the evidence the refactor preserved behaviour.

**Unfurls resolve at read time.** The message page resolves the references it carries and returns cards. The snapshot fields currently written into message metadata stop being read. They are left in place on existing rows rather than migrated out, because they are inert once nothing reads them and rewriting historical message metadata is a risk with no payoff.

**New system messages store the reference only** — type and id — not a copy of the record.

**The entity-channel route resolves before it acts.** It resolves the reference for the caller first; unresolved returns not-found. Only then does it look for or create the channel.

**Requesting an entity channel stops auto-joining the caller.** Joining becomes an explicit action, because a read should not change membership.

**The channel's type/id pair stays, as a dedupe pointer.** That is what the repository rules already permit an existing polymorphic pair to be. It is how "does this record already have a channel" is answered, and it is no longer how a record is resolved. No new polymorphic pair is introduced anywhere.

**The deal foreign key on the channel is removed.** CRM creates a deal's channel with type `deal` like every other module. The migration backfills the pair from the existing column before dropping it, and follows the repository's additive shape — add, backfill, then drop in a later migration rather than in the same one.

**The channel name follows the record.** The existing stale-name repair keeps working, now sourced from the resolved card rather than from a direct table read.

### Cost

**One round of queries per adapter per page**, not per reference. Resolution is batched by type and each adapter answers its whole batch in one query.

**No new cache keys.** Cards are not cached in this work. If profiling later shows a need, the key must carry the actor's permission version, since a card is access-dependent — caching it under a key without that is the mistake the caching rules already name.

**No new per-request transactions.** Resolution runs inside the request's existing tenant transaction.

## Testing Decisions

**A good test here states who the caller is, which reference they asked about, and what came back.** It asserts the response and the resulting access — never which tables were read, in what order, or how many queries ran. Query strategy is exactly what this work is free to change, so a test that fails when an adapter's query is rewritten is testing the implementation and should be rewritten. This is the standard the two prior seam specs set.

**The primary seam is the controller**, and this is a place the codebase already has strong prior art: `chat-actions.controller.e2e-spec.ts` and `chat.controller.e2e-spec.ts` on the shared `createE2eApp` harness, which proves the guard tier with no database. New guard-tier cases extend those files rather than starting new ones.

**End-to-end specs are excluded from the default run.** They execute only under the dedicated end-to-end command, so adding a case is not the same as adding executed coverage. This work is not done until that suite has been run and its result reported.

**Two default-run unit suites are the fast net**, because they catch the properties that matter on every pass:

- Registry and resolution behaviour: an unregistered type is refused; a reference the actor cannot read comes back unresolved; unresolved is byte-identical for missing, deleted, cross-tenant and forbidden; a batch containing one unresolvable reference still resolves the rest.
- Adapter authority: for each of the seven types, holding the read key resolves and lacking it does not, and holding the key but failing the object-level check also does not.

**Controller cases to cover:**

- Each of the four chat action routes behaves exactly as it does today for an authorized caller — same status, same response body.
- Each of the four refuses without its existing permission key, unchanged.
- A message page containing a ticket reference returns a resolved card for a reader holding `build:tickets:view`.
- The same page returns an unresolved placeholder for a reader without it — **the retroactive-revocation case, which fails today.**
- The entity-channel route returns not-found for a record the caller cannot read — **the live leak's regression net.**
- The entity-channel route does not add the caller to an existing channel as a side effect of the request.
- A cross-tenant reference and a nonexistent reference produce identical responses.
- A reference into a disabled module resolves unresolved rather than erroring.
- An action hidden from an actor is still refused when submitted directly.
- A CRM deal reference resolves through the same route shape as a Build ticket reference, proving the seam is not Build-specific.

**Migration coverage.** Assert that a channel created against the old deal foreign key is findable by type and id after the backfill, and that no existing entity channel is orphaned.

**Three traps previously hit in this repository.** A transaction mock must invoke its callback, or every assertion inside it silently passes without running. Enumerating handlers by their literal message text misses handlers that branch on a tag — enumerate by the branch, not the string. And a mocked green suite is not proof: the entity-channel route and one unfurl must be exercised against a booted API before this is called done.

## Out of Scope

- Candidates C4 through C7 from the 2026-08-23 verified review. The route registry (C4), the list-view module (C5), the person consolidation (C6) and the config sweep (C7) each stand alone.
- The C1 residue — chat message partitioning, identity primary keys, the reactions column, invite-token hashing and the realtime channel cap. Unrelated to this seam and separately sequenced.
- Extending references to leads, employees, invoices or stock items. This work builds the seam and two adapters; the point is that those become cheap, not that they ship here.
- Mentions. People are referenced through the existing person seam and are deliberately not folded into this one — a person is not a business record and already has its own resolution path.
- Link previews for external URLs. A different problem with a different threat model.
- Rewriting historical message metadata. The snapshot fields are left in place and unread.
- Caching resolved cards. Named as a follow-up with its key requirement stated, not built.
- Any change to the permission keys themselves. The mapping table records what the catalog says today; it does not propose changing it.
- Removing the channel's type/id pair. It stays as a dedupe pointer, which is what the rules permit.
- Calendar's own linked-record columns. Calendar is a candidate consumer of this seam later; its schema is untouched here.

## Further Notes

**Measured, 2026-08-23, at `65d8f3b15` / `0281f6ce`.** The four mechanisms:

| Mechanism | Where | What it can reference |
|---|---|---|
| Channel type/id pair + name resolver | chat channels service and its entity-name utility | 6 types, resolved with **no access check** |
| Channel deal foreign key | chat channel schema, written by CRM | 1 type |
| Message metadata entities | written by the chat actions controller, read by the message bubble | tickets and comments, snapshotted at send |
| Chat actions controller | 4 endpoints | tickets only, by importing Build tables directly |

**The leak is not the scrollback argument.** The 2026-08-20 review named the stale-snapshot problem, which is real. The larger one is the entity-channel route: it is gated on `chat:channels:read`, and the resolver it calls reads titles from `projects`, `clients`, `tickets`, `sprints`, `project_releases` and `project_incidents` with no permission check of any kind. Customer names are reachable by any chat user walking integer ids.

**Why the person seam is the right model and not just a stylistic echo.** It already solved the same four problems: a discriminated result, unresolved-as-a-value, organization re-asserted in the query rather than delegated to row-level security, and cross-tenant surfaced as not-found rather than forbidden. Its docstring in the repository rules states each of those as a rule. Reusing the shape means this seam inherits four decisions that have already been argued.

**No new polymorphic pair is created.** The repository rules ban `entity_type` + `entity_id` for new tables and grandfather existing pairs as display or dedupe pointers only — never the sole path to resolve, join or cascade a record. The chat channel's pair is currently the sole resolution path, which is the rule being broken. This work does not delete the pair; it demotes it to the role the rule already allows.

**Two adapters, deliberately.** One adapter is a hypothetical seam. The Build and CRM adapters are both required on day one, and the CRM one is what forces the interface to be general rather than ticket-shaped.

**The four action endpoints are the behaviour-preservation control.** They already have guard-tier end-to-end specs asserting 401 without a token and 403 without each key. Those specs must pass unchanged. If one needs editing, external behaviour moved and that needs justifying.

**Publication note.** The repository has no configured issue tracker for specs; the four prior PRDs live in `docs/specs/` and this follows them. The triage state is carried by the `Status:` line above.
