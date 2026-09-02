# Ticket 16 — page-level-gates test repaired

File: `frontend/lib/rbac/route-access/__tests__/page-level-gates.test.ts` (304 lines, rewritten in place).
No other file changed. No git commands run.

## What the old test did

- `GATE_PATTERN = /enforceRouteAccess|requirePermission|requireModulePermission|requireSession/` — a bare
  `requireSession()` satisfied it, so a page with no permission gate passed.
- Third case asserted `expect(counts[mod]).toBeGreaterThanOrEqual(0)` five times — unconditionally true.
- `TARGET_MODULES = ["build","settings","billing","support","timesheets"]` — 5 of 28 authenticated
  module directories; `sign`, `surveys`, `ai`, `crm`, `hr`, `accounting`, `inventory`, `payroll`,
  `workflows`, `parties`, `subjects`, `blog`, `portal`, `knowledge` were all outside it.
- It also never followed layout inheritance, so a client page could only ever be "documented", not checked.

## What it does now

Audits all **556** pages under `app/(authenticated)` (via `collectAppRoutes`) across all **28** module
directories. For each page it walks the real **layout chain** (page → each ancestor `layout.tsx` →
`(authenticated)/layout.tsx`) and classifies the strongest gate found:

| strength | produced by |
|---|---|
| `permission` | `requirePermission(<key>)`, `requireModulePermission(<module>,…)`, or `enforceRouteAccess` where `resolveRouteAccess(<the page's real route path>).kind === "permission"` |
| `session` | `requireSession()`, or `enforceRouteAccess` resolving to `universal` |
| `client-only` | no server gate; only `<DashboardGate permission=…>` / `<RequireModule>` / `useCan(` — advisory per root §5 |
| `none` | nothing |

`enforceRouteAccess` is resolved against the page's **own** route path, not the literal fallback argument,
because at runtime it reads the pathname from headers. That is what makes it possible to tell
`enforceRouteAccess("/build")` (permission) from `enforceRouteAccess("/dashboard")` (session).

Ten cases, replacing three:

1. reaches both permission catalogs (>400 each) — guards against a silent empty sweep
2. walks every authenticated module directory (28 dirs, 0 uncovered, >400 pages)
3. **distinguishes a permission gate from a session-only gate** — 8 assertions over synthetic sources
4. leaves no authenticated page without a server-side gate of any kind (`none`/`client-only` ⇒ fail)
5. **gives every page outside the allowlist a permission gate, not a bare session check** ← the biting case
6. keeps the session-only allowlist live — no entry matching no page
7. admits nothing into the allowlist that the registry gates or a gated module owns
8. extracts a real key set (>150; actual 215) and no `requirePermission(` call yields zero literal keys
9. every gate key exists verbatim in the backend catalog
10. every gate key exists verbatim in the frontend `PermissionKey` union

`SESSION_ONLY_BY_DESIGN` is an explicit 20-entry allowlist in the test file (dashboard, inbox, mail,
calendar, chat + channels + invite, `/me/*`, notifications + preferences, `/settings` exact, the KB
reading surfaces, `/hr/announcements`), each with a stated reason. It is not a pattern accident and it is
not inherited from `UNIVERSAL_ROUTES`: adding a route there does **not** exempt it. Case 7 cross-checks
the hand-written allowlist against the runtime registry in the other direction — every page an entry
exempts must satisfy `isUniversalRoute`, the entry must carry a ≥20-char reason, and it must sit outside
all 15 gated-module prefixes. So the only way to green case 5 is to add a real gate.

Backend catalog resolution is by candidate search (`STREAMLINE_BACKEND_DIR`, `../backend`,
`../../streamlineos-backend`, `../../backend`) with a loud throw if none exists — it does **not** repeat
the hardcoded `frontend/../backend` path that leaves two sibling suites red here (see P2 below).

## Proof it bites

Temporarily replaced `requirePermission("party:subjects:view")` with `requireSession()` in
`app/(authenticated)/subjects/page.tsx`, ran the suite, restored the file (`cmp` identical).

The failure list gained exactly one line:

```
"/subjects  gate=session  registry-requires=party:subjects:view"
```

