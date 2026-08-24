# Spec — The web app can read the API on the server

Status: **SHIPPED 2026-08-24 — kept only for what is unverified.** V01 and V02 are complete and retired. What remains is V02's browser check: the workers page's loading, empty, error and no-permission states, and that the skeleton still matches the real shape. `next build` passes and the hydration test proves the prefetched cache suppresses the initial fetch, but the states were never driven in a browser. Delete this file once they are.
Date: 2026-08-23
Stream: V · Tickets V01, V02

## Problem Statement

Every screen in the product loads in the same slow shape, and it is not a performance-tuning problem — it is a missing capability.

When someone opens a page, the browser receives an empty frame. Then it downloads and starts the application code. Then it asks who the person is. Then it asks what they are permitted to do. Only then does it ask for the data the page is actually about. Four steps in sequence before the first row of anything appears, every time, on every screen.

During that window the page is a skeleton and every permission-gated control is hidden, so buttons and menus appear a moment after the content does.

The reason nobody has fixed this page by page is that there is no way to. The web app can talk to the API from the browser — that path is well built, with one error format, one timeout, one place that unwraps responses. From the server it can do exactly one thing: fetch the current person's permissions. That single piece of code was written for that single purpose and generalises to nothing.

So a developer wanting to fetch data on the server for their page has to hand-write the credential handling, the address, the response unwrapping, the timeout and the error handling — and get all of it to behave identically to the browser path, or errors will read differently depending on where they happened. Faced with that, everyone reasonably renders on the client instead. The result is that of roughly six hundred screens, more than half are browser-rendered shells, and server-side data loading appears nowhere in the application at all.

This also closes off search-engine visibility for any page that should have it, because a crawler receives the empty frame.

## Solution

Build the missing capability once, and prove it on one screen.

A single way to call the API from the server, with the same credentials handling, the same response unwrapping and — importantly — the same error format as the browser path, sharing one implementation so the two cannot disagree.

Then a page can fetch its data while rendering, hand the result to the browser alongside the HTML, and the existing data-loading code picks it up without refetching. The page's data-loading code, its cache identifiers and its display code are all unchanged. That is the test of whether the capability is the right shape: adopting it should require changing nothing except the page.

One screen is converted, chosen to be representative — a permission-gated, paginated list, which is the commonest screen in the product — so the result generalises. The other screens are deliberately not converted here.

## User Stories

1. As an employee, I want a screen's content present when it appears, so that I am not watching a skeleton on every navigation.
2. As an employee, I want the buttons I may use to be there from the start, so that controls do not appear after the content.
3. As an employee on a slow connection, I want useful content before all the application code has downloaded, so that the product is usable on poor networks.
4. As an employee on a phone, I want fewer round trips before first content, so that mobile feels responsive.
5. As an employee, I want the first screen after signing in to be fast, so that the product feels quick from the start.
6. As an employee, I want an error to read the same wherever it happened, so that a failure is never more confusing on one screen than another.
7. As an employee, I want a page I may not view to say so directly, so that I do not wait through a load to be refused.
8. As an employee, I want loading, empty and error states to keep working, so that this does not trade one rough edge for another.
9. As an employee, I want filters and paging to keep behaving, so that a faster first load does not cost me function.
10. As a visitor to a public page, I want its content in the initial response, so that it can be linked, previewed and indexed.
11. As a marketer, I want public pages indexable, so that the product can be found.
12. As a marketer, I want a shared link to preview correctly, so that links look right in chat and social posts.
13. As a developer, I want one way to call the API from the server, so that I do not invent one per page.
14. As a developer, I want that call to handle credentials for me, so that I do not repeat authentication handling.
15. As a developer, I want server and browser errors to come from one shared implementation, so that they cannot drift apart.
16. As a developer, I want the shared error handling covered by a test comparing both paths, so that drift is caught rather than noticed.
17. As a developer, I want to prefetch data alongside its cache identifier, so that I cannot prefetch under a key the page does not read.
18. As a developer, I want the page's data-loading code unchanged when adopting this, so that conversion is cheap.
19. As a developer, I want the browser not to refetch what the server already sent, so that the work is not done twice.
20. As a developer, I want the existing permissions fetch rebuilt on this capability, so that there is one implementation rather than two.
21. As a developer, I want the permissions fetch to keep failing closed, so that a fault denies access rather than granting it.
22. As a developer, I want the server call marked as server-only, so that it cannot be imported into browser code by accident.
23. As a developer, I want repeated identical calls within one render deduplicated, so that composing components does not multiply requests.
24. As a developer, I want a worked example on a real screen, so that I can copy a pattern rather than infer one.
25. As a developer, I want to know what the conversion actually bought, so that adopting it elsewhere is an informed choice.
26. As a reviewer, I want this proven on one screen first, so that a mistake in the shape is caught before it is repeated.
27. As a security reviewer, I want the server call to derive identity from the session, so that a caller cannot claim to be someone else.
28. As a security reviewer, I want prefetching gated on the same permission as the browser fetch, so that we do not request things the person may not have.
29. As a security reviewer, I want the API to remain the enforcement point, so that prefetching is never mistaken for an access decision.
30. As a security reviewer, I want server-side access checks to remain in place on converted pages, so that nothing is weakened.
31. As a security reviewer, I want no server-side secret exposed to the browser, so that a server capability does not leak configuration.
32. As an operator, I want no additional load on the API, so that moving work to the server does not double the requests.
33. As an operator, I want requests the person cannot make not to be sent, so that we do not generate refusals at volume.
34. As an operator, I want a server-side call to time out, so that a slow API does not hold a page render open.

