# c3 — One representation of "what may this person do"

Spec: [`docs/specs/c3-one-representation-of-capability.md`](../../docs/specs/c3-one-representation-of-capability.md)

**Candidate status:** half shipped. The wire was fixed the day after the review — the snapshot carries only the scope record and the gating hook reads it. Both *ends* still hold a second copy: the server builds a flat array per request, the client rebuilt one in a different file, and the fetch state is still outside the seam.

Tickets 01→02→03 are an expand→migrate→contract sequence on the server; each stays green because the old form survives until the last one. Tickets 04, 05 and 06 are independent of that chain and of each other.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| — | all six tickets complete and retired | — | **candidate complete** |

**Candidate closed 2026-08-25**, after ticket 04 was falsified, root-caused, fixed and re-measured in one pass.

It had been marked PASS because the dehydrated access snapshot, with real scope keys, was found in the first HTML response. **Finding data in the payload is not the control being rendered** — the served `<body>` was a 3,903-byte full-screen spinner.

The cause was one line, shared with c8 ticket 02: the app hashes every query key with the signed-in scope prefixed (`query-provider.tsx:37`), while every prefetch factory built a plain `new QueryClient()` with the default hash. The snapshot hydrated into the cache holding its data, and `getQueryData` on the identical key returned `undefined`. So `prefetchAccess` was not merely failing to server-render — it was saving nothing at all.

Fixed by moving the scope string and hash function to `lib/query-scope.ts`, a module with neither `"use client"` nor `"server-only"`, because both sides must hash identically. `createAppQueryClient` could not simply be reused on the server: it lives in a `"use client"` module and throws when called from a Server Component, which is very likely how the factories came to use a plain client.

**The proof is the absence of the loading screen.** `dashboard-shell.tsx:166` renders `AppLoadingScreen` when `!access`, so a spinner in the server HTML *is* "access was undefined during SSR". Across five routes, `aria-busy="true"` nodes went 41 → **0** and the stripped `<body>` went 3,903 → 164,000–224,000 bytes.

Two criteria that had never been verified were also closed, including the cross-tenant one: an org-A snapshot is unreadable under an org-B session because `orgId` is in the key.

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Start with 04.** It is one edit to the authenticated layout and it ends the most visible loading artefact in the product. It is cross-referenced from c8, which supplies the mechanism.

**No authority moves in this candidate.** No permission key is added, removed, renamed or re-scoped, and no role template changes. If any ticket here alters anyone's effective access, that is a defect, not a result.

**The test that justifies 01–03** cannot be written today: *an org owner who holds no explicit grant sees all KB page reviews*. It passes now only because someone typed an ownership check into that helper by hand.
