# 08d — The six fields the client sends and the server drops: honoured or removed

Follow-up to `reports/08c-unread-request-fields.md` §5, which found the residue of ticket 08 box 4
is not dead weight but *unimplemented intent*, and routed six fields to their owning lanes rather
than deleting them. This pass took all six. **Two were honoured, four were removed.** Every
decision is stated with its reason and every fix is bite-proved in both directions.

Nothing here is CRM or inventory. Every number below names its command and exit code.

---

## Verdicts

| field | verdict | why |
|---|---|---|
| `createPortalTicketSchema.attachments` | **HONOUR** | the portal sheet uploads files and sends them; the sibling reply path already persists them |
| `simulateApprovalRoutingSchema.employeeId` | **HONOUR** | required, sent, and a real resolver already exists — the answer is meaningless without it |
| `policyPreviewSchema.currency` | **REMOVE** | the preview computes nothing in a currency; the one currency in the response belongs to the country's statutory pack |
| `sectionQuerySchema.preview` | **REMOVE** | no preview mode exists and, contrary to 08c, **no component ever sends it** |
| `attachmentSchema.fileKey` | **REMOVE** | no column, and the one caller sends the storage key in `fileUrl` |
| `kbAskSchema.articleId` | **REMOVE** | article-scoped ask already exists as `POST /kb/articles/:articleId/ai/ask`, with the id in the path |

---

## P1 — support portal attachments were lost on the first message

`POST /support/portal/tickets` accepts `attachments`; `new-ticket-sheet.tsx` uploads each file to
`/storage/upload` and sends `{fileName, fileUrl, fileSize, mimeType}`;
`SupportPortalService.createTicket` picked `title, category, description, customFields` and dropped
the rest. Attaching to a *reply* worked — `addMessage` forwards them — and attaching to the *first*
message silently did not. **Confirmed by reading both handlers; 08c is exactly right here.**

### Why not simply call the reply path

`support_ticket_attachments.message_id` is `NOT NULL` with a composite FK to
`support_ticket_messages`, so an attachment cannot hang off a ticket. The obvious fix — have the
portal call `this.tickets.addMessage(...)` after creating the ticket — is **wrong**, and this is
the part worth recording: `addMessage` flips `OPEN -> IN_PROGRESS`, stamps a `replied` activity,
fires `ticket.message_received` automations and sends a reply email. A brand-new ticket would
appear as already in progress with no agent having touched it.

The fix instead writes the opening message and its attachment rows **inside the ticket's own
transaction**, into the same two tables the reply path uses, with none of the reply's side
effects. The opening message's body is the ticket description, which is what every other channel
already treats as the first message (`support-channels.service.ts` stores an inbound email's
`bodyText` in `description` and creates no message row).