## Implementation Decisions

**One server-side way to call the API, marked server-only** so it cannot be imported into browser code, and deduplicated per render so composing components does not multiply requests. It takes the person's credentials from the session and never accepts an identity from a caller.

**Response unwrapping and error construction move into one shared implementation used by both paths.** This is the load-bearing decision. Two implementations that must agree will eventually stop agreeing, and the symptom — an error that reads differently depending on where it happened — is exactly the sort of thing nobody files a bug about.

**The existing permissions fetch is rebuilt on the new capability and keeps failing closed.** Its safe-denial fallback is depended on by the authenticated layout; turning that into an error would lock everyone out.

**Prefetching lives with the cache identifier.** A page cannot prefetch under an identifier its data-loading code does not read — that mistake is silent, because the page renders correctly and the browser simply refetches, so it looks like it works while buying nothing.

**Adopting this changes only the page.** Data-loading code, cache identifiers and display code stay as they are. If any of them needs changing, the capability is the wrong shape and that is the finding.

**Prefetching is not an access decision.** The page still performs its server-side access check, and the API still enforces its own. Prefetching is gated on the same permission as the browser fetch, so the product does not generate refusals at volume.

**No new server-side endpoints.** The web app continues to hold no business logic; the only server route remains the authentication bridge.

**Configuration is read outside anything cached**, because cached functions cannot read request-scoped information. The server-side address is a server value, not one exposed to the browser.

**One screen is converted, named before work starts**, chosen as a permission-gated paginated list because that is the commonest shape. Verified against a production build rather than the development server, because caching behaves differently between them.

## Testing Decisions

**A good test here asserts what a person receives** — the content of the first response, whether a second request was made — not how the fetching was arranged internally.

**The equality worth pinning is between the two paths.** For the same API response, the server and browser produce the same error. Driven as a table across the status codes the product actually branches on, including a not-permitted response, a payment-required response, a conflict, a validation failure carrying multiple messages, and an empty body. That table is the entire reason the shared implementation exists, and it is the mutation check: change one path's handling of a single status and the table fails.

**Capability coverage:** a successful response unwraps to its payload; a no-content response yields nothing; with no credentials the call fails closed rather than proceeding anonymously; a slow response times out.

**Adoption coverage on the converted screen:** rows are present in the server-rendered output; the browser does not refetch what was prefetched — **remove the handoff and this must fail**; loading, empty, error and not-permitted states all still work; paging and filters still behave.

**Two traps specific to the web side.** Its type configuration excludes test files, so a clean type check does not prove the tests compile — the suite must be run. And caching behaves differently in development, so verification is against a production build.

**Record what it bought.** Time to first content before and after, however roughly measured. If it was not measured, say so rather than claiming the improvement — a capability nobody can demonstrate a gain from will not be adopted on the remaining screens, which is the entire point of building it.

## Out of Scope

- Converting any screen beyond the one named. The remaining several hundred are a separate, incremental effort.
- Broadening search-engine metadata beyond what the converted screen needs.
- Any business logic, endpoint or data access in the web app.
- Replacing the browser-side data-loading library.
- Changing how long data is considered fresh.
- The known caching hazard when a person switches organisation, which is separately recorded.

## Further Notes

This is the only stream in the set that is about a capability that does not exist, rather than one that exists and is bypassed. That changes how to judge it: there is nothing to compare against, so the measure of success is whether the second screen is cheap to convert.

Worth being clear about what this is not. It is not a rewrite, and it is not a move away from browser-side data loading. The existing approach stays and keeps owning data in the browser. This adds the ability to give it a head start.
