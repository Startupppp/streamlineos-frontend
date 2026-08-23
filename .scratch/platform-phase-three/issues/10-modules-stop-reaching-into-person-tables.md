# 10 — Modules ask the seam, not the tables

**What to build:** The contract step. After this, Payroll and Directory reach people through the Person Directory module and nothing else joins across person tables.

Ticket 08 built the seam and ticket 09 made its link trustworthy. Both left the direct table access in place so nothing had to change at once. This finishes the move — otherwise the seam sits beside the thing it replaced and the next person edits whichever they find first.

**Blocked by:** Nothing — 08 and 09 turned out to be already shipped. This is the only open ticket in the stream.

**Status:** WON'T DO AS WRITTEN — the rule is wrong for these three files, and forcing it would cost more than it buys.

> Ticket 11 shipped the batch identity read this ticket was waiting for, so the N+1 objection is gone. With it available, each of the three files was examined again and each fails for a **different, concrete reason**:
>
> **`lib/payroll-run-payee.ts`** — today one join from `payroll_run_employees` assembles every payee's identity, `workerNumber`, and bank details. The seam serves identity and refuses the other two **by design** (ticket 11 has a test asserting bank details never come back). A seam-based version needs the seam query *plus* a `workers` read for `workerNumber` *plus* a `users` read for the linked payee's bank details — three or four queries where there is now one, and `workers` and `hr_employee_sensitive_fields` are still imported. Strictly worse on every axis this ticket cares about.
>
> **`filings/filings.service.ts`** — needs `employmentId` and `employeeNumber` for a batch of users. `resolvePerson` returns employment for **one** subject; the batch read deliberately returns identity and flags only. Serving this means widening the batch read to carry employment, which is a real design decision about what the seam owns, not a mechanical migration.
>
> **`runs/profiles.service.ts`** — filters with `ILIKE` on `display_name`, `first_name`, `last_name` and `work_email`. **A resolution seam cannot serve a search predicate.** Searching requires the predicate in the SQL against the indexed columns; routing it through a resolver means loading candidates first, which is the opposite of what an index is for. This one is not a matter of effort — the shape is wrong.
>
> **What the underlying goal was**, and what would actually serve it: the goal is one owner of person joins so the two person generations cannot drift. The seam achieves that for *resolution*, which is the question with a correctness risk — "is this person payable" now has one answer. Projection and search are different questions with no correctness risk, and forcing them through the same door buys consistency at the cost of query count and index use.
>
> If this is reopened, the honest scope is a **directory read module** exposing batch projection *and* search — not the resolution seam. That is a larger piece of design than this ticket, and it should be decided rather than inherited.
>
> Nothing was changed in payroll. The three files still import HR and directory schema, deliberately.

