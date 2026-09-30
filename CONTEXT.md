# CONTEXT.md — domain language

The words this codebase uses for its own concepts, and what each one means
*here*. A term in this file is the name to use in code, tests, PRDs and review
comments; a synonym is a drift.

> **Coverage:** the Ask OS lane (2026-09-19), the Documents lane
> (2026-09-26), and the Build lane (2026-10-01). Other domains are not yet
> written down. Add a section rather than a parallel file.

---

## Client relationships

### Client onboarding

The internal checklist that begins when a **Client** relationship is created.
It records the organization’s operational steps for making that Client ready
and preserves completed or removed steps as history.

Client onboarding does not activate a Client, grant portal access, or invite a
portal contact. Those are explicit authorized actions with their own lifecycle.
It is also distinct from **employee onboarding**, which concerns a worker’s
employment relationship rather than a customer relationship.

---

## Ask OS

**Ask OS** is the in-product assistant: one chat surface that can read across
every module the asker has access to, and can *propose* writes that the asker
confirms. It is not a chatbot bolted onto a page — it runs the same permission
resolution, tenant scoping and credit metering as the rest of the API.

### Tool

A single capability the model may invoke — `getMyTickets`, `askHrPolicy`,
`getLeaveUtilization`. Declared with `defineTool` and typed as
`AskOsToolDefinition` (`modules/ai/core/registry/ask-os-tool.types.ts`):

```ts
{ key, description, input, permission?, confirms?, module?, ownsTransaction?, run }
```

`permission` and `confirms` are mutually exclusive, and the type enforces it. A
read-only tool names its own `permission`; a tool that proposes a confirmable
action names the action with `confirms`, and `defineTool` takes the permission
from that action's definition — so the entry gate and the redemption gate can
never drift apart. An unregistered action throws at module load.

`ownsTransaction: true` opts a tool out of the registry's ambient tenant
transaction. Only a tool that makes a provider call needs it, and such a tool
must then open its own transaction around its DB reads — RLS raises `42501`
without the tenant GUC. Holding a pooled connection across a provider round trip
is the thing the opt-out exists to prevent.

`input` is a Zod schema; `run` receives the parsed input and an
`AskOsToolRunContext`. `description` is not documentation — it is prompt text the
model reads to decide whether to call the tool, and it is billed on every turn.

A tool **reads**. A tool that writes does so by proposing a confirmable action
and returning `needs-confirmation`; it never performs the write itself.

### Tool provider

A Nest service exposing `tools(): AskOsToolDefinition[]`. Every provider lives in
`modules/ai/core/tools/`, one file per domain — `hr-copilot-tools.ts`,
`crm-copilot-tools.ts`, `ops-copilot-tools.ts`. A provider file exports **only**
its class; anything two tools share goes in `core/tools/lib/`, never in a tool
file another tool then has to import. `collectToolDefinitions` calls `tools()`
once per provider for the process, so a provider must not vary its tool list by
request.
The provider is where injected services live; the definition is where the
contract lives.

### Toolset

The subset of all tool definitions this *particular* actor may use on this
*particular* turn, assembled by `buildAskOsToolset` and handed to the model. A
tool is filtered out when the actor's resolved scope for its `permission` is
absent or `none`, or when its `module` is not enabled for the org.

The distinction matters: a tool is not "hidden" from the user, it does not exist
for that turn. The model cannot mention a capability it was never told about.

### Outcome

What a tool's `run` returns — the discriminated union `ToolOutcome`, six kinds:

| kind | means |
|---|---|
| `data` | it worked, here is the payload |
| `empty` | it worked, there is nothing to report (`subject`, optional `hint`) |
| `denied` | the actor lacks the permission (`permission`, human `reason`) |
| `needs-connection` | a third-party toolkit is unconnected or needs re-auth |
| `needs-confirmation` | a write is staged and awaits the user (see **proposal**) |
| `failed` | it broke (`reason`) |

The union exists so the *rendering* of each case is decided once, in
`renderOutcome`, rather than by whatever prose each tool author invented.
"Nothing found" and "you may not look" are different answers and must not both
arrive as an empty array — a model handed `[]` will confidently report that the
user has no tickets.

Construct outcomes with the helpers (`data()`, `empty()`, `denied()`,
`needsConnection()`, `needsConfirmation()`, `failed()`), never with an object
literal.

### Confirmable action

A write the assistant may stage but not perform: `calendar.createEvent`,
`ticket.updateStatus`, `email.send`. Declared with `defineConfirmableAction`
(`modules/ai/core/confirm-actions/`), one file per domain behind a barrel.

Each definition owns four things: the `action` key, the `permission` it requires,
the `payload` Zod schema, and an `execute` that receives services resolved from
the Nest container. Its `propose(input)` parses the input against that same
schema and **throws if the schema would drop a field the caller supplied** —
because a dropped field means the card shows the user something the executor will
never receive.

The payload schema is the single contract. The card renders from it, the executor
receives it, and nothing in between may add or lose a field.

### Proposal

