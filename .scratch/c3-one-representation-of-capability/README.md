# c3 — One representation of "what may this person do"

Spec: [`docs/specs/c3-one-representation-of-capability.md`](../../docs/specs/c3-one-representation-of-capability.md)

**Candidate status:** half shipped. The wire was fixed the day after the review — the snapshot carries only the scope record and the gating hook reads it. Both *ends* still hold a second copy: the server builds a flat array per request, the client rebuilt one in a different file, and the fetch state is still outside the seam.

Tickets 01→02→03 are an expand→migrate→contract sequence on the server; each stays green because the old form survives until the last one. Tickets 04, 05 and 06 are independent of that chain and of each other.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 04 | [Gated controls are there in the first paint](issues/04-access-is-prefetched-on-the-server.md) | — | **REOPENED** — true after hydration, false in the server HTML |

**Ticket 04 reopened 2026-08-25.** An earlier pass marked its first-paint criterion PASS because the dehydrated access snapshot, with real scope keys, was found in the first HTML response. Finding data in the payload is not the control being rendered. Curl shows the served `<body>` is a full-screen spinner — same root cause as c8 ticket 02. Two other criteria that had never been verified *were* closed in the same pass, including the cross-tenant one: an org-A snapshot is unreadable under an org-B session because `orgId` is in the query key.

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Start with 04.** It is one edit to the authenticated layout and it ends the most visible loading artefact in the product. It is cross-referenced from c8, which supplies the mechanism.

**No authority moves in this candidate.** No permission key is added, removed, renamed or re-scoped, and no role template changes. If any ticket here alters anyone's effective access, that is a defect, not a result.

**The test that justifies 01–03** cannot be written today: *an org owner who holds no explicit grant sees all KB page reviews*. It passes now only because someone typed an ownership check into that helper by hand.
