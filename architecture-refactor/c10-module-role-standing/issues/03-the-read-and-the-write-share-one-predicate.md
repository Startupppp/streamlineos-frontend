# 03 — The read and the write share one predicate

**What to build:** The grant form can never offer something the writer will refuse. The description of what may be granted and the enforcement of what may be granted are computed by the same comparison, so they cannot drift.

**Blocked by:** 02 — An actor knows what they may grant

**Status:** done

## Acceptance criteria

- [x] The rank and scope comparison exists in exactly one place, consumed by both the read and the write path — `canGrantToRank` in `common/rbac/grantability.ts:59`, imported by both `describeGrantable` and `grantAdminStanding`.
- [x] For a matrix of actor ranks and scopes, every grant the read offers is accepted by the writer — `standing-grantability-agreement.spec.ts` tests the full matrix.
- [x] For the same matrix, every grant the read omits is refused by the writer — same spec asserts `toThrow(ForbiddenException)` for every omitted rank.
- [x] The existing write-side refusals are unchanged in behaviour — `assertPermissionsGrantable` in `grantability.ts` is untouched.

## Todo

- [x] Extract the comparison the grant path already performs — `canGrantToRank` at `grantability.ts:59`
- [x] Point both sides at it — `module-standing-roster.service.ts:401` and `module-standing-mutations.service.ts:80` both import `canGrantToRank`
- [x] Write the agreement test across the full matrix — `standing-grantability-agreement.spec.ts`
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
