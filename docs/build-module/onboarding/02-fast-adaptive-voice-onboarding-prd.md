# Fast, adaptive, voice-assisted onboarding

Status: Proposed product and architecture contract, 2026-10-12. No implementation or runtime verification is claimed.

Decision owner: Product, Platform/Identity, Design, AI, Billing, and owners of every selectable module.

Canonical context: [Signup and multi-module onboarding](./01-signup-and-multi-module-onboarding.md), [current source gap](../audit/onboarding-current-state-gap.md), and [Build architecture](../architecture/07-architecture-data-api-cache-ai.md). This document sharpens the launch journey, voice, performance, preview, and extension gates. Existing role, entitlement, invitation, and module command ownership remain authoritative.

## 1. Outcome and release measures

An authenticated new owner reaches an honest, useful workspace quickly, can see exactly what will be created before Launch, and can resume at the same screen with the same answers after refresh, sign-in, or switching devices. The same journey handles one or many selected modules. Voice is an optional input mode; all work is possible with keyboard and touch when the provider, microphone, or network is unavailable.

Initial service targets to validate against a production-like environment (not current measurements): p75 time from first onboarding render to launch under 3 minutes for one module and under 5 minutes for three modules; p95 bootstrap under 1.5 seconds, draft acknowledgement under 500 ms, deterministic preview under 800 ms, and 99.9% successful exact-step recovery after an acknowledged save. Track p50/p75/p95 by device, network, module count, and voice/text path. Do not meet these targets by hiding a failed save or claiming activation complete before durable status says so.

## 2. Two-screen default journey

Authentication is outside the counted flow. The default journey is **Workspace → Configure & preview → Launch**. `Invite people` is an optional panel on the second screen or a post-launch action. There is no welcome screen and no empty People step. A progress indicator shows two stages, and a compact persistent preview is available from both stages.

| Screen | Required customer action | Optional detail | Continue gate |
|---|---|---|---|
| Workspace | Confirm workspace name, country/region, work style | Team size and industry only when a selected module truly needs them; inferred values are shown for correction | Valid common answers saved to server |
| Configure & preview | Select one or more modules; answer at most two high-value blocking questions across the selection; review the creation/plan/access summary | Template, additional module answers, custom fields, internal invitations, client grants, sample data | Fresh server validation and preview; explicit acknowledgement of material price/access changes |
| Launch | One deliberate action | Activation progress and first-use guidance | Idempotent durable activation run |

The five-visible-input budget of the canonical spec still applies before launch for a Build-only owner. A customer selecting many modules does **not** receive a long compulsory questionnaire. The product displays at most two shared/blocking questions, chosen by dependencies and irreversible consequences, and puts all other answers in `Customize` and post-launch checklists. A required legal or financial fact cannot be guessed: defer the affected regulated feature until that fact is supplied, while permitting safe modules to launch. Show the exact deferred capability in the preview.

The question set is driven by selected module contract versions and a deterministic server policy. Selection or answer changes recompute only the affected question and preview sections. Deselection hides questions and excludes answers from activation while retaining bounded draft values for re-selection. The shell never hardcodes module business rules. Every selectable catalog module must have a versioned adapter with either a meaningful starter answer or an explicit `no question needed` contract; an unavailable adapter yields a clear module-unavailable state, never a silent generic setup.

## 3. Preview that earns trust

The second screen has a live, responsive `Your workspace` preview: left-side form and right-side preview on desktop, full-width preview drawer on mobile. It has three tabs: **Experience** (sidebar and first destination), **What will be created** (modules, template version, project/pipeline/other starter records, sample-data choice, deferred checklist), and **Access & plan** (available/locked modules, dependencies, seats, invitation roles and grants, pricing or trial effects). The preview uses real product labels and a representative layout but is clearly marked as a preview. It never displays fabricated live records.

A fast local projection can update labels instantly from validated draft values. Server preview is authoritative for entitlement, quotas, dependencies, grants, creation counts, and launch eligibility. The UI marks these as `Updating` until the server response for the latest draft revision arrives. Stale or failed preview never enables Launch. Preview responses include a revision, policy/contract versions, expiry, and a plan hash. Activation repeats authoritative checks and requires the accepted revision/hash. If the plan changes, show a focused diff and ask the customer to review again. Never silently activate a new paid selection or broader access.

## 4. Voice input contract

Show `Speak your setup` only when a server capability response confirms the onboarding voice feature, a configured provider, allowed policy/plan, and an eligible client. Browser microphone permission is requested only after a click. The dedicated onboarding voice path may reuse the existing transcription provider implementation; the current Companion voice endpoints require an organization and AI Chat permission, so they cannot simply be called for a pre-organization setup.

