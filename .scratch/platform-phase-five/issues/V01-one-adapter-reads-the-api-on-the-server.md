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
**Status:** ready-for-agent

- [ ] `lib/server-fetch.ts` is marked `import "server-only"` and wrapped in React `cache()` for per-request dedupe — the pattern `getServerAccess` already uses.
- [ ] It reads the session's `backendJwt`. It never accepts an actor id or an org id from a caller.
- [ ] **Envelope unwrap and `ApiError` construction move to one module that both `api-client.ts` and `server-fetch.ts` import.** Two parsers that must agree will stop agreeing; that is the whole reason this is one ticket and not two.
- [ ] An error from the server path surfaces through `getErrorMessage` identically to the client path.
- [ ] `getServerAccess` is refactored onto the adapter and **keeps its fail-closed `DENIED` fallback** — the authenticated layout gate depends on it, and a fallback that becomes a throw locks everyone out.
- [ ] No business Server Action and no business Route Handler is added. The only `route.ts` stays NextAuth / auth-bridge.
- [ ] A cached function never reads `cookies()` / `headers()`. The token is read outside and passed in.
- [ ] The property test: **the server and client parsers produce the same `ApiError` for the same response** — a table over status codes, 401 / 402 / 403 / 404 / 409 / 500, plus a `string[]` message body and an empty body.
- [ ] A test asserts the adapter fails closed with no token.
- [ ] A test asserts a success envelope unwraps to `data` and a `204` yields `undefined`.
- [ ] Mutation check: change one parser's 402 mapping and the equality table fails.
- [ ] `NEXT_PUBLIC_API_URL` is not read by the server adapter — a server-side base URL is not a client-inlined variable. Use the existing `BACKEND_URL`.
- [ ] Web `tsc --noEmit` exit 0 **and the web suite runs**. `tsconfig.json` excludes test files, so a clean typecheck does not prove the tests compile.
- [ ] No page is converted in this ticket.
