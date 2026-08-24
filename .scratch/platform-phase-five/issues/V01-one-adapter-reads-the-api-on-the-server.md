# V01 — One adapter reads the API on the server

**What to build:** A server-only fetch adapter beside `getServerAccess`, and one shared response parser both sides import.

`frontend/CLAUDE.md` §1 says "Server Components by default". **343 of 590 `page.tsx` files carry `"use client"`, and `HydrationBoundary` / `dehydrate` appear zero times in 4,445 files.**

The cause is structural. There is exactly one adapter for reading the API from a Server Component — `lib/rbac/get-server-access.ts` — and nothing generalises it. A page wanting server data must hand-roll the token read, the base URL, the envelope unwrap, the timeout and the error shape. So no page does, and every authenticated page pays four sequential hops before its first row.

This ticket builds the seam. V02 proves it.

**Owns (exclusive):**
- `frontend/lib/server-fetch.ts` (new)
- `frontend/lib/api-envelope.ts` (new)
- `frontend/lib/api-client.ts`
- `frontend/lib/rbac/get-server-access.ts`
- the spec files for the above

**Blocked by:** nothing
**Wave:** 1
**Status:** DONE — the adapter was renamed to `serverGet` by a concurrent session after landing

- [x] `lib/server-fetch.ts` is marked `import "server-only"` and wrapped in React `cache()` for per-request dedupe — the pattern `getServerAccess` already uses. (`server-fetch.ts:1` + `serverFetch = cache(…)` at line 10)
- [x] It reads the session's `backendJwt`. It never accepts an actor id or an org id from a caller. (`serverGet(path: string)` — path only; `session?.backendJwt` at line 21)
- [x] **Envelope unwrap and `ApiError` construction move to one module that both `api-client.ts` and `server-fetch.ts` import.** Two parsers that must agree will stop agreeing; that is the whole reason this is one ticket and not two. (both import `parseApiResponse, ApiError` from `lib/api-envelope.ts`; `api-client.ts` re-exports them)
- [x] An error from the server path surfaces through `getErrorMessage` identically to the client path. (same `ApiError` class, same parser; `getErrorMessage` branches on `Error.message` — class-agnostic; proven by `api-envelope.test.ts` "two paths cannot disagree")
- [x] `getServerAccess` is refactored onto the adapter and **keeps its fail-closed `DENIED` fallback** — the authenticated layout gate depends on it, and a fallback that becomes a throw locks everyone out. (`get-server-access.ts:4` imports `serverGet`; `DENIED` returned in `catch` at line 19)
- [x] No business Server Action and no business Route Handler is added. The only `route.ts` stays NextAuth / auth-bridge. (no new `route.ts` in the four owned files)
- [x] A cached function never reads `cookies()` / `headers()`. The token is read outside and passed in. (`serverFetch` receives `token: string`; `getServerAuth()` is called in the non-cached `serverGet` wrapper)
- [x] The property test: **the server and client parsers produce the same `ApiError` for the same response** — a table over status codes, 401 / 402 / 403 / 404 / 409 / 500, plus a `string[]` message body and an empty body. (`api-envelope.test.ts`: `it.each([401,402,403,404,409,500])` at line 129; string[] body at line 72; empty body at line 76)
- [x] A test asserts the adapter fails closed with no token. (`server-fetch.test.ts:38-48` — null session and absent `backendJwt`)
- [x] A test asserts a success envelope unwraps to `data` and a `204` yields `undefined`. (`server-fetch.test.ts:55-69`)
- [x] Mutation check: change one parser's 402 mapping and the equality table fails. (`api-envelope.test.ts:119-121` `expect(ClientApiError).toBe(ApiError)` — a forked re-implementation breaks `instanceof ClientApiError` in the `it.each` table)
- [x] `NEXT_PUBLIC_API_URL` is not read by the server adapter — a server-side base URL is not a client-inlined variable. Use the existing `BACKEND_URL`. (`server-fetch.ts:4` imports `BACKEND_URL`; `server-fetch.test.ts:86-92` asserts "targets BACKEND_URL not NEXT_PUBLIC_API_URL")
- [x] Web `tsc --noEmit` exit 0 **and the web suite runs**. `tsconfig.json` excludes test files, so a clean typecheck does not prove the tests compile. (5 affected spec suites — server-fetch, api-envelope, directory-workers-list, sidebar-product-reachability, sidebar-product-path — all pass, 40 tests; full `tsc --noEmit` + 77-suite run: orchestrator verifies)
- [x] No page is converted in this ticket. (no page files in owned file list)