Voice captures short turns (for example: “Northstar Studio, India, we build software for clients; enable Build and Timesheets”). The server transcribes, then parses against **only** the current, versioned question schema. It returns a proposed patch with confidence/ambiguity and an evidence span per field. The customer reviews and edits the visible transcript and proposed answers before `Apply`; nothing writes to the draft or activates a module on a speech model's authority alone. A changed selection recomputes questions and requires confirmation of newly proposed answers. Do not ask the model for secrets, payment details, tax IDs, employee personal records, or client contact details; collect sensitive fields with explicit structured controls later.

Use a bounded audio size/duration, MIME allowlist, authentication, identity-scoped rate and cost limits, cancellation, short timeout, and temporary processing. Do not persist raw audio or full transcripts by default; retain only confirmed structured answers and minimal redacted diagnostics. Disclose provider processing before recording. Stop/clear recording on navigation and permission revocation. Handle silence, accents/languages, low confidence, duplicated utterances, interruption, tab backgrounding, malformed provider output, and provider outage by keeping the text controls ready. Voice availability is never part of the core activation dependency.

## 5. Exact resume and save semantics

The server-owned identity-scoped draft is the authority for `currentStep`, selected modules, answers, contract/schema versions, revision, preview status, and optional invite drafts. The URL may carry `?step=workspace|configure` for history/deep link but no answers or personal data. On load, one bootstrap request returns the draft and catalog/policy snapshot; the server step wins over URL when URL is ahead of validated progress. Completed activation redirects to the durable destination, and an in-progress activation returns to its run screen.

Edit state updates immediately in memory. Autosave coalesces changes after a short idle interval or blur, and **awaits an acknowledged save before step navigation and Launch**. `Saving`, `Saved`, `Offline copy`, and `Needs review` reflect actual status. A failed save keeps the user on the current screen with their local changes. A bounded local copy is keyed to authenticated identity/session and encrypted only if the platform already has a safe mechanism; it is a recovery buffer, never entitlement truth. Do not cache sensitive answers locally.

Each save carries `expectedRevision`, schema version, current step, and a bounded patch. The server performs one compare-and-swap transaction and returns canonical answers and the next revision. A 409 loads the current server draft and offers field-level merge for disjoint changes; overlapping changes require a visible choice. `pagehide`/visibility events can trigger best-effort flushing but cannot be the sole persistence guarantee. On refresh, never flash an initial step before bootstrap resolves. A user opening two tabs, changing account, accepting an invitation, or returning after draft expiry gets a defined conflict/recovery screen, not silent overwrite or a redirect loop.

## 6. Platform API and data plan

Reuse and evolve the existing `GET /org/setup/draft`, `PUT /org/setup/draft`, `POST /org/setup/selection/preview`, `POST /org/setup/activate`, `GET /org/setup/status`, and setup tables. Avoid a parallel second source of truth. The current frontend calls `GET /org/setup/session` but does not use the existing draft write path; integrate it before replacing contracts. Evolve the draft payload from an opaque `stepData` blob into a strict, versioned schema with explicit step and changed-section semantics. Return the actual new revision from writes. If backward compatibility is needed, version the route or envelope rather than silently changing response shape. Keep the existing activation-run/idempotency path and reconcile its states with the proposed run response before adding stages.

Bootstrap should return one coherent snapshot: draft/revision, catalog with module contract versions, plan eligibility, minimal question descriptors, voice capability, and allowed next steps. Optional heavy template previews load on demand. An HTTP cache may hold public, versioned module descriptors; user draft and entitlement data are private and must be fetched or validated with actor and policy revision. A short-lived private preview cache can key identity, target org intent, draft revision/hash, contract versions, plan/access revision, and locale. Invalidate on plan, module, role, or draft changes. Activation always rechecks source-of-truth authorization and limits.

Persist bounded JSON for pre-organization answers with identity ownership, strict validation, expiration, and cleanup. Keep module-owned final records in their modules; the coordinator stores only selections, versions, run status, aliases, and immutable plan metadata. Add indexes for owner/active draft and run/idempotency lookups after query-plan measurement. Keep organization creation, owner membership, entitlements, and outbox intent in one transaction. Run module initialization as idempotent, resumable stages through existing command owners. Send invitations only after commit; never hold a DB transaction while calling OpenAI, email, billing, or connectors. All retries return the same run or a safe recoverable state. Do not create duplicate organizations or starter records.

## 7. Module extension contract

