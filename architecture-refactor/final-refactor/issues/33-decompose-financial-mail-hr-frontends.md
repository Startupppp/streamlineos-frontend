# 33: Decompose Billing, Mail, HR and Accounting oversized surfaces

**What to build:** Large in-scope forms and pages are separated into cohesive query, state, schema, mutation and presentation units without duplicate abstractions.

**Blocked by:** 04 and 27.

**Status:** implemented

- [x] Every audited file over the hard review limit is split or carries a documented valid exception.
- [x] Permission-aware actions and form validation are preserved.
- [x] Shared primitives are introduced only for demonstrated repeated behavior.
- [x] File-size, typecheck and representative workflow tests pass.

The remaining over-limit files are route-level orchestration exceptions: each composes independently-owned hooks, form fields, tables, dialogs or presentation components, and further extraction would create pass-through wrappers without reducing responsibility. The audited set is `features/billing/invoice-detail.tsx`, `features/billing/ai-credits-settings-page.tsx`, `features/accounting/sales/invoice-detail-view.tsx`, `features/mail/mail-compose-sheet.tsx`, `app/(authenticated)/billing/invoices/new/page.tsx`, `app/(authenticated)/accounting/budgets/[budgetId]/page.tsx`, and `app/(authenticated)/accounting/assets/page.tsx`.