in `● page-level gates — every authenticated module › gives every page outside the session-only
allowlist a permission gate, not a bare session check`. The old test was blind to this twice over: its
pattern matched `requireSession`, and `subjects` was not one of its five directories.

## Current result — 9 pass, 1 fails on real defects

`nice -n 10 npx jest lib/rbac/route-access/__tests__/page-level-gates.test.ts --maxWorkers=2`
→ **Tests: 1 failed, 9 passed, 10 total**

The single failure is genuine and belongs to ticket 25's territory (`app/**`), so it was reported, not fixed:

```
"/ai/executive-brief       gate=session  registry-requires=ai:executive-brief:view"
"/surveys/new              gate=session  registry-requires=module:surveys + surveys:view"
"/surveys/1/participants   gate=session  registry-requires=module:surveys + surveys:view"
"/surveys/live/1/host      gate=session  registry-requires=module:surveys + surveys:view"
```

### P1 — four pages reachable by any active member

- `app/(authenticated)/ai/executive-brief/page.tsx` — `"use client"`, **no gate at all**, no `ai/layout.tsx`.
  The route-access registry declares `ai:executive-brief:view` for it, but nothing server-side enforces it.
- `app/(authenticated)/surveys/new/page.tsx`, `surveys/[surveyId]/participants/page.tsx`,
  `surveys/live/[sessionId]/host/page.tsx` — `"use client"`, gated only by `<DashboardGate permission=…>`
  + `<RequireModule module="surveys">`, which are client-side and advisory (root §5). `surveys/` has no
  `layout.tsx`, so the effective server gate is the root `requireSession()`. A member of an org with the
  surveys module **disabled** still renders these shells.
  Fix: add `app/(authenticated)/surveys/layout.tsx` calling `enforceRouteAccess("/surveys")` (the registry
  already resolves `/surveys/*` to `module:surveys + surveys:view`), and an `ai/executive-brief` server gate.

`sign` is now clean: all 8 pages carry `requireModulePermission("sign", …)` or `requirePermission("sign:access:view")`.

## Other findings outside my territory

- **P2 — two sibling suites are red here for a path reason, not a drift reason.**
  `lib/rbac/route-access/__tests__/route-access-keys.test.ts` (15 failures) and
  `lib/rbac/permissions/__tests__/catalog-sync.test.ts` (1 failure) both hardcode
  `frontend/../../../../../backend/src/modules/rbac/permissions`, i.e. `streamlineos-frontend/backend/…`,
  which does not exist on this machine — the backend is the sibling repo `streamlineos-backend`.
  `catalog-sync.test.ts` even carries a comment saying this path "has been wrong twice, in both
  directions". Its ghost-key checks `return` early and assert nothing. Fix is the candidate-search
  helper now in `page-level-gates.test.ts`; it belongs in a shared module both can import.
- **P3 — the frontend runtime catalog trails the union by 53 keys used in live page gates**
  (`hr:*` ×17, `timesheets:*` ×8, `build:*` ×7, `kb:*` ×6, `support:*` ×5, `sign:*` ×4, plus 6 singletons).
  They are in the `PermissionKey` union and in the backend catalog, so gating works, but they are absent
  from the `PERMISSIONS` array the role editor renders — nobody can grant them. `catalog-sync.test.ts`
  documents this as known debt for `timesheets:*`/`surveys:*`; the list is wider than that.
- 17 `tsc --noEmit` errors under `app/**` (`Property 'projectId' does not exist on type
  'IntrinsicAttributes'` and siblings) plus the 22 known `.next/types/validator.ts` errors. Not mine —
  `app/**` is ticket 25's and is being restructured. My file contributes **0**.

## Gates I ran and read

- `nice -n 10 npx jest lib/rbac/route-access/__tests__/page-level-gates.test.ts --maxWorkers=2` → 9 pass / 1 fail (above)
- `nice -n 10 npx jest lib/rbac/route-access/__tests__ --maxWorkers=2` → 107 pass / 16 fail (15 are the pre-existing route-access-keys ENOENT)
- `nice -n 10 npx eslint lib/rbac/route-access/__tests__/page-level-gates.test.ts` → clean
- `nice -n 10 node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` → 0 errors in this file