Each module supplies `moduleKey`, contract version, display metadata, eligibility/dependencies, a finite typed question list, default provenance, sensitive/irreversible flags, template choices, validation, read-only preview contribution, idempotent activation command, and post-launch checklist. The shell renders a closed control registry. Contract tests enforce stable question keys, version migration, max blocking-question budget, bounded preview, permission checks, and deterministic result. A new module appears in the catalog only after the adapter, plan policy, preview, activation, rollback/retry, and browser acceptance gates pass. Unsupported fields or older drafts route to a review screen with preserved answers.

Module owners decide their records and initial useful state. Shared questions such as country, work style, client work, and approval style are collected once and mapped through declared adapter inputs. The orchestrator does not write Build/CRM/HR/etc. tables directly. Cross-module dependencies are explicit and previewed; billing, internal membership, and external client portal grants remain separate authorities.

## 8. Failure and edge-case matrix

| Case | Required experience and server behavior |
|---|---|
| Refresh, browser Back, device switch | Restore exact last acknowledged step and answers; restore pending activation run when applicable |
| Offline before save / provider outage | Preserve visible edits locally, block Launch until authoritative save/preview; text input stays usable |
| Two tabs or stale draft | Revision conflict, disjoint merge or explicit choice; no last-write-wins overwrite |
| Plan or quota changes after preview | Activation refuses stale plan, shows changed terms and keeps answers |
| Module removed or schema upgraded | Preserve draft, show compatible migration or focused review; no invalid activation |
| One selected module fails activation | Durable stage result; retry only failed idempotent stage, show usable/deferred surfaces honestly |
| Double click or response timeout | Same idempotency key/run; status lookup resolves uncertain outcome |
| Wrong identity, target org, or role | Server denies reads/writes; client clears local mirror on account change |
| Invite limit, duplicate address, client/internal confusion | Preflight and server validation; no accidental internal client membership |
| Voice ambiguity, permission denial, timeout, cost limit | Show editable text and manual controls; no silent accepted answer |
| Long labels, mobile keyboard, assistive tech, reduced motion | Responsive preview, keyboard order, live save/status announcements, motion-safe transitions |
| Expired or abandoned draft | Explain expiry, offer safe restart/import of still-valid local fields, never resurrect permissions |

## 9. Delivery sequence and evidence gates

1. **Baseline and contracts:** Record current journeys and timings; reconcile existing draft/preview/activation endpoints with the canonical spec; define strict schema and migration compatibility. No UI claim yet.
2. **Core two-screen flow:** Remove welcome/empty People screen, render all selectable modules through adapters, apply two-question budget, server save/resume, and text-only preview. Prove one- and multi-module flows.
3. **Activation reliability:** Fresh policy check, immutable plan hash, idempotent run, crash/replay recovery, exact status and destination, first useful state per selected module.
4. **Voice:** Add a pre-org capability and bounded transcription/structured proposal path. Release behind a flag after privacy, rate, cost, and outage tests. Text path remains the launch baseline.
5. **Performance:** Measure actual p50/p75/p95; profile bootstrap/preview DB queries, batch related reads, remove duplicate fetches, add only version-safe caches supported by invalidation evidence.

Acceptance needs focused contract and negative tests, disposable database transaction/replay and query-plan tests, and desktop/mobile browser journeys at 375/768/1280 widths. Exercise refresh at every step, cross-device resume, two-tab conflicts, voice on/off, provider outage, slow network, plan changes, every selectable module alone and representative multi-module combinations, access boundaries, invitation distinctions, and activation retry. A source or route test alone does not certify the customer journey. Record deployment identity and measured timings before marking release verified.

## 10. Default product decisions

These defaults make the plan implementable. Product may amend them before implementation starts.

1. Create one useful starter record for every selected module only when it is safe, reversible, and idempotent. Accounting, Payroll, HR compliance, Sign, and other regulated or consequential configuration starts with a checklist and no fabricated legal data.
2. Keep plan-locked modules visible but unselected. Selecting one opens an explicit upgrade path. The module is never activated, previewed as active, or stored as a dormant entitlement without a successful commercial decision.
3. Retain non-sensitive unactivated drafts for 30 days after the last save. Do not persist raw audio or voice transcripts by default. Confirmed structured answers follow the draft's retention policy.
4. Launch voice in English first while accepting common regional accents. The architecture must support locale expansion without changing question keys or saved-answer contracts. Text remains available for every supported product locale.
5. Defer custom-field creation to post-launch module setup until each module has safe preview, validation, idempotency, and rollback behavior.
6. Choose the primary module from explicit entry context or customer choice. Never infer it from array order. Build-led entry selects Build by default but allows deselection.
7. Universal surfaces such as Home, Chat, and Knowledge are described as included platform capabilities. They are not shown as paid customer selections.

The implementation work packages and per-module launch behavior are specified in [Implementation plan and acceptance map](./03-fast-onboarding-implementation-plan.md).

