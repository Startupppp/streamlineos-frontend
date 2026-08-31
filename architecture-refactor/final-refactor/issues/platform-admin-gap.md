# §8's platform-admin clauses describe a concern this repo deliberately removed

Verdict: **the spec is stale, not the code.** The earlier lane's conclusion was right, but its
evidence was weaker than what exists. This is not "never built" — it was built, then removed on
purpose, with the reasoning written into the migration.

## The proof

`backend/migrations/0002_platform_admin_flag.sql` added the signal:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_platform_admin ON users (id) WHERE is_platform_admin;
```

`backend/migrations/0369_drop_platform_admin.sql` removed it, and states why:

> The platform owner moves to a separate application. This repo now serves tenants only, so
> `users.is_platform_admin` has no reader: the claim, the guard, the bypass checks and the admin
> surfaces were all removed in code.
>
> Leaving the column would be worse than dropping it — a flag nothing enforces reads like a live
> privilege.

The migration guards itself: it counts rows with the flag set and raises if any remain, so it
cannot silently strand a privileged user.

## Current state, verified

| Claim | Result |
|---|---|
| Platform-admin signal in the tenant auth stack | **None.** No column, no JWT claim, no `AccessSnapshot` field, no `CurrentUserContext` field, no NextAuth session field. Only surviving matches are the two migration filenames in `check-migration-discipline.mjs` and a local const `PLATFORM_ADMIN_MODULE = "billing"` in a parity spec, which is a module key, not an identity |
| `/owner` route on disk | **Does not exist.** No directory under `frontend/app/**` matches `owner*` |
| Dead references to `/owner` | `frontend/proxy.ts:80` (`PROTECTED_ROUTES`) and `frontend/app/robots.ts:44` (disallow list). Both are inert — they name a path nothing serves |

Platform operators authenticate with `INTERNAL_API_SECRET` and never hold a tenant JWT, so there is
no request context in which a "platform admin" could be recognised to redirect.

## Why this is not a code defect

§8 asks for a redirect keyed on an identity this application cannot observe, to a route in a
different application. Implementing it would mean reintroducing `is_platform_admin` — precisely the
"flag nothing enforces reads like a live privilege" that 0369 removed.

The **org-owner** half of both rules is implemented and bite-tested. Only the platform-admin half is
unimplementable.

## Proposed §8 wording

Two clauses change. Nothing else in §8 is affected.

**HR bullet — before:**

> The onboarding form is **never** shown to org owners or platform admins — gate server-side and
> redirect (owner → setup/dashboard; platform admin → `/owner`).

**after:**

> The onboarding form is **never** shown to org owners — gate server-side and redirect the owner to
> setup/dashboard. Platform operators are out of scope: this repo serves tenants only and carries no
> platform-admin identity (0369 dropped `users.is_platform_admin`), so no tenant surface branches on
> one.

**Workspace gating bullet — before:**

> no workspace → `/org-setup` (platform admins → `/owner`), enforced by the live-session check in
> `app/(authenticated)/layout.tsx`.

**after:**

> no workspace → `/org-setup`, enforced by the live-session check in
> `app/(authenticated)/layout.tsx`.

Note the wizard-gate authority is `resolveWizardGate` (`frontend/lib/wizard-gate.ts`), used by the
`(authenticated)`, `/org-setup` and `/employee-onboarding` server layouts — `proxy.ts` deliberately
never redirects on JWT claims, because two decision points over two data sources produce
`ERR_TOO_MANY_REDIRECTS` the moment they disagree. Any future platform-admin branch would have to
live in `resolveWizardGate`, not the proxy.

## The alternative, if the console is wanted here instead

Rough scope, for comparison only:

1. Reintroduce the identity — column, index, and a backfill deciding who holds it.
2. Thread it through the JWT claim, `CurrentUserContext`, `AccessSnapshot` and the NextAuth session.
3. A guard that distinguishes a platform operator from a tenant member, plus the RLS question: a
   platform admin reading across tenants needs either BYPASSRLS or an explicit escape, and today the
   only cross-tenant reader is the owner role.
4. Build `/owner` and its route-access registry entries.
5. Add the `resolveWizardGate` branch.

Step 3 is the expensive one and the reason 0369 chose separation: a cross-tenant reader inside the
tenant app defeats the isolation the whole RLS layer exists to provide.

## Dependent cleanup

If the spec changes, `/owner` should also leave `frontend/proxy.ts:80` and
`frontend/app/robots.ts:44`. Left in place for now because the direction of that cleanup depends on
the decision.
