# Testing, Rollout And Agent Prompt

## Testing

### Backend
Test:
- Journal balancing
- Posting
- Reversal
- Period lock
- COA validation
- Invoice posting
- Payment posting
- Bill posting
- Vendor payment posting
- Bank import
- Reconciliation
- Tax reports
- Permissions
- Org isolation

### Frontend
Test:
- Dashboard
- COA CRUD
- Journal create/post/reverse
- Reports
- Invoice flows
- Purchase bill flows
- Bank reconciliation
- Expense approvals
- Settings
- Mobile read-only views

## Rollout Phases

### Phase 1
Strengthen ledger, COA, reports, settings, audit.

### Phase 2
Receivables and payables completion.

### Phase 3
Banking and reconciliation.

### Phase 4
Expenses, reimbursements, approvals.

### Phase 5
Tax engine and compliance.

### Phase 6
Budgets, forecasts, assets, multi-currency.

### Phase 7
AI finance intelligence.

## Agent Prompt
```txt
You are working in the current StreamlineOS branch. Read the entire `accounting-finance/` PRD folder in numeric order before coding.

Goal: Upgrade the existing accounting, invoices, expenses, payments, and billing code into a complete Accounting and Finance module.

Important existing code:
- Backend accounting: `streamlineos-backend/src/modules/accounting`
- Backend invoices: `streamlineos-backend/src/modules/invoices`
- Backend expenses: `streamlineos-backend/src/modules/expenses`
- Backend payments: `streamlineos-backend/src/modules/payments`
- Backend billing: `streamlineos-backend/src/modules/billing`
- Frontend accounting: `streamlineos-frontend/frontend/app/(authenticated)/accounting`
- Frontend accounting features: `streamlineos-frontend/frontend/features/accounting`
- Frontend accounting hooks/types: `streamlineos-frontend/frontend/hooks/api/accounting.ts`, `streamlineos-frontend/frontend/types/accounting.ts`

Rules:
1. Do not create a duplicate accounting system.
2. Extend the existing modules.
3. Preserve existing routes unless intentionally migrated.
4. Double-entry accounting must always balance.
5. Posted journal entries must be immutable.
6. Use reversals instead of editing posted financial history.
7. Add tests for every financial posting flow.
8. Enforce org isolation and permissions.
9. Commit after each completed phase.
10. Push to the current branch after commits.

Start by producing an implementation plan mapped to the PRD files, then begin Phase 1.
```

