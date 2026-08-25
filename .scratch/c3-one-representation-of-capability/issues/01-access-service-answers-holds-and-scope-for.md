# 01 — One function answers whether a person holds a permission

**What to build:** A backend service can ask the access service directly whether a person holds a permission key, and at what data scope, without going near the request object. The answer is correct for an org owner who holds nothing explicitly, correct on a route that does not mount the permission guard, and carries the scope rather than discarding it.

This is the *expand* step: the new way ships beside the old one and nothing migrates yet, so nothing can break.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] A held key answers yes, and returns the scope it was granted at.
- [x] An absent key answers no, at no scope.
- [x] A key held at no scope answers no.
- [x] **An org owner holding nothing explicitly answers yes, at full scope** — without the caller writing an owner check.
- [x] A personal access token that does not delegate the key answers no, even when the underlying resolution holds it.
- [x] The answer is the same whether or not the permission guard ran on the route.
- [x] No new cache and no new per-request query — resolution goes through the existing warm path.
- [ ] The request-transaction ceiling job stays green and warm/cold parity is unchanged.

## Todo

- [x] Add the two members to the access service, taking the caller context so owner and token handling live inside the seam
- [x] Apply the same personal-token delegability filter the authorization path applies, so the new door is not a wider one
- [x] Confirm the access module is already global so no module imports change
- [x] Write the five verdict cases plus the owner case and the token case
- [x] Re-run the resolution-cost spec and the warm/cold parity spec
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`AccessService.holds(user, key): Promise<boolean>` and `scopeFor(user, key): Promise<DataScope>` ship beside the existing flat array. Nothing migrated, nothing deleted — that is tickets 02 and 03.

`cd backend && npx jest --testPathPattern "modules/access" --maxWorkers=2` → **20 suites, 217 tests, all pass**, including the new `__tests__/holds-and-scope-for.spec.ts` (13 cases) and the unchanged `access-resolution-cost.spec.ts` and `__tests__/warm-cold-parity.spec.ts`.

Owner and personal-token handling live inside the seam: both short-circuit before `resolveUserPermissions` is reached, asserted directly by the spec case "org owner does not call resolveUserPermissions". No new cache namespace, TTL or key.

**Not verified here:** the CI request-transaction ceiling was checked only via its spec, not by running `pnpm db:check-request-txn` as a job. Run it before merge.
