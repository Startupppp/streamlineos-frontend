# RBAC — still pending

Code-complete items were removed. A browser check is not treated as remaining work.

## RBAC-B-007 — needs a product decision

Custom role create and edit is not built. `roles.controller.ts` has no `POST /roles`, and the roles page has no "New role" control. Owners can assign Member or Org Admin only. Build workspace membership offers Member or Admin only.

`backend/CLAUDE.md` BE-102 forbids shipping role creation. Building custom roles needs a decision on which fields are configurable and how fine the per-module permissions are. If custom roles stay out of scope, the product should not imply that a custom role can be created.
