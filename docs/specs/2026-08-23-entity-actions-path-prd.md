# PRD — Finish the reference seam: let a record describe its own actions

Status: ready-for-agent
Date: 2026-08-23
Scope: candidate C4 from the re-verified 2026-08-20 architecture review (`architecture-review-20260820-2.html`)
Continues: the entity reference seam PRD (2026-08-23), which built the seam and deliberately froze the four action endpoints as a behaviour-preservation control
Sequenced after: the module registry PRD, which settles which module administers what before actions start asking

## Problem Statement

The entity reference seam shipped and it is the best module in the codebase. Every method takes an actor, so an adapter that cannot check access cannot be written. Resolution is batched. Module entitlement is injected as a port rather than imported. An unknown type or a disabled module yields an unresolved value rather than a leak. Build and CRM both register adapters, which is what makes it a real seam rather than a hypothetical one.

Half of it is unreachable.

The interface has three methods. `resolve` is wired end to end and doing its job. `submitAction` is wired — the four chat action handlers now call it. **`actionsFor` has no caller anywhere in the product.** The method that answers "which actions may this person take on this record" exists on the interface, is implemented by both adapters, is covered by both adapters' unit tests, and is called by nothing.

The consequence is that the question it was built to answer is still answered by hard-coding, in three places at once:

- **The routes are Build-shaped.** The four chat action endpoints are named `ticket-status`, `assign-ticket`, `set-due-date` and `create-task-from-message`, and each is gated on a Build permission key. The seam can resolve a CRM deal into a chat bubble, but there is no route through which anyone can act on one. Adding a deal action means adding a fifth endpoint with a CRM key beside four with Build keys.
- **The gate is in the wrong place, and it only ever narrows wrongly.** Each adapter already authorises the actor inside `submitAction`. The guard-level Build key is a second gate on top of that, and because it names a Build permission it can only ever exclude the modules the seam was built to include.
- **The client hard-codes the same knowledge a third time.** The chat bubble posts to the four literal URLs and imports a bespoke assign dialog and a bespoke due-date dialog. It knows that a ticket has an assignee and that an assignee is a person — facts the seam already models, since an action declares its inputs with a kind of text, date, user or choice.

So the shape that would let a module contribute an action without chat changing exists in the type system and nowhere else. Adding an HR action today means: a fifth endpoint, an HR permission key on it, a fifth hook, and a bespoke dialog. That is the cost the seam was built to remove, still being paid.

For a user this shows up as: chat can show you a deal but cannot do anything with it. For a developer it shows up as a seam that promises extensibility and delivers it for reading only.

## Solution

Wire the half that was built.

**One route replaces four.** A single action endpoint takes a reference, an action identifier and an input object, and hands all three to the seam. It is gated on chat membership — the caller's right to be in this conversation — because the caller's right to perform the action is the adapter's job and the adapter already does it. The four Build-shaped routes are retired.

**A companion route exposes `actionsFor`.** Given a reference, the seam returns the actions this actor may take, each with its label and its declared inputs. The client stops knowing which actions a ticket has.

**The client renders from the description.** An action declares inputs with a kind — text, date, user, choice — and the client renders the appropriate control for each kind. The bespoke assign and due-date dialogs collapse into one generic action form. A new action from any module appears in chat with no client change.

The result is the thing the seam was for: contributing an action becomes writing an adapter method. No chat endpoint, no chat hook, no chat dialog, no new permission key on a chat route.

## Goals

- One action route and one action-discovery route, both generic over reference type.
- `actionsFor` has a production caller, so the interface has no unreachable method.
- Authorization for an action lives in exactly one place — the adapter that owns the record.
- A module can contribute an action to chat without any change to chat.
- The client renders an action's form from its declared inputs rather than from bespoke components.
- The four existing actions behave identically for the people who could already perform them.

## Non-Goals

- Adding new actions. This spec makes actions cheap; it does not ship any.
- Adding an HR adapter or any third adapter. Named as the obvious next step, not built here.
- Changing what `resolve` does. That half is finished and correct.
- Changing any permission key's meaning or who holds it.
- Extending actions to surfaces other than chat.

