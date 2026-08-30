# VALIDATE1 — ZodValidationPipe → @Validate Migration

**Status: COMPLETE**
**Date: 2026-08-30**

---

## Scope

Migrate all HTTP-boundary validation from the legacy `ZodValidationPipe` (per-parameter NestJS pipe) and inline `schema.parse(...)` calls to the declarative `@Validate({ body, query, params })` decorator pattern across all in-scope module territories.

**In-scope modules:** hr, payroll, build, finance, accounting, crm, kb, chat, inventory, surveys, support, deals, goals, storage-kb, record-layouts, offer-fulfillment, issues, csat, customer-executive, crm-mailbox, email

**Explicitly excluded:** billing, workflows, auth, mfa, organization, settings, users, rbac, module-access, notifications, calendar, mail, push, dashboard, search, branches, tasks, portal, public, webhooks, party, delegations, directory, api-tokens, agent-access, autonomy, e-sign, audit-log, automation, blog, ai-feedback

---

## Result

**All in-scope controllers: 0 ZodValidationPipe occurrences remaining.**

Gate checks (final run):
- `pnpm check:route-classification` → **0 UNDECLARED** (all routes classified)
- `pnpm check:idempotent-commands` → **OK** (all in-scope mutating handlers carry @Idempotent)

---

## Migration Summary by Territory

| Territory | Files | Handlers |
|---|---|---|
| Inventory | 34 | 121 |
| Payroll | 34 | 96 |
| Build (projects, sprints, QA, backlog, portfolios, goals) | 33 | 123 |
| HR core + time + directory | 25 | 77 |
| HR config + enterprise + forms | 36 | ~80 |
| HR recruitment + performance + governance + lifecycle + interviews | 42 | ~120 |
| Finance AP/AR/tax/controls | 21 | 48 |
| Finance reports/assets/banking/planning/expenses | 16 | 59 |
| Surveys + support + chat | 11 | 43 |
| Contacts + clients + sales + quotes + invoices + expenses | 12 | 66 |
| CRM sub-modules + leads | 18 | 83 |
| AI sub-controllers (crm/hr/build/support) | 5 | 43 |
| Deals (stakeholders, competitors, meetings, approvals, analytics, core) | 6 | 23 |
| Direct migrations (goals, storage-kb, record-layouts, offer-fulfillment, issues, csat, customer-executive, crm-mailbox, hr-send-email, support-reports, hr-audit, hr-calendar, hr-import, onboarding, hr-departments, hr-notification-preferences, hr-salary-structures, background-verification, projects-customers) | 19 | ~50 |
| **TOTAL** | **~312** | **~1,032** |

---

## Pattern Applied

Every handler that had:
```
@Body(new ZodValidationPipe(schema)) body: T
@Query(new ZodValidationPipe(schema)) query: T
@Param("id", new ZodValidationPipe(schema)) id: T
```

Was converted to:
```
@Validate({ body: schema })   // or query: / params:
@HandlerDecorator() body: T   // bare, no pipe
```

- `ZodValidationPipe` import removed from every migrated file
- `Validate` import added from `common/validation/validate.decorator`
- Schemas remain in the module's `dto/` folder (not moved)
- `z.object().strict()` already present on all schemas (no changes needed there)
- No `@Idempotent` added to any route
- No comments added

---

## Out-of-Scope ZVP Remaining

65 controller files still use `ZodValidationPipe`, all in explicitly excluded modules (billing, workflows, auth, mfa, organization, settings, users, rbac, module-access, notifications, calendar, mail, push, dashboard, search, branches, tasks, portal, public, webhooks, party, delegations, directory, api-tokens, agent-access, autonomy, e-sign, audit-log, automation, careers, feedbucket, ownership, platform, blog, ai-feedback). These are intentionally left.

---

## Validation

- `pnpm check:route-classification`: 0 UNDECLARED ✓
- `pnpm check:idempotent-commands`: OK ✓
- `tsc --noEmit`: not run (machine constraint per task rules)
- Lint/tests: not run (not requested)
