# CONTEXT.md — domain language

The words this codebase uses for its own concepts, and what each one means
*here*. A term in this file is the name to use in code, tests, PRDs and review
comments; a synonym is a drift.

> **Coverage:** the Ask OS lane only, as of 2026-09-19. Other domains are not yet
> written down. Add a section rather than a parallel file.

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
