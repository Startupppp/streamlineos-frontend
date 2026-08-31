# Oversized production files >500 lines (in-scope only; CRM + Inventory excluded per PRD)

Measured 2026-08-30. Backend in-scope: 65 (74 total - 9 CRM/Inventory). Frontend in-scope: 18 (23 total - 5 CRM/Inventory).
PRD §28.2a claimed 88 backend / 22 frontend — stale.

## Backend (65)
```
   1054 ./modules/notifications/notification-events.catalog.ts
    976 ./db/schema/hr/hiring.ts
    936 ./modules/organization/core/org-membership.service.ts
    839 ./modules/module-access/module-access-groups.service.ts
    812 ./modules/ai/core/services/hr-ai.service.ts
    779 ./modules/auth/auth-tokens.service.ts
   767 ./scripts/relocate-org-data.ts
    750 ./modules/access/access.service.ts
    747 ./modules/ownership/ownership-transfer-response.service.ts
    746 ./modules/payroll/payout/payout-batches.service.ts
    731 ./modules/payroll/runs/generate.service.ts
    709 ./modules/ingress/adapters/crm-mailbox.service.ts
    696 ./modules/payroll/runs/generate-pipeline.service.ts
    690 ./modules/kb/retrieval/kb-indexing.service.ts
    657 ./modules/payroll/insights/ess.service.ts
    653 ./modules/organization/core/org-lifecycle.service.ts
    644 ./modules/finance/banking/reconciliation.service.ts
    640 ./modules/platform/platform.service.ts
    635 ./modules/dashboard/dashboard-hr.service.ts
    628 ./modules/organization/core/invitations.service.ts
    619 ./modules/party/party-merge.service.ts
    618 ./modules/goals/goals.service.ts
    614 ./modules/ai/core/services/ticket-ai.service.ts
    613 ./modules/chat/chat-messages.service.ts
    608 ./modules/organization/setup/org-setup.service.ts
    606 ./modules/rbac/roles.service.ts
    602 ./modules/kb/wiki/kb-pages.service.ts
    600 ./modules/support/core/dto/support.schemas.ts
    598 ./modules/build/entity/build-entity.adapter.ts
    591 ./modules/accounting/posting/finance-posting.service.ts
    589 ./modules/timesheets/core/approvals.service.ts
    589 ./modules/hr/hr-calendar-source.ts
    584 ./modules/rbac/role-templates.constants.ts
    584 ./modules/cron/cron-platform.controller.ts
    582 ./modules/kb/help-centre/kb-articles.service.ts
    580 ./modules/billing/payments/payment-webhook-health.service.ts
    578 ./modules/timesheets/core/reports.service.ts
    578 ./modules/finance/ap/payment-runs.service.ts
    576 ./modules/ai/core/services/crm-brief.service.ts
    568 ./modules/build/core/projects-tickets-read.service.ts
    567 ./modules/users/user-profile.service.ts
    566 ./modules/kb/retrieval/kb-search.service.ts
    564 ./db/schema/chat/chat.ts
    555 ./modules/settings/settings.service.ts
    552 ./modules/e-sign/sign-public.service.ts
    549 ./modules/public/recruitment.service.ts
    548 ./modules/autonomy/autonomy-review.service.ts
    547 ./modules/tasks/tasks.service.ts
    547 ./modules/hr/directory/org-structure.service.ts
    543 ./modules/party/party-mirror-fields.ts
    542 ./modules/directory/directory-identity.service.ts
    539 ./db/schema/common/auth.ts
    538 ./modules/payroll/payout/approvals.service.ts
   531 ./scripts/seed-enterprise-workspace.ts
    531 ./modules/ai/core/services/crm-copilot.service.ts
    527 ./modules/notifications/broadcasts.service.ts
    524 ./modules/ingress/adapters/web-form-to-inbound-event.ts
    522 ./modules/payroll/payout/publishing.service.ts
    515 ./modules/hr/lifecycle/termination.service.ts
    512 ./modules/cron/cron-leave.service.ts
    509 ./modules/notifications/notification-dispatch.service.ts
    509 ./modules/hr/core/person-employment-sync.service.ts
    506 ./modules/party/subject.service.ts
    506 ./modules/hr/workflows/hr-workflow-engine.service.ts
    504 ./modules/ownership/ownership-transfers.service.ts
```

## Frontend (18)
```
    693 ./components/automations/automation-meta.ts
    604 ./hooks/api/module-access.ts
    586 ./features/accounting/sales/invoice-detail-view.tsx
    566 ./features/billing/ai-credits-settings-page.tsx
    562 ./components/layout/header/product-switcher-menu.tsx
    548 ./features/timesheets/settings/general-settings-form.tsx
    543 ./app/(authenticated)/workflows/page.tsx
    541 ./features/mail/mail-compose-sheet.tsx
    535 ./features/chat/channel-sidebar.tsx
    530 ./hooks/api/crm-settings.ts
    526 ./app/(authenticated)/accounting/budgets/[budgetId]/page.tsx
    522 ./app/(auth)/invitation/[token]/page.tsx
    520 ./components/editor/plate/plate-document-editor.tsx
    513 ./features/chat/huddle-panel.tsx
    511 ./features/hr/performance/reviews-tab.tsx
    506 ./features/calendar/calendar-view.tsx
    504 ./app/employee-onboarding/page.tsx
    503 ./features/hr/leaves/components/leaves-wfh-content.tsx
```
