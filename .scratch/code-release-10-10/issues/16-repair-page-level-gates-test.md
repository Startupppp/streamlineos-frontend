# 16 — Repair the page-gate test so it distinguishes a session gate from a permission gate

**What to build:** `page-level-gates.test.ts` cannot fail for the reason it exists. Its gate pattern accepts a bare session check, so a page with no permission gate at all satisfies it; its third case asserts a count is at least zero, which is unconditionally true; and it covers only five module directories, which is why the `sign` and `surveys` gaps sat outside it entirely.

**Blocked by:** None — can start immediately.

**Status:** done (test repaired and biting; it reports 4 real gate gaps that live in ticket 25's territory)

- [x] The gate pattern distinguishes a permission gate from a session-only gate, and pages that are session-only by design are named explicitly rather than passing by pattern accident.
  Evidence: `npx jest lib/rbac/route-access/__tests__/page-level-gates.test.ts` — case "distinguishes a permission gate from a session-only gate" passes 8 classifier assertions; `SESSION_ONLY_BY_DESIGN` names 20 surfaces, each with a stated reason.
- [x] The vacuous assertion is replaced with one that can fail.
  Evidence: the old `toBeGreaterThanOrEqual(0)` case is gone; replaced by "extracts a real key set from the gates" (`gatedKeys.length > 150`, actual 215) and "leaves no authenticated page without a server-side gate of any kind" (`toEqual([])`).
- [x] Coverage extends to every authenticated module directory, not the original five.
  Evidence: case "walks every authenticated module directory" — 28 module dirs, 0 uncovered, 556 pages audited (old test: 5 dirs).
- [x] The test is proven to bite: remove a known-present gate and confirm it goes red for the intended reason.
  Evidence: swapped `requirePermission("party:subjects:view")` for `requireSession()` in `app/(authenticated)/subjects/page.tsx`; the failure list gained exactly `"/subjects  gate=session  registry-requires=party:subjects:view"`. File restored, `cmp` identical.
- [x] Gated modules require a permission key; platform-core self-service surfaces require only a session, and the distinction is encoded rather than implied.
  Evidence: case "admits nothing into the allowlist that the runtime registry gates or that a gated module owns" — every allowlisted page must satisfy `isUniversalRoute`, carry a ≥20-char reason, and sit outside all 15 gated-module prefixes. Passes with 0 violations.
- [x] Permission keys asserted by the test exist verbatim in both the backend and frontend catalogs — a key that exists in only one is either ungateable or permanently false.
  Evidence: 215 distinct gate keys checked against 698 backend catalog names and 696 frontend `PermissionKey` union values — 0 missing on either side. Guard case asserts both catalogs read >400 entries so an empty sweep cannot pass.