The durable row that a confirmable action becomes when it is staged — a record in
the confirmation store carrying the org, the actor, the action key, the payload,
a redemption `token`, a status (`PROPOSED` → `CONFIRMED` / `EXPIRED`) and an
expiry.

A proposal is **the only thing that can be executed**. The model cannot execute;
it can only propose. Re-proposing the same `(org, actor, action, payload)` while
a live proposal exists returns the existing row rather than minting a second one.

Expiry is enforced on the read path: a proposal past its expiry is refused and
stamped `EXPIRED` at the moment someone tries to redeem it. There is no sweep.

### Directive

The message the backend sends the *client* so it can render the confirmation
card — emitted on the stream as a transient `data-askos-directive` part. It
carries the proposal's id, token, action, summary and preview.

A directive is an instruction to the UI, not to the model. The card it produces
is the **only** confirmation channel: a user typing "yes" is not consent, and the
model must never treat it as such. This is stated in the system prompt because
the model has no other way to know it.

### Actor

`AskOsActor` — the resolved person the turn runs as, carrying identity, the
tenant, and timezone-correct calendar facts. Tools take "today" from the actor,
never from `new Date()` in server-local time.

### Credit ledger

Ask OS turns are token-metered. Credits are **reserved before** the paid provider
call and settled after — an under-run is refunded, an overage debited. The ledger
stores integer **milli-credits**; APIs emit fractional credits. Never a flat
per-action charge; `AI_FEATURE_COSTS` are reserve ceilings only.

---

## Adding a module to Ask OS

The shape, so the next one is fast:

1. **Read-only capability** — add a tool provider at
   `core/tools/<module>-copilot-tools.ts` and register it. Each tool declares
   `permission` and `module`; `ctx.read` is a `ScopedRead`
   ([ADR 0005](backend/docs/adr/0005-a-datascope-is-spent-not-read.md)) that
   installs the tenant predicate for you.
2. **Write capability** — add a confirmable action in
   `core/confirm-actions/<module>-confirm-actions.ts`, then a tool that declares
   `confirms: "<action>"` and returns `needsConfirmation(...)`. Do not also
   declare `permission` — it comes from the action.

Two files for a read, four for a write. Shared helpers go in `core/tools/lib/`.

The failure modes to know about: a mistyped `permission` removes the tool from
every toolset silently and forever, and a mistyped `module` key is only safe
because the availability check fails closed. `confirms` is checked at module
load, so a mistyped action id fails at boot rather than at redemption time.
Resolving a person by name goes through `modules/directory/person-seam.ts` —
never by querying a facet table, and never once per name.

---

## Documents

The **Documents** module is the knowledge base. One physical table, `kb_pages`,
carries every kind of document the product has; the sub-modules under
`modules/kb/` divide the work of authoring, reading and retrieving them.

"Knowledge base" and "documents" are the same domain. Prefer **Documents**.

### Document

One row in `kb_pages`. The unit of authorship, access and retrieval.

*Avoid*: **page** and **article** when you mean the row — both are Variants of a
Document, and using either for the general case is what allowed two controllers
to be built over the same table.

### Variant

Which kind of Document a row is, held in `content_type`: `page`, `article`,
`attachment`, `source`, `note`. A Variant changes what the row means to a
reader, not how it is stored or who may see it.

A query that does not name its Variant returns all five. That is almost never
what the caller wants, and it is not a type error.

### Slug · Revision

**Slug** is the URL-stable identifier within an org. **Content revision** and
**ACL revision** are separate monotonic counters on the Document: the first
changes when the body changes, the second when who-may-see-it changes. They are
bumped by the writer, never by a caller, and they are not interchangeable —
retrieval fences on the ACL revision alone.

---

### Standing

Everything the system knows about one actor's reach into Documents, resolved
once per request: `orgId`, `userId`, `membershipId`, `roleSlugs`, `isOrgOwner`,
`isKbAdmin`, `accessibleSpaceIds`, `accessibleProjectIds`, `permissionsVersion`.

A Standing always names a person. There is no anonymous Standing — public
reads take a separate entry point, so serving org-internal Documents to
unauthenticated traffic is unrepresentable rather than merely guarded.

### Space

A container for Documents, and an **access boundary**. A Document inside a Space
requires the actor to reach that Space, whatever its Visibility. A Document with
no Space is reachable on its Visibility alone.

*Avoid*: **collection** and **folder**. A Space is not organisational grouping;
treating it as such is how the boundary was once removed by accident.

### Audience

The Space's own exposure — `public`, `mixed`, `internal`. It gates *anonymous*
reach, where Visibility gates authenticated reach, and the two are ANDed: a
Document that is `visibility = 'public'` inside an `internal` Space is not
publicly readable.

This is the arm most often forgotten, because a Document reads as public on its
own row. Anonymous exposure is never decided by the Document alone.

### Visibility · Accessible

**Visibility** is the column — `private`, `org`, `public`. It is one input.
**Accessible** is the resolved answer for a given Standing, after Space, Grants,
Restrictions and ownership are applied.

These are not synonyms and must never be used as such. A Document may be
`visibility = 'org'` and not accessible.

