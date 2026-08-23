# 10 — Modules ask the seam, not the tables

**What to build:** The contract step. After this, Payroll and Directory reach people through the Person Directory module and nothing else joins across person tables.

Ticket 08 built the seam and ticket 09 made its link trustworthy. Both left the direct table access in place so nothing had to change at once. This finishes the move — otherwise the seam sits beside the thing it replaced and the next person edits whichever they find first.

**Blocked by:** 08 — One way to resolve a person. 09 — The link becomes load-bearing.

**Status:** ready-for-agent

- [ ] Payroll no longer imports HR or directory schema directly; it calls the module. This is the existing repo rule on cross-module access, applied here.
- [ ] Directory read endpoints serve the people directory through the seam, with contractors distinguishable from members in the response.
- [ ] Directory write endpoints that create a person **as an employee** are retired in favour of the HR creation path. Directory writes that create a non-member payee remain — that is the contractor lane and deleting it removes a capability.
- [ ] Removing a capability is a decision, not a side effect. If retiring a write endpoint would drop a real option, stop and say so rather than shrinking scope to make the rule pass.
- [ ] The decision that the HR person and employment model is canonical for members is written into the project rules, so it is not re-litigated.
- [ ] Deletion of the retired paths is proven with a module-graph tool and a real `nest build`, not import search. A bare side-effect import is invisible to a from-based scan and has already cost this codebase a live file.
- [ ] `madge --circular` still reports zero. Promoting a module that both Payroll and HR consume is exactly the shape that introduces a cycle, and `forwardRef` hides one rather than removing it.
- [ ] Payroll's external behaviour is unchanged throughout, proven by its existing tests passing untouched.
