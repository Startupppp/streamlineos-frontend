# 15 — An owner grants one person a specific set of permissions

**What to build:** An owner can hand a single person exactly the capability they need, without inventing a role. Today capability only attaches to roles, so narrowing one person's access means either creating a role for them — which the product does not allow — or giving them a whole rung of the ladder and hoping they behave.

A module owner, module admin, org admin or org owner selects permissions and attaches them to one person. That person may be a **member or an admin**. The grantor may also change that person's role. The grantee can then perform only what they hold, and the interface shows only the screens those permissions unlock.

**There are exactly six standings and no custom roles:** org owner · org admin · org member, and per module owner · admin · member. This ticket does not add a seventh; it makes the existing six precise per person.

**What exists today, and what does not.** `role_permission_grants` attaches permissions to a role. `user_delegations` + `user_delegation_permissions` are temporary acting-for arrangements, not durable capability. `user_module_access` is a deny-override that can only *remove* a module, never grant a permission. **There is no durable per-person grant.** This is new storage, not a rewiring.

**Blocked by:** None — can start immediately. It gates 12 and 13, which assume a delegation mechanism this defines.

**Status:** ready-for-agent

- [ ] A grantor holding module owner, module admin, org admin or org owner standing can attach a specific permission to one person, and remove it again
- [ ] A grantee may be a member or an admin; granting never changes their standing by itself
- [ ] A grantor can only grant what their own standing already carries, and never outside their own module — proven by a denial test, not by the UI hiding the option
- [ ] Resolution folds per-person grants into `AccessService` alongside role grants, so every existing `@RequirePermission` gate honours them with no call-site change
- [ ] Navigation and controls derive from the resolved permission set, so a grantee sees only the screens they can use
- [ ] Revoking a grant takes effect without the grantee re-authenticating — the permissions version is bumped and the cache invalidated
- [ ] A grant survives a role change, or is deliberately cleared by it; whichever is chosen is stated and tested
- [ ] Cross-tenant: a grant can never reference a person or permission outside the grantor's organisation
- [ ] An audit record says who granted what to whom and when