## User Stories

1. As a user, I want the actions offered on a record in chat to be the ones I can actually perform, so that I do not click something and get refused.
2. As a user, I want to see no actions rather than disabled ones on a record I cannot change, so that the interface does not tease me.
3. As a user, I want an action I take in chat to be announced in the conversation, so that my colleagues see what changed without leaving the thread.
4. As a user, I want acting on a record from chat to feel the same regardless of which product module owns it, so that I do not have to learn two interaction styles.
5. As a user, I want an action form to ask for exactly what the action needs, so that I am not shown irrelevant fields.
6. As a user, I want to pick a person from a picker when an action needs a person, so that I do not have to know an identifier.
7. As a user, I want to pick a date from a date control when an action needs a date, so that I do not type a format.
8. As a user, I want to choose from the valid options when an action has a fixed set, so that I cannot submit something the record will reject.
9. As a user, I want a failed action to tell me whether I was not allowed, the record was gone, or my input was wrong, so that I know whether to retry.
10. As a user in a conversation about a deal, I want to be able to act on that deal eventually, so that chat is as useful for sales as it is for engineering.
11. As an organization owner, I want an action performed from chat to respect the same permissions as the same action performed in its own module, so that chat is not a side door.
12. As an organization owner, I want a member who cannot change a ticket to be unable to change it from chat, so that there is one answer to who can do what.
13. As a module owner, I want the actions my module exposes to be governed by my module's permissions, so that I retain control of my records.
14. As a module owner, I want to add an action for my records without asking the chat team, so that my module's capability is mine to extend.
15. As a developer, I want to contribute an action by implementing an adapter method, so that the cost is proportional to the action.
16. As a developer, I want one action route rather than one per action, so that the API surface does not grow with the feature set.
17. As a developer, I want authorization for an action to be in the adapter, so that there is one place to read and one place to get it wrong.
18. As a developer, I want the client to render an action's form from its declaration, so that adding an action does not mean writing a dialog.
19. As a developer, I want the seam's interface to have no unreachable methods, so that its shape is validated by use rather than by intention.
20. As a coding agent, I want "add an action to chat" to have one obvious implementation site, so that I do not add a fifth endpoint by pattern-matching the four that exist.
21. As a security reviewer, I want a chat action route not to be gated on another module's permission key, so that the gate cannot be both wrong and invisible.
22. As a security reviewer, I want every action to be authorised against the actor by the module that owns the record, so that the check cannot be skipped by reaching a different route.
23. As a security reviewer, I want an action on a record in a disabled module to be refused, so that entitlement is enforced on writes as well as reads.
24. As a QA engineer, I want the four existing actions to have unchanged external behaviour after this work, so that the refactor is provably behaviour-preserving.

## Implementation Decisions

### The route shape

- One action-submission route accepting a reference, an action identifier, an input object, and the conversation the action was taken from.
- One action-discovery route accepting one or more references and returning, per reference, the actions available to this actor with their declared inputs.
- Both gated on the caller's right to be in the conversation. Neither carries a module permission key, because a module permission key on a generic route is necessarily wrong for every module but one.
- The four existing routes are removed, not deprecated. The repository rule is that a moved surface deletes its old route rather than leaving a redirect.

### Where authorization lives

- The adapter authorises. It already does — this work removes the second gate rather than adding a check.
- The seam continues to check module entitlement before dispatching, so an action on a record in a disabled module is refused before the adapter sees it.
- The failure vocabulary already exists on the interface — forbidden, not-found, invalid — and the route maps those to status codes. Cross-tenant and no-permission both surface as not-found where the existing seam's convention says so; the mapping table from the entity reference seam PRD governs.

### The announcement stays

- Successful actions still post a system message into the conversation naming what changed, carrying the reference so the message unfurls. That behaviour is user-visible and must not regress.
- The message text comes from the adapter's result rather than from chat, which is already how it works.

### The client

