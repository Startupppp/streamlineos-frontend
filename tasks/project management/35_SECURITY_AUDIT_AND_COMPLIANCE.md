# Security Audit And Compliance

## Security Requirements

- Tenant isolation.
- RBAC.
- Client data isolation.
- Signed file URLs.
- Audit logs.
- Rate limiting for public forms.
- Soft delete and restore.

## Audit Events

- Project created/updated/deleted.
- Member added/removed.
- Permission changed.
- Task status changed.
- Workflow changed.
- Client visibility changed.
- Approval decision.
- Financial change.
- Export.

## Compliance Controls

- Data retention.
- Legal hold for client projects.
- Export audit.
- Access logs.
- Admin review.

## Edge Cases

- Client invited to wrong project.
- Deleted file still accessible by URL.
- Export started before permission revoked.
- User changes own role.

