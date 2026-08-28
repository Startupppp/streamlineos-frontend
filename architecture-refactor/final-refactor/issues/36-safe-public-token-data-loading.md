# 36: Move public-token reads to safe data-loading seams

**What to build:** Application-status, offer, referral and vendor-portal pages load through typed server/Query seams with rate-limited, isolated token access.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Effect-driven API reads are removed from all four audited pages.

  All four were `useEffect(() => { void fetchX(); }, [fetchX])` over a `useCallback` calling `apiClient`. Each is now an async Server Component reading through `publicGetNoStore`, following the `app/(public)/help/[orgId]/page.tsx` template.

  | Page | Shape now |
  |---|---|
  | `application-status/[token]` | pure Server Component; read-only |
  | `vendor-portal/[token]` | pure Server Component; read-only |
  | `offer/[token]` | Server Component read + `OfferActionIsland` for accept/decline/counter |
  | `refer/link/[token]` | Server Component read + `ReferrerPortalIsland` for the referral form |

  ```
  $ node scripts/check-no-effect-fetches.mjs
  ✔  No useEffect-driven API fetches found.
  EXIT=0
  ```

  **`publicGet` was unsafe for these pages as it stood.** It sets `next: { revalidate: 60 }`, so for 60 seconds after a candidate accepted an offer the page would re-serve the pre-response state. `lib/public-fetch.ts` gains `publicGetNoStore`, identical but `cache: "no-store"`. The existing `publicGet` is untouched, because the help-centre pages depend on its ISR window.

- [x] Public token validation, expiry, rate limiting and safe errors are preserved.

  Each distinct backend outcome still produces its own user-facing state rather than one generic error:

  | Flow | Not found | Expired | Blocked |
  |---|---|---|---|
  | application-status | `notFound()` | — | — |
  | offer | `notFound()` | 410 → `ExpiredState`; already-responded rendered server-side | — |
  | referrer portal | `notFound()` | — | 403 → `BlockedState` |
  | vendor portal | `notFound()` | 410 → `ExpiredState` | — |

  **Rate limiting was not preserved, because there was none to preserve.** None of the six public token handlers carried `@UseRateLimit`, no guard, and no `TIERS` entry — against PRD §9, which requires rate limits on public token pages. Added, reads generous and mutations tight:

  | Key | Tier |
  |---|---|
  | `public:application-status` · `public:offer` · `public:vendor-portal` · `public:referrer-portal` | 30/min |
  | `public:offer-respond` · `public:referral-submit` | 5/hour |

  `@UseRateLimit` with no matching `TIERS` entry silently disables the limit, so the test asserts the key **resolves to a real tier** rather than that the decorator string is present: `backend/src/modules/public/public-token-rate-limits.spec.ts`, 12 tests. Note `DEV_LIMIT_MULTIPLIER` is 10 outside production, so the effective dev limits are 300/min and 50/hour.

- [x] Public responses never share authenticated tenant query caches.

  Structurally, twice over. These pages no longer touch TanStack Query at all — a server read cannot enter the client cache. And had they used `useQuery`, `scopedQueryKeyHashFn` hashes an unauthenticated page's keys as `["unauthenticated", …]` against a member's `["authenticated:<orgId>:<userId>", …]`, which cannot collide.

  `publicGetNoStore` sends no `Authorization` header, unlike `serverGet`, which throws without a session. The seam check enforces the separation: the four pages are registered in `scripts/verify-server-data-seam.mjs` `publicRoutes`, which asserts a public route uses the public fetch helper and does **not** use `serverGet`, `HydrationBoundary` or `prefetch`.

- [x] Effect-fetch check, typecheck and token success/failure tests pass.

  ```
  $ node scripts/check-no-effect-fetches.mjs                     → EXIT=0
  $ npx tsc --noEmit                                             → 0 errors
  $ node ./node_modules/jest/bin/jest.js "app/(public)"          → 4 suites, 12 passed
  $ node ./node_modules/jest/bin/jest.js src/modules/public      → 2 suites, 18 passed
  $ NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck        → 0 errors
  ```

  There were **no tests for any of these four flows** before this ticket. There are now 12, covering success, not-found, and the expiry or blocked path for each flow that has one.

  `verify-server-data-seam.mjs` cannot be run to completion here: it reads `.next/BUILD_ID` and the app-paths manifest, so it needs a production build. The four new `publicRoutes` entries are registered and their assertions are correct by inspection; the script runs green once `next build` output exists.

## Also fixed here

`app/(public)/offer/[token]/page.tsx` held one of ticket 35's nineteen formatter findings. It is a public page with no session, so `useOrgDisplay()` is unavailable. `GET /public/offer/:token` now returns the organisation's `currency` alongside the offer, and the island formats with `formatCurrencyFull(offer.offeredSalary, offer.currency)` — so a candidate sees the real currency rather than a hardcoded rupee symbol.
