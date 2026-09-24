# Browser handoff — PM Workspace removal

Branch `claude/remove-build-workspaces` in **both** repos (root and `backend/`).
No browser verification was performed by the authoring session. Everything below is
unverified in a browser and is what needs checking.

## Boot — run the BRANCH, not `D:\projects\personal\Streamlineos`

Migration 1159 is already applied to the production database. Any checkout that
predates the removal now talks to a schema it does not know, so a stale dev server
fails in a way that looks like a defect in this work and is not.

The observed symptom, for recognition: a project route (e.g. `/build/6`) returns 200 and the client throws
`ApiContractError` with `{"path":"pmWorkspaceId","message":"Invalid input: expected
string, received undefined"}`, then the route falls back to client rendering. That is
a pre-removal `build-project-schema.ts` still declaring `pmWorkspaceId: z.string()`
against a backend that correctly no longer sends it. Restarting the same checkout does
not fix it; running the branch does.

> **Note (2026-09-23):** The original text used `/build/5` as the example. Project 5 does not exist in the active organisation. Use project 6 (`/build/6`) as the QA sandbox for any manual verification. Verified: `frontend/app/(authenticated)/build/[projectId]/page.tsx` exists; project 6 is the active QA sandbox.

Confirm before booting, from whichever directory you are about to run:

```
git log --oneline -1
git merge-base --is-ancestor 878a4ef46 HEAD && echo OK || echo "STALE - do not test here"
```

Then boot both from the branch working tree:

```
pnpm -C backend start:dev      # http://localhost:1500
pnpm -C frontend dev           # http://localhost:1000
```

Both servers must come from the same revision. An old web against a new API produces
exactly the contract violation above; a new web against an old API produces its mirror.

`backend/.env` points at the production RDS cluster and `NODE_ENV=production`.
Check `NEXT_PUBLIC_API_URL` / `API_INTERNAL_URL` in `frontend/.env*` before trusting
anything you see — a local frontend pointed at production API reads real data.

Migration 1159 must be applied before the app will boot correctly against a database,
because the ORM no longer declares `pm_workspace_id`. Confirm with:

```sql
SELECT to_regclass('build.build_members'), to_regclass('build.pm_workspaces');
```

Expected: `build.build_members` non-null, `build.pm_workspaces` NULL.

## Redirects — the highest-value check

These live in `frontend/next.config.ts`, not in page components. A redirect-only page
component would be shadowed by `next.config.ts` and never run, which is why none exist.
Each must land on the destination with no 404 and no flash of a workspace shell.

| Visit | Must land on |
| --- | --- |
| `http://localhost:1000/build/workspaces` | `/build` |
| `http://localhost:1000/build/workspaces/any-id` | `/build` |
| `http://localhost:1000/build/workspaces/any-id/overview` | `/build/command-center` |
| `http://localhost:1000/build/workspaces/any-id/all-work` | `/build/all-work` |
| `http://localhost:1000/build/workspaces/any-id/goals` | `/build/goals` |
| `http://localhost:1000/build/workspaces/any-id/products` | `/build/managed-products` |
| `http://localhost:1000/build/workspaces/any-id/roadmap` | `/build/roadmap` |
| `http://localhost:1000/build/workspaces/any-id/teams` | `/build/teams` |
| `http://localhost:1000/build/workspaces/any-id/my-work` | `/build/my-work` |
| `http://localhost:1000/build/pm-workspaces` | `/build` |

Ordering matters: the nested sources are declared before `/build/workspaces/:pmWorkspaceId`,
which is declared before `/build/workspaces`. If a nested link lands on `/build` instead of
its own destination, the ordering regressed.

## Scope switcher — `http://localhost:1000/build`

Open the Build scope selector in the sidebar.

1. `All of Build` is present and selectable.
2. Products and Projects sit **directly** under the organization scope. There is no
   intermediate row of any kind.
3. No `Default Workspace` row. No workspace row at all.
4. Search placeholder reads exactly `Search projects and products`.
5. Search returns products and projects, and nothing typed as a workspace.
6. Archived **projects** and archived **products** still behave as they did (whatever
   the prior archived treatment was — dimmed, grouped, or filtered). Archived
   *workspace* behaviour is gone; there is nothing to check for it.
7. A project with no product still appears, at the organization level. This is the case
   most likely to have regressed, because the parent chain changed.
8. Selecting a product opens that product's overview; selecting a project opens that
   project. Neither should carry the previous scope's subpath.

## Create/edit forms — no workspace field

Each of these must submit successfully with no workspace selector present:

- `http://localhost:1000/build` → create a Project
- `http://localhost:1000/build/managed-products` → create a Managed Product
- `http://localhost:1000/build/teams` → create a Team
- `http://localhost:1000/build/goals` → create a Goal
- `http://localhost:1000/build/roadmap` → create a Roadmap item

A 400 with `Unrecognized key: "pmWorkspaceId"` means a client is still sending the field;
the backend schemas are `.strict()`.

## Build members — the renamed roster

`http://localhost:1000/build/settings/access` (note `/build/members` is itself a redirect here).

- The roster lists members, paginates, and search works.
- Add a member, then remove them. Both must succeed.
- A user who is not an organization member must be rejected with
  "This user is not a member of the organization."
- Adding a non-Build-member to a team must be rejected with
  "Only Build members can be added to a team. Add this person on the Build members page first."

This is the surface most at risk: the table was renamed `project_workspace_members`
→ `build_members` and the service, controller and DTOs renamed with it.

## List filters

`/build`, `/build/all-work`, `/build/my-work`, `/build/managed-products`, `/build/teams`,
`/build/roadmap`, `/build/goals` — confirm no workspace filter control, and that a URL
carrying `?pmWorkspaceId=x` is simply ignored rather than producing an empty list.

## Agent pulse / reports / workload

`http://localhost:1000/build/command-center` — agent pulse must render. It lost four
workspace-scoped query branches; the project-scoped and org-scoped paths were left alone.

## What is NOT covered here

- No browser verification was run by the authoring session. Every row above is a claim to test.
- Cross-tenant behaviour is covered by backend specs, not by this checklist.
- The nine removed endpoints return 404 now. Confirming that is a network-tab check, not a UI one.
