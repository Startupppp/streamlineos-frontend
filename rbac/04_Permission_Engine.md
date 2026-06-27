# StreamlineOS RBAC Product Bible

# 04 -- Permission Engine

## Purpose

The Permission Engine is the single source of truth for every
authorization decision across StreamlineOS. No page, API, workflow, AI
feature, automation, or integration may bypass this engine.

------------------------------------------------------------------------

# Design Principles

-   Server-side authorization is mandatory.
-   UI visibility is a UX optimization, not security.
-   Explicit Deny always overrides Allow.
-   Role-based permissions are preferred over direct user permissions.
-   Every decision is deterministic, auditable and cacheable.

------------------------------------------------------------------------

# Evaluation Pipeline

``` text
Request
  ↓
Authenticate User
  ↓
Resolve Organization
  ↓
Validate Subscription
  ↓
Validate Module Enabled
  ↓
Validate Feature Flag
  ↓
Load Effective Roles
  ↓
Merge Role Permissions
  ↓
Apply Direct User Overrides
  ↓
Apply Explicit Deny
  ↓
Resolve Scope
  ↓
Evaluate Ownership
  ↓
Apply Business Policies
  ↓
Authorize or Reject
```

------------------------------------------------------------------------

# Permission Model

Permission = Resource + Action + Scope

Examples

-   crm.leads.view.organization
-   inventory.products.edit.branch
-   finance.invoice.approve.organization
-   hr.employee.salary.view.department

------------------------------------------------------------------------

# Scope Resolution

Supported scopes:

-   Own
-   Team
-   Department
-   Branch
-   Organization
-   Platform

Rules:

-   Own → records owned by current user.
-   Team → managed team only.
-   Department → matching department.
-   Branch → matching branch.
-   Organization → tenant-wide.
-   Platform → reserved for platform operators.

------------------------------------------------------------------------

# Role Resolution

Users may have multiple roles.

Evaluation order:

1.  System Roles
2.  Custom Roles
3.  Temporary Roles
4.  Direct User Permissions
5.  Explicit Deny

Merge allows, then apply deny.

------------------------------------------------------------------------

# Temporary Access

Supports:

-   Expiration datetime
-   Assigned by
-   Reason
-   Automatic cleanup
-   Audit log

Expired permissions are ignored.

------------------------------------------------------------------------

# Delegation

Users may temporarily delegate selected permissions.

Requirements:

-   Start/end dates
-   Delegator approval
-   Audit trail
-   Automatic revocation

------------------------------------------------------------------------

# Subscription Integration

Authorization also checks:

-   Active subscription
-   Purchased module
-   Purchased feature
-   AI credits (where applicable)

Users cannot access features outside licensed plans.

------------------------------------------------------------------------

# Feature Flags

Permission evaluation respects:

-   Global flags
-   Organization flags
-   Beta flags
-   Kill switches

Feature flags are evaluated before permission checks for disabled
functionality.

------------------------------------------------------------------------

# Caching Strategy

Cache effective permissions per user.

Suggested Redis key:

permission:{organizationId}:{userId}

Invalidate when:

-   Role changes
-   Permission changes
-   Subscription changes
-   Feature flag changes
-   User assignment changes

------------------------------------------------------------------------

# Middleware Contract

Every protected endpoint calls:

requirePermission(resource, action, scope)

The helper returns:

-   authorized
-   denied
-   denial reason
-   evaluated scope
-   matched permission

------------------------------------------------------------------------

# Error Responses

403 Forbidden

Return structured response:

-   error_code
-   resource
-   action
-   reason
-   correlation_id

Never expose internal permission logic.

------------------------------------------------------------------------

# Audit

Log every authorization failure for security-sensitive resources.

Capture:

-   user
-   organization
-   resource
-   action
-   decision
-   reason
-   IP
-   device
-   timestamp

------------------------------------------------------------------------

# Performance Goals

-   Cached authorization for common requests.
-   O(1) permission lookup after cache warm-up.
-   Batch permission loading.
-   No N+1 queries.

------------------------------------------------------------------------

# Edge Cases

-   User removed while logged in.
-   Subscription expired.
-   Module disabled.
-   Role deleted.
-   Temporary access expired.
-   Feature flag disabled.
-   Cross-tenant access attempt.
-   Orphaned permission.

------------------------------------------------------------------------

# Acceptance Criteria

-   Single centralized engine.
-   Used by every API and server action.
-   Supports multiple roles.
-   Supports explicit deny.
-   Supports future ABAC.
-   Fully auditable.
-   Cache invalidation implemented.
