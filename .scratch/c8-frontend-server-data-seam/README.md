# c8 — Give the frontend a server-data seam

Spec: [`docs/specs/c8-frontend-server-data-seam.md`](../../docs/specs/c8-frontend-server-data-seam.md)

**Candidate status:** the seam is built; the rollout is at one route. The server read adapter exists, a prefetch factory exists, and one route prefetches and hydrates with a test proving both the hydrated and the un-hydrated path. The counts the review measured are unchanged: 590 pages, 343 of them client shells.

The review's finding was "the seam does not exist yet". It exists now, so the question has moved from whether to build it to which routes deserve it — a smaller question that should be answered with a named list rather than a sweep.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 02 | [The lists people wait on arrive with their rows](issues/02-high-traffic-lists-render-rows-server-side.md) | 01 | **REOPENED** — the central criterion was ticked without proof and is false |
| 03 | public help-centre pages render server-side | 01 | **done and retired** |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Ticket 03 closed 2026-08-25, verified on a live public response.** Article prose, `<h2 id="introduction">` and `<li>First step</li>` are all present in the first HTML with no JavaScript. The same request proves the sanitiser, because the stored article was seeded with an attack payload: `<script>` **stripped**, `javascript:` href **stripped**, `onclick` **stripped**, `<iframe>` **stripped**, and the legitimate `https://example.com` link **kept**. The backend does not sanitise KB HTML on write, so this allowlist is the only barrier on that page — worth proving against a real response rather than a mock.

**Ticket 02 was reopened by that same session.** Curling `/settings/roles` with 45 roles in the database returned `<table>` × 0, `<tbody>` × 0, `<tr>` × 0; the role names appear only inside the dehydrated JSON. `/directory/workers` — the pre-existing worked example, not one of the four converted here — behaves identically, so the pattern has never produced server-rendered rows. Root cause is in the shell, not the prefetch: `dashboard-shell.tsx:166` serves `<AppLoadingScreen>` while `useAccess()` has no data, so every authenticated route server-renders a spinner. Details and evidence are in the ticket.

**The generalisable lesson from 02:** both halves of its test pair passed the whole time. They assert the prefetch populates the cache; nothing asserted a row reached the markup. A criterion that says "first HTML response" can only be closed by reading the HTML.

**The highest-leverage prefetch in the product is not in this candidate.** Hydrating the access snapshot at the authenticated layout is one edit that ends the gated-control flash on every authenticated page. It is tracked as **c3 ticket 04**, because the flash is c3's problem — but it uses this candidate's mechanism, and it is the single most valuable thing to do first.

**Do not convert 343 pages.** Treating that as the goal is how this candidate becomes a quarter of churn for no measured gain.