- One generic action form rendering controls from the declared input kinds: text, date, user, choice. The user kind uses the existing shared person picker rather than a new one.
- The bubble asks the discovery route what a reference offers rather than deciding from the reference's type.
- The bespoke assign and due-date dialogs are deleted once nothing imports them, and the four bespoke hooks collapse to one.
- Actions are fetched per visible reference and batched — the discovery route takes a list for exactly this reason, and fetching per bubble would reintroduce the request-per-record problem the seam's batching was designed to avoid.

### Sequencing

- This work should land after the module registry, because "which module administers this action's permission" becomes a registry question the moment a third module contributes an action.
- It does not depend on the access version channel work and can proceed in parallel with it.

## Testing Decisions

A good test here drives a route and asserts what the caller is allowed to do and what came back. It does not assert that a particular adapter method was invoked, and it does not assert the shape of an internal dispatch map.

**Seam 1 — the existing controller e2e harness, for the guard tier.** The four current action endpoints already have guard-tier specs asserting an unauthenticated 401 and a per-key 403. Those specs are the behaviour-preservation control named by the entity reference seam PRD, and this work is precisely the change that will move them, so the move must be justified case by case:

- The new route refuses an unauthenticated caller.
- The new route refuses a caller who is not a member of the conversation.
- The new route does **not** refuse a caller lacking a Build permission when the reference is not a Build record — this is the assertion that proves the wrong gate is gone.
- A caller lacking the owning module's permission is still refused, now by the adapter rather than the guard, and the refusal is indistinguishable from outside.
- An action against a disabled module is refused.

Note that the harness stubs the access, entitlement and membership services, so it proves authorization *outcomes* and not authorization *sources*. The adapter-level checks need their own coverage below.

**Seam 2 — the adapter interface.** Both adapters already have unit specs covering `actionsFor` and `submitAction`, including the actor-scoped cases. Extend them rather than adding a parallel suite:

- `actionsFor` returns nothing for an actor who may not act, and the corresponding action list is empty rather than absent.
- `submitAction` refuses an action the same actor's `actionsFor` did not offer — the two must not disagree, and a test that asserts they agree is the one that keeps the discovery route honest.
- A reference from another organization is not-found, not forbidden.

**Seam 3 — the seam service.** Its existing spec covers dispatch and entitlement. Add that a reference whose type has no adapter yields the empty action list rather than an error, matching how `resolve` already treats an unknown type.

Prior art: the Build and CRM adapter specs, the entity reference service spec, and the chat controller e2e specs. Two traps recorded in this repository apply directly — a bare transaction mock never invokes its callback and silently voids every assertion inside it, and `e2e-spec` files run only under the e2e script and are excluded from the default suite.

Per the standing instruction, tests are reported as not run unless explicitly requested.

## Out of Scope

- Any new action, for any module.
- The HR adapter, and adapters for leads, invoices or stock items. The point of this work is that they become cheap.
- Other consumers of the seam — knowledge base, notifications, calendar. Chat remains the only consumer here.
- Caching resolved cards or action lists, which the entity reference seam PRD already names as a follow-up with its key requirement stated.
- Rewriting historical message metadata.
- The channel type/id dedupe pointer, which stays as the rules permit.
- Mentions, which go through the person seam and are deliberately separate.

## Further Notes

**This is not a correction of the previous spec.** The entity reference seam PRD deliberately froze the four action endpoints as its behaviour-preservation control, and that was the right call — changing the resolution path and the action surface in one step would have left nothing stable to test against. This spec is the follow-up that boundary implied. The re-verified architecture review recorded the frozen state as a live finding without noticing it was a deliberate scope line; that framing is corrected here.

**The unreachable method is the strongest signal in the codebase for this work.** An interface method with no production caller is normally dead code. Here it is the opposite — it is the part of the design that was right and has not been connected yet. The test that `actionsFor` and `submitAction` cannot disagree is what turns it from an intention into a contract.

**One consumer and two adapters is not yet a proven seam.** The interface's shape has been validated against two modules but only one caller. The second consumer — knowledge base or notifications — is what will actually test whether the shape generalises, and it should be attempted before the interface is treated as settled.

**Publication note.** The repository has no configured issue tracker; specs live in `docs/specs/` and carry their triage state on the `Status:` line, following the five PRDs already there.
