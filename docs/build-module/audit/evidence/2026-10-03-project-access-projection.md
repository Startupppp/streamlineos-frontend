# Project access projection: current-source verification

## Scope and revisions

- Claim: `BLD-PROJECT-ACCESS-PROJECTION-01`, outer claim revision `308308793`.
- Backend source revision: `f4a9e9e0c`.
- Prior backend revision: `7ccb2852a`.
- Changed paths: `backend/src/modules/build/core/project-crud/project-access.ts` and `project-access-projection.spec.ts` beside it.
- Verified source blob hashes: `236f7cfd1612e6812826254ec0a95207f97a4cbc` and `6b3798761b14b2ca12b8c41dad59343c7baa0b34` respectively.
- Relationship policy, permission keys, membership data and schema remain unchanged.

## Reproduced defect

The current-source `resolveProjectAccess` call failed with PostgreSQL SQLSTATE `42702` under the application role and tenant context. Its compiled single-table SELECT exposed the member-role scalar expression directly. Drizzle stripped table qualification from top-level column chunks, producing an ambiguous `SELECT "role"` inside a joined subquery. It also changed the correlated predicate to `"project_id" = "id"`, which referred to an inner membership identifier rather than the outer project.

The fix nests the member-role expression in a typed SQL projection, matching the existing manager and team projections. This preserves the inner role and correlated project qualifiers without adding a query or changing access policy.

## Gates

- [x] A regression compiled the actual `resolveProjectAccess` SELECT through real Drizzle execution up to logger capture. Two assertions failed before the fix: qualified member role and correlation to the outer project.
- [x] The new suite passes all four cases after the fix, including bound tenant and active-membership predicates and a principal without accountable membership.
- [x] Seven focused suites pass: projection, relationship, access authorization, access decisions, cross-organization 404, query cost, and project detail. Total: **115 tests**.
- [x] ESLint on both owned paths passes with zero warnings.
- [x] Owned-path `git diff --check` passes.
- [x] Backend production `pnpm typecheck` passes.
- [x] The seven-suite scoped TypeScript dependency graph passes.
- [x] Coordinator independent review approved the minimal projection and regression before commit.

## Actual target read

These calls used the backend IAM script SQL helper with `APP_DATABASE_URL`, `streamline_app`, a PostgreSQL **READ ONLY** transaction, the selected real tenant's `app.organization_id`, and `app.audience=INTERNAL`. No rows were inserted, updated or deleted. No identity, email, project payload, connection URL or query bind values were printed or stored in this evidence.

The canonical membership read confirmed an active organization administrator with the expected membership. Its stored owner flag was false; the diagnostic used actual `AccessService`, membership, access-version and permission resolution rather than assuming owner standing. The cache adapter evaluated cache fills directly to avoid external cache writes.

| Stage | Before repair | After repair |
|---|---|---|
| Application role and transaction mode | Confirmed application role and read-only mode | Confirmed application role and read-only mode |
| Project permission standing | Unrestricted organization administrator | Preserved |
| Actual relationship/access call | SQLSTATE `42702`; ambiguous-member-role confirmation | Succeeds; access granted |
| Actual `ProjectsQueryService.getProject` | Blocked before relational detail read | Succeeds; four statuses and one member |
| Conditional CRM lookup | Project has no CRM client; lookup skipped | Preserved; CRM result null |

An intermediate attempt to replay compiled SQL without its parameter bindings returned `42P02`; it was discarded as a diagnostic harness error. The bound current-source invocation reproduced `42702` and the repaired actual source invocation succeeded.

## Remaining proof

- [ ] Authenticated local browser project detail action, console and network verification on this source revision.
- [ ] Deployed revision parity and resolution of the previously observed deployed HTTP 500.
- [ ] Full role and tenant browser acceptance beyond this administrator read.

This evidence verifies current source against the selected target read. It does not establish deployed or browser completion.

## Delivery checklist

- [x] Record the named evidence, its source or runtime scope, and the remaining verification limits in this report.

Unfinished implementation and release acceptance remain tracked in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). This checked item records evidence capture only.
