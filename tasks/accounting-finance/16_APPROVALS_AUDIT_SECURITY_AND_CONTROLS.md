# Approvals, Audit, Security And Controls

## Backend Requirements
- Permission checks for all accounting actions.
- Approval policies.
- Audit logs.
- Period locks.
- Immutable posted entries.
- Separation of duties checks.

## Approval Workflows
Support approvals for:
- Manual journals
- Purchase bills
- Vendor payments
- Expenses
- Credit notes
- Bank reconciliation adjustments
- Period reopen

## Policy Examples
- Bills over 50,000 require manager approval.
- Vendor payment over 100,000 requires owner approval.
- Manual journal to cash account requires accountant approval.
- Period reopen requires admin permission.

## Frontend Requirements
- Approval queue.
- Approval detail.
- Approve/reject/comment.
- Audit timeline on every financial record.

## Security
- Org isolation.
- Role-based permissions.
- Sensitive financial exports permission-gated.
- Provider credentials encrypted.
- Audit export.

## Acceptance Criteria
- Unauthorized users cannot access financial records.
- Approvals are enforced server-side.
- Every mutation has audit record.
- Locked periods cannot be modified by normal users.

