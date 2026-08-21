# 07 — One seam resolves every person

**What to build:** An organisation's people were described three ways at once with nothing declaring which is authoritative. The employees endpoint reads organisation membership directly, the HR person model and its siblings hold zero rows, and payroll models a third view. Every new feature faced the fork and picked differently.

**Status:** done

## The canonical model

The three "competing" models turned out not to compete — `hr_people.organization_person_id` and `workers.organization_person_id` both already point at `organization_people`. There was a canonical record all along; nothing named it.

> **`organization_people` is the person; everything else is a facet of one.** `organization_members` adds a **login**, `workers` adds **payability**, `hr_people` + `hr_employments` add **employment**. A person may hold any combination, including none.

That is now in `backend/CLAUDE.md` §1, with the rule that no facet may be inferred from another — **employed does not mean payable**, and a member is not automatically a worker.

## The seam

`modules/directory/person-seam.ts` — `resolvePerson(db, orgId, subject)` where the subject is a union of `user` / `worker` / `person`, returning a discriminated `PersonResolution`. A free function taking `db`, matching the shape payroll's existing lib functions already use, so nothing needed DI wiring and no module cycle was introduced.

Payroll's two assertions are now wrappers of four and eight lines. **Their spec passes unedited** — which is the real regression net here, because those mocks pin the exact query chain. That constraint drove the design: the `user` subject issues the same membership lookup then the same worker join, and the `worker` subject issues that join alone. **No payroll path gained a query**, so nothing regressed in a per-payee loop.

The `person` subject is new surface and is the one ticket 14 needs. It resolves identity, the worker facet and employment — and deliberately reports `payable: false` for an employed person who is not a payee. Making that combination payable is ticket 14's decision, not a side effect of this one.

## Verification

- **`payroll-payee-eligibility.spec.ts` — 6/6, unedited.**
- **`person-seam.spec.ts` — 8/8, new.** Covers all three subjects, the employed-but-not-payable case, and that an unknown subject is a value rather than a throw.
- **Tenant scope proved against the real database as the BYPASSRLS owner**, so only the seam's own predicate was filtering — RLS could not mask a missing `orgId`:
  - a real member resolves in their own org, **unresolved in another**
  - a worker with `is_payee = false` → unresolved; flipped to `true` → resolved with worker and linked user; **the same worker in another org → unresolved**; restored to `false` → unresolved again. Seed left as found.

**Blocked by:** None

- [x] One interface resolves a member, a non-member payee, and a person recorded without a login
- [x] An unresolvable subject is a value the caller handles, not a thrown error
- [x] Payroll's existing eligibility assertions keep their signatures and errors, and their specs pass unedited
- [x] Resolution re-asserts tenant scope on every call and never widens the caller's data scope — proved under BYPASSRLS
- [x] A subject id from another organisation resolves as unresolvable — see the note below on the 404/403 tension
- [x] Sensitive person fields stay behind their existing permission gates — satisfied by construction: the seam returns ids, flags and employment number/status only, and no encrypted or bank field, so there is no gated field for it to leak
- [x] The canonical model is written into the rules file so the next feature does not re-decide

## Caught in code review

Both review axes independently flagged the same hole: resolving `{ kind: "user" }` short-circuits on membership, so a member who *also* has a payee worker record came back with `workerId: null` and `isPayeeWorker: false`. Correct for payability, silently wrong for anyone reading those fields.

Rather than spend a second query on the hot payroll path, the result now carries `resolvedVia: "membership" | "payee-worker" | "person-record"`, so a caller can tell a short-circuit from a full lookup — and `{ kind: "person" }` remains the way to get every facet. Pinned by a test.

## Findings for you

- **Criteria 3 and 5 pull against each other.** Criterion 5 wants a foreign subject to surface as not-found, never forbidden; criterion 3 requires payroll's assertions to keep their existing `ForbiddenException`. I kept the wrappers throwing Forbidden — their specs assert it — so the seam *resolves* unresolved and it is new callers that must return 404. If you want payroll to switch to 404 too, that is a deliberate behaviour change and its spec has to change with it.
- **Ticket 14 is now a one-line rule change**, not a model change: give `payable` an employment clause. The plumbing it was blocked on exists.