`createTicket`'s input type is widened locally (`CreateTicketInput & { attachments?:
TicketAttachmentInput[] }`) rather than by adding `attachments` to the agent-facing
`createTicketSchema` — widening the public contract for a field no client sends would have created
a fresh instance of the very defect being fixed. **No OpenAPI change: the field was already in the
contract.**

Frontend: `portal-ticket-detail-page.tsx` renders `ticket.description` in its own block *and* the
message thread, so a ticket that now carries an opening message would have shown its description
twice. The standalone block is suppressed when the first message reproduces it. Two lines; a
ticket with no opening message (every ticket created before this change, and every email/chat one)
renders exactly as before.

### Proof

`src/modules/support/core/support-portal-attachment-persistence.spec.ts` drives the real
`SupportPortalService` -> real `SupportTicketsService` -> real `SupportTicketMessagesService`
against a recording double that keeps one array per table and answers the portal read path from
those arrays. It asserts **both** halves the brief asks for: the rows the service actually wrote
(org, message id, file name, url, size, mime) **and** what `getMyTicket` returns
(`messages[0].attachments` carries both files with their urls). A third case pins that a portal
ticket sent without attachments still writes no message at all.

**Bite, hermetic tree (`git archive HEAD src test`, shared tree never mutated):**

| tree | command | exit | result |
|---|---|---|---|
| with fix | `jest --runInBand --testPathPattern=support-portal-attachment-persistence` | **0** | 3 passed |
| defect A — portal service stops forwarding `attachments` (the head defect) | same | **1** | 2 failed, 1 passed |
| defect B — forwarding restored, persistence block deleted from `createTicket` | same | **1** | 2 failed, 1 passed |

Both seams bite independently.

---

## P2a — the approval simulator did not simulate for the employee it was asked about

**What it simulated for, established before choosing a fix.** `simulateApprovalRouting` ran one raw
SQL join and returned every step of **every `status = 'active'` workflow definition for that object
type**, flattened and ordered by `step_order`, with no employee dimension anywhere. `employeeId` —
required, and sent by the UI — was never referenced. Three further divergences from what the engine
actually does, none of them named in 08c:

1. It ignores `is_default`. `HrWorkflowEngineService.startWorkflow` selects
   `active AND is_default AND deleted_at IS NULL LIMIT 1`, so the simulator could describe a
   workflow that would never run.
2. It ignores `deleted_at`, so a soft-deleted definition still appears.
3. With two active definitions it **interleaves their steps into one list** belonging to no single
   workflow.

And it never resolved an approver at all: it returned `approverType: "direct_manager"` as the
answer. The UI's own panel is labelled **"Which approvers WOULD be notified"** and its button reads
**"Resolve Approvers"** — the endpoint answered neither question, for the wrong subject.

**HONOUR.** `HrWorkflowApproverService.resolveApprovers(step, subjectEmployeeId, orgId)` already
exists and is what the live engine uses; four of the eight approver types (`direct_manager`,
`managers_manager`, `department_head`, `location_hr`) are per-employee by construction. The
simulator now picks the definition the engine picks, resolves each step through that same service
for the requested employee, and returns approver ids with names. It also reports `unresolvedSteps`
rather than implying a step with no approver needs none, 404s an employee outside the caller's org
(never 403), and returns `matchedWorkflow: null` for an `objectType` outside the workflow enum
instead of failing the enum comparison — the UI's own placeholder suggests `expense`, which is not
an enum member, so that path was reachable.

DI: `HrWorkflowApproverService` exported from `HrWorkflowsModule`, which `HrEnterpriseOpsModule`
now imports. `check:module-di` exit **0**; `madge --circular` exit **0**, no cycle.

**Bite:** the new spec (`simulator-approval-routing.spec.ts`, 5 cases) run against the **HEAD**
service in a hermetic tree — **exit 1, 5 of 5 failed**. Against the fix — **exit 0, 5 passed**. One
case exists purely to pin the defect's shape: the same workflow simulated for two different
employees must return two different approver sets.

---

## P2b — the four removals, as one contract change

### `policyPreviewSchema.currency` — REMOVE

`step-review.tsx` does send it (08c is right), and `preview()` ignores it. But honouring it has
nowhere to go: the preview returns toggles, template components, an approval chain, a calendar plan
and a statutory pack, and **not one of them is computed in a currency**. The only `currency` in the
response is `statutoryPack.currency`, which is the *country's* statutory currency — India's PF
ceiling is INR-denominated whatever an org pays out in — so echoing a user-chosen display currency
into it would make the response say something false. The wizard already formats amounts with
`draft.profile.currency`, which is where a display currency belongs, and the policy's real currency
is persisted through `createPolicySchema` / `updatePolicySchema`, which are untouched.

Because the schema is `.strict()`, leaving the frontend sending it would have turned every preview
call into a 400. The send is removed in the same change; the display line is not.

### `sectionQuerySchema.preview` — REMOVE (and one 08c claim corrected)

08c states "`payroll-inputs.ts:172` sends `preview: "true"`". **That is an overstatement.** Line 172
is a conditional inside `makeSectionHook`, `...(params?.preview && { preview: "true" })`, and the
four call sites in `inputs-section-tabs.tsx` pass only `{cursor, limit}`. Nothing in the frontend
sets `preview`. The field is speculative on both sides — the handler reads
`hr_payroll_input_snapshots`, which only exists after a period is built, so a "preview" would be a
whole unbuilt feature. Removed from the schema and from the dead hook branch.

The schema is shared by five routes, so the OpenAPI diff shows five changed operations plus
`.../adjustments`.

### `attachmentSchema.fileKey` — REMOVE (and a second 08c claim corrected)

08c states "`ticket-sub-resources.ts:127` sends `fileKey`". The **hook** forwards it; the only
caller, `use-create-ticket-form.ts`, never sets it — it uploads to `/storage/upload` and sends
`fileUrl: result.key`. So `fileKey` is always `undefined` and `JSON.stringify` drops it. Meanwhile
`build.ticket_attachments` has **no `file_key` column**: build and support both store the storage
key in `fileUrl`. The field is borrowed from chat, which does keep `fileUrl` and `fileKey` apart.
Honouring it would mean a migration for a distinction this module does not make. Removed from the
schema and from the frontend hook's input type and request body.

### `kbAskSchema.articleId` — REMOVE

`POST /support/kb/ask` calls `ask.ask(u, { question })` and drops `articleId`. But the
article-scoped ask **already exists**: `POST /kb/articles/:articleId/ai/ask`
(`KbArticleAiController` -> `KbArticleAiService.run`), which asserts visibility on that one article
and builds the prompt from its content. Nothing in the frontend calls `/support/kb/ask` at all —
the KB panels call `/kb/ask`, whose `askSchema` has no `articleId`. So the field is a second,
unimplemented way to express something that already has a route with a better shape (the id in the
path, per this repo's own route-param rule). Removed.

### The removal actually bites

All four schemas are `.strict()`, so each field is now **rejected**, not silently stripped — the
distinction AGENT-BRIEF rule 9 is about. `src/test/removed-speculative-request-fields.spec.ts`
pins that for all four (valid payload accepted, payload + removed key rejected, with the field name
in the issue). Run against **HEAD** schemas in a hermetic tree: **exit 1, 4 of 4 failed**. Against
the fix: **exit 0, 4 passed**.

### OpenAPI

`pnpm openapi:generate` exit **0** — 3,642 operations. Artifact diff computed structurally, not by
line count: **8 operations changed** (`POST /build/{projectId}/tickets/{ticketId}/attachments`,
`POST /payroll/policies/preview`, `POST /support/kb/ask`, and the five
`GET /hr/payroll-inputs/periods/{periodId}/*` that share `sectionQuerySchema`), **0 paths added**,
**1 path removed** — `GET /settings/permissions`, which is **not mine**: it comes from commit
`8634cba3` (settings lane) and had left the artifact stale, exactly as 08c §7 predicted. Said so in
the commit message rather than filing it silently. Verified in the artifact after regeneration:
build attachments body is `[fileName, fileSize, fileUrl, mimeType]`, preview body is
`[country, payDay, startMonth, templateId, templateKey, toggleOverrides]`, kb ask body is
`[question]`, payroll-inputs params are `[cursor, limit, periodId]`. Vendored copy re-synced,
sha256 `e40a4459af291082…` on both sides.

---

## Gates — command, exit code, number

| command | exit | number |
|---|---|---|
| BE `pnpm typecheck` | **0** | 0 errors (run three times across the three commits) |
| BE `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| BE `pnpm openapi:generate` | **0** | 3,642 operations, 3,099 with a zod contract, 0 undeclared |
| BE `pnpm openapi:check` (before my regen) | **1** | 9 stale operations — 8 mine, 1 the settings lane's |
| BE `pnpm openapi:check` (after) | **0** | artifact current — 3,642 operations |
| BE `pnpm check:contract-registry` | **0** | 3,656 classified (102 published / 3,554 internal) |
| BE `pnpm check:contract-breaking-change` | **0** | no breaking changes |
| BE `pnpm check:route-classification` | **0** | — |
| BE `pnpm check:module-di` | **0** | 218 modules · 1,714 classes · 0 violations |
| BE `madge --circular --extensions ts src` | **0** | 5,618 files, no circular dependency |
| BE `jest --testPathPattern="(payroll/setup\|payroll-inputs\|build/core\|support/core\|kb/retrieval\|removed-speculative)"` | **0** | 137 suites, 924 tests |
| BE `jest --testPathPattern="(support-portal\|simulator\|removed-speculative)"` | **0** | 6 suites, 24 tests |
| FE `pnpm type-check` | **0** | 0 errors |
| FE `check:contract-vendor` | **0** | sha256 `e40a4459…` both sides |
| FE `check:contract-drift` | **0** | no new drift |
| FE `check:response-contracts` | **0** | 69/2,665 parsed, at baseline |
| FE `jest --testPathPattern="(payroll\|contract\|response-contracts\|ticket)"` | **0** | 30 suites, 375 tests |
| bite — P1 with fix / defect A / defect B | **0 / 1 / 1** | 3 passed / 2 failed / 2 failed |
| bite — simulator spec vs HEAD service | **1** | 5 of 5 failed |
| bite — removal spec vs HEAD schemas | **1** | 4 of 4 failed |

Every jest run was `--runInBand` through `heavy.sh` with an explicit `--testPathPattern`.

---

## Found, not fixed — cross-territory

**The payroll setup review step renders every salary component's amount as "—".** Not a request
field; a response-shape cast, and the exact defect class AGENT-BRIEF rule 11 describes.
`PolicyQueryService.preview` returns `components: TemplateComponentDef[]` — `{code, name, type,
calcMethod, amount?, percent?, formula?, …}`. The frontend declares the same field as
`PreviewLine[]` — `{code, name, type, calcMethod, monthlyAmount: string, explain: string}` — and
`step-review.tsx` renders `formatMoney(line.monthlyAmount, currency)`. **`monthlyAmount` and
`explain` are never emitted by that endpoint**, so `formatMoney(undefined)` returns `"—"` for every
line of the wizard's final review screen. Both repos typecheck clean because
`apiClient.post<PolicyPreviewResult>` is a cast. The shape the frontend expects is real and lives
next door: `computeTemplatePreview` in `payroll/setup/lib/template-preview.ts` produces exactly
`PreviewLine`, and the *template* preview sheet uses it correctly. The policy preview never calls
it. **Payroll lane**: either have `preview()` run `computeTemplatePreview` against an assumed CTC,
or narrow the frontend type to what is actually returned and stop rendering an amount column.

**Nine of the 35 unbound routes from 08c type their `@Body()` as `unknown` or
`Record<string, unknown>`.** Unchanged by this pass and still the standing blocker on ticket 08
box 4. The cheap ratchet 08c proposes — assert every `@Validate({body: S})` route types its
`@Body()` as `z.infer<typeof S>`, already true for 1,900 of 1,941 — remains unowned.

**`openapi.json` still has no owner.** It was stale at head for a second time this release, for the
same reason: a route change landed without regenerating. `openapi:check` is green as of my last
commit and will go red again the next time any lane changes a route.

---

## Honest gaps

- **No database was touched.** No `psql`, no seeded run, no e2e. Every proof is a unit-level drive
  of the real services against doubles, plus the compiler and the contract gates. The P1 spec
  asserts the rows the service writes and what the read path returns, but a real
  `support_ticket_attachments` insert against Postgres was **not run** — the composite FK
  `(org_id, message_id)` is satisfied by construction here because the message is inserted in the
  same transaction, but that is an argument, not a measurement.
- **The simulator's approver resolution was not exercised against real employment data.** The spec
  doubles `HrWorkflowApproverService`; the service itself is unchanged and already covered by the
  workflow engine's own specs. What is proved is that the simulator now asks it, for the right
  subject, and reports what it answers.
- **Lint: not run**, either repo.
- **`pnpm test` full suites: not run**, either repo — focused patterns only, per the brief.
- **The frontend portal detail change was not viewed in a browser.** It is a two-line render
  condition; no screenshot was taken.
