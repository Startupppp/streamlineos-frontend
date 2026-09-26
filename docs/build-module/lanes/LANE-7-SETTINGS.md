# Lane 7 — Project & organization settings

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1270–1274**. Status file: `status/LANE-7-STATUS.md`. Requests: `requests/LANE-7.md`.

You have the most specs (15) and the smallest pages. Many criteria will resolve identically across
your set — still record evidence **per spec**, per criterion. A shared evidence line copied into
fifteen files without re-measuring is the reporting defect this programme has already shipped.

## Your page specs (15 — 105 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-project-settings.md` | `/build/[projectId]/settings` |
| `docs/build-module/10-project-settings-access.md` | `…/settings/access` |
| `docs/build-module/10-project-settings-agents.md` | `…/settings/agents` |
| `docs/build-module/10-project-settings-agents-credentials.md` | `…/settings/agents/credentials` |
| `docs/build-module/10-project-settings-automations.md` | `…/settings/automations` |
| `docs/build-module/10-project-settings-fields.md` | `…/settings/fields` |
| `docs/build-module/10-project-settings-integrations.md` | `…/settings/integrations` |
| `docs/build-module/10-project-settings-integrations-webhooks.md` | `…/settings/integrations/webhooks` |
| `docs/build-module/10-project-settings-iterations.md` | `…/settings/iterations` |
| `docs/build-module/10-project-settings-portal.md` | `…/settings/portal` |
| `docs/build-module/10-project-settings-retention.md` | `…/settings/retention` |
| `docs/build-module/10-project-settings-views.md` | `…/settings/views` |
| `docs/build-module/10-project-settings-workflow.md` | `…/settings/workflow` |
| `docs/build-module/10-settings-access.md` | `/build/settings/access` |
| `docs/build-module/10-settings-integrations.md` | `/build/settings/integrations` |

## Territory

**Frontend features:** `frontend/features/build/{settings,automations,webhooks,workflow,ai,members,agent-pulse}/**`

**Frontend routes:** `frontend/app/(authenticated)/build/[projectId]/settings/**`, `frontend/app/(authenticated)/build/settings/{access,integrations}/**`

> `frontend/app/(authenticated)/build/settings/client-access/**` is **Lane 5's**. Do not touch it.

**Frontend hooks:** `frontend/hooks/api/build/{automations,webhooks,workflow,workflow-schema,custom-fields,agent-pulse,agent-pulse.test,agent-pulse-schema,agent-tokens,agent-tokens-schema,ai,ai-schema,build-revocation-guard.test}.*`

**Backend:** `backend/src/modules/build/{workflow,agent-pulse}/**`, and in `backend/src/modules/build/core/`: `projects-automations.*`, `build-automation-actions.service.ts`, `build-automation-run-history.service.ts`, `build-automation-runner*.ts`, `projects-webhooks.*`, `projects-webhooks-dispatch.service.ts`, `build-app-paths.ts`, plus each file's `*.spec.ts`.

## Lane-specific hazards, measured

- **Permission and module-gate sequencing is the defining hazard of your lane.**
  - `useCan()` alone is **not** a module gate.
  - `access:*` module keys are **generated** — never hand-edit a generated registry.
  - There are **two module-key vocabularies**; check which one a surface speaks.
  - The frontend permissions array is a **subset by design**; its absence is not a denial.
  - Employee self-service keys are universal.
  - Org-admin is derived from a permission key, not a flag.
  - Owner bypass masks non-owner 403s — an owner-role test cannot prove a guard. `streamline_admin`
    is `BYPASSRLS`.
  - A resolver without an actor cannot check access, and a hand-built actor omits `membershipId`.
  - Distinguish gate / shortcut / elevation — they are three different things.
- **Two duplicated-analytics-controller precedent applies here:** a *registered* controller is not
  necessarily a *reachable* one. Prove reachability by request path, not by a module import.
- A **duplicate route silently shadows a handler**. Settings sub-routes are where that happens.
- **`openapi:generate` needs no database** — but a stale `contracts/openapi.json` **disarms**
  permission binding. If you change a route's permission, the regenerated spec is part of the
  evidence. Generating it is a request (it writes a shared file).
- `check:route-access-contract` currently covers 215 permission keys and
  permission-binding covers 2,620 Build-relevant bindings with no Build-owned mismatch. Do not break
  that; you also may not run the gates — hand the run to the orchestrator.
- **Session revocation needs a Redis tombstone**; without it revocation falls back to a database
  session lookup. Access and entitlement queries already refresh on focus/reconnect, and entitlement
  invalidation is organization-scoped (10/10 cross-tab tests). Verify and cite.
- Retention/legal-hold must be enforced **at the query layer, not the UI**. Open question 9 in
  `99-open-questions.md` is unanswered — no implementation may proceed by silently choosing an answer
  that changes permissions, tenancy, billing, retention or external visibility. If the retention spec
  requires that answer, record it blocked and name the open question.
- Automations are **configuration only** today; run history, retries, loop protection and rate guards
  are P2-2 and unscoped. The runner has loop-guard and after-commit specs already — after-commit
  hooks have **no tenant context**.
- `layoutType` on a saved view is a **PostgreSQL enum**. Saved views are your `settings/views` spec.
- Webhook dispatch: there were **two** dispatchers and only one was correct. Confirm which one the
  settings surface configures before asserting behaviour.
- RLS on subscription purchases disarms a guard; a permission surface that reads billing needs the
  live tenant GUC.
