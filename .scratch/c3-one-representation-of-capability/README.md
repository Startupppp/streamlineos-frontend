# c3 — One representation of "what may this person do"

Spec: [`docs/specs/c3-one-representation-of-capability.md`](../../docs/specs/c3-one-representation-of-capability.md)

**Candidate status:** half shipped. The wire was fixed the day after the review — the snapshot carries only the scope record and the gating hook reads it. Both *ends* still hold a second copy: the server builds a flat array per request, the client rebuilt one in a different file, and the fetch state is still outside the seam.

Tickets 01→02→03 are an expand→migrate→contract sequence on the server; each stays green because the old form survives until the last one. Tickets 04, 05 and 06 are independent of that chain and of each other.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [One function answers whether a person holds a permission](issues/01-access-service-answers-holds-and-scope-for.md) | — | ready-for-agent |
| 02 | [Capability checks inside services stop reading the request object](issues/02-the-five-read-sites-move-onto-the-seam.md) | 01 | ready-for-agent |
| 03 | [The flat permission array stops existing on the server](issues/03-delete-the-flat-permission-array.md) | 02 | ready-for-agent |
| 04 | [Gated controls are there in the first paint](issues/04-access-is-prefetched-on-the-server.md) | — | ready-for-agent |
| 05 | [The flat permission array stops existing on the client too](issues/05-delete-use-permissions.md) | — | ready-for-agent |
| 06 | [A list narrowed to my own records says so](issues/06-crm-leads-reads-use-scope.md) | — | ready-for-agent |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Start with 04.** It is one edit to the authenticated layout and it ends the most visible loading artefact in the product. It is cross-referenced from c8, which supplies the mechanism.

**No authority moves in this candidate.** No permission key is added, removed, renamed or re-scoped, and no role template changes. If any ticket here alters anyone's effective access, that is a defect, not a result.

**The test that justifies 01–03** cannot be written today: *an org owner who holds no explicit grant sees all KB page reviews*. It passes now only because someone typed an ownership check into that helper by hand.