### Grant · Restriction

A **Grant** widens: an explicit share of one Document to one member or one role,
at `view` / `comment` / `edit` / `manage`, revocable rather than deleted.
A **Restriction** narrows: where Restrictions exist for a Document, the actor
must appear in them.

Grants and Restrictions are separate arms of one rule. The rule lives in exactly
one builder; a second implementation of it is a defect, not a variation.

---

### Commit

The post-write contract for a Document: version snapshot, link resync, mention
diff, revision bumps, audit, and the Index event. Callers name *what changed*;
the module decides what that implies. Every mutating path Commits.

### Index event

The outbox event that makes a Document findable. A Document that is written
without one is invisible to search and to Ask until something later rewrites it
— silently, with no error and no failing test.

### Engagement

A view count, a helpful vote. **Engagement is not a content change**: it must
not bump a revision and must not emit an Index event. Anonymous traffic
generates Engagement constantly; treating it as authorship would re-embed the
corpus on every page view.

---

### Retrieve

One entry point that answers "what is relevant to this question for this
Standing", returning documents, passages, a Degradation and a Strategy. It
embeds the question once.

### Chunk

An embedded fragment of a Document, in `kb_article_chunks`. A Chunk's
visibility is the Document's visibility — expressed as a semi-join to the
canonical scope, never as a second copy of the rule.

### Citation

A Document named in an answer. **Retrieval visibility and Citation visibility
are deliberately different**, and the distinction is load-bearing: what may
inform an answer is not identical to what may be shown as its source. Do not
collapse them to simplify an interface.

### Degraded

A retrieval source failed. Degraded is reported **per source**, because
passages failing while documents succeed is materially different from both
total success and total failure. An empty result with no Degradation means the
corpus is empty; the two must never be conflated.

### Strategy

The retrieval plan for a query — exact below the tenant's chunk threshold, ANN
above it. Always inspectable on the result, never implicit.

---

## Build

The **Build** module is the project-and-ticket delivery surface: it owns
projects, tickets, cycles, automations, client portal projections, and the
integrations that connect delivery work to external systems.

Full architecture contract: [`docs/specs/build/module/07-architecture-integrations-prd.md`](docs/specs/build/module/07-architecture-integrations-prd.md).

### Ticket

The canonical work item. One row in `build.tickets`. Carries type (`BUG`,
`TASK`, `STORY`, `EPIC`), status, priority, assignees, cycle membership,
hierarchy, comments, attachments, and client visibility.

*Avoid*: **issue**, **task**, and **card** as generic synonyms. Use **Ticket**
for the row, the type name for a type-specific context.

A Ticket's status is a foreign-keyed reference to `build.project_statuses`; the
`applyTicketChange` module is the sole path for status transitions and enforces
WIP limits, version CAS, and all downstream effects.

### Cycle

The canonical iteration record. Stored in `build.cycles`, routed at `/cycles`.
The display label (`Sprint`, `Cycle`, or a custom term) is a per-project setting
and never changes the API, storage, permission, or analytics identity.

*Avoid*: **Sprint** as a storage or API term. The `SprintsService` exists but
throws `GoneException` on all verbs — it is a compatibility tombstone, not an
implementation.

### Project

A bounded delivery unit with its own members, settings, ticket workflow,
integrations, and client portal configuration. A Project without a Managed
Product is an organization-level project. There is no PM Workspace layer.

### Build member

An org-level Build role row in `build.build_members`. Distinct from project
membership. Carries a Build role and `added_at`; has no PM Workspace
relationship.

### Portal grant

Authorization for an external client contact to see a declared set of a
Project's deliverables. Stored in `build.project_client_grants`. Status
(`ACTIVE`) and `expires_at` are both enforced on every read and mutation — a
grant past its expiry is refused regardless of its status column.

The `client-portal/` module owns the grant lifecycle. Internal employee preview
uses the same projection implementation after selecting a grant; it is not a
separate projection.

### Automation

A rule that fires after a ticket or project event. Evaluation runs via
`registerAfterCommit` so it never holds the originating transaction. The
`core/automation/` module owns rule storage, run history, and loop guard.
Automation *chooses when* a rule runs; the ticket mutation owner
(`apply-ticket-change.ts`) decides *how* each change executes.

### Webhook delivery

A durable outbox row that carries a typed Build event to a customer HTTP
endpoint. Written inside the originating transaction via `OutboxWriter.emit`.
The outbox consumer drives retries; an HTTP 200 from the dispatch path does not
mean delivered.

### Change request

A governance artifact that records the scope, impact, and approval of a
production change. Follows the lifecycle `DRAFT → SUBMITTED → APPROVED /
REJECTED`. Approved change requests may link affected tickets via
`client-portal/change-request-affected-items.service.ts`.

### Intake

A Form-backed submission from an external source that converts to a Ticket via
the Triage path. Forms owns intake definitions; Triage owns classification,
duplicate detection, and conversion. The generic authenticated Intake routes
are migrating to Forms + Triage (BLD-00 D08).
