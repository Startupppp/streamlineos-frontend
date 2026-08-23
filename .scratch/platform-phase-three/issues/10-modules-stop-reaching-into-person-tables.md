# 10 — Modules ask the seam, not the tables

**What to build:** The contract step. After this, Payroll and Directory reach people through the Person Directory module and nothing else joins across person tables.

Ticket 08 built the seam and ticket 09 made its link trustworthy. Both left the direct table access in place so nothing had to change at once. This finishes the move — otherwise the seam sits beside the thing it replaced and the next person edits whichever they find first.

**Blocked by:** Nothing — 08 and 09 turned out to be already shipped. This is the only open ticket in the stream.

**Status:** BLOCKED — the seam cannot answer this shape of question yet.

> **Do not implement this ticket as written.** Verified 2026-08-23: `resolvePerson(db, orgId, subject)` resolves **one** subject. The payroll code this ticket targets does not resolve one person — it runs **one batched query per payroll run** that joins `organization_people` and `users` to project display name, work email, employee id, designation, joining date and bank details for *every* payee at once (`lib/payroll-run-payee.ts:85-119`).
>
> Replacing that with `resolvePerson` per payee turns one query into N, each of which issues its own lookups, on the payroll run path for an organisation that may have hundreds of employees. That breaks backend §3 ("No N+1") and §7, and it would be a real regression on money-adjacent code — a worse outcome than the direct import this ticket exists to remove.
>
> The three files are `lib/payroll-run-payee.ts` (24 references), `filings/filings.service.ts` (21) and `runs/profiles.service.ts` (16). An earlier audit named six files; three of those were wrong.
>
> **Prerequisite: ticket 11.** The seam needs a batch identity read — many subjects, one query — before any of this is safe. Once that exists this ticket is mechanical.

Verified still open 2026-08-23: `payroll/filings/filings.service.ts` joins `hrPeople` directly (lines 20, 460-476) and `payroll/lib/payroll-run-payee.ts` imports `organizationPeople` and `hrPeople` (lines 8-11).

- [ ] Payroll no longer imports HR or directory schema directly; it calls the module. This is the existing repo rule on cross-module access, applied here.
- [ ] Directory read endpoints serve the people directory through the seam, with contractors distinguishable from members in the response.
- [ ] Directory write endpoints that create a person **as an employee** are retired in favour of the HR creation path. Directory writes that create a non-member payee remain — that is the contractor lane and deleting it removes a capability.
- [ ] Removing a capability is a decision, not a side effect. If retiring a write endpoint would drop a real option, stop and say so rather than shrinking scope to make the rule pass.
- [ ] The decision that the HR person and employment model is canonical for members is written into the project rules, so it is not re-litigated.
- [ ] Deletion of the retired paths is proven with a module-graph tool and a real `nest build`, not import search. A bare side-effect import is invisible to a from-based scan and has already cost this codebase a live file.
- [ ] `madge --circular` still reports zero. Promoting a module that both Payroll and HR consume is exactly the shape that introduces a cycle, and `forwardRef` hides one rather than removing it.
- [ ] Payroll's external behaviour is unchanged throughout, proven by its existing tests passing untouched.
