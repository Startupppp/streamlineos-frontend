# 05 — The API surface is not published in production

**What to build:** The interactive API documentation is unreachable in production, and realtime relay credentials are issued server-side rather than being reachable by the client.

**Blocked by:** None — can start immediately

**Status:** done — verified already-complete; no code changes were needed

## Acceptance criteria

- [x] API documentation returns not-found in a production configuration, asserted conditionally. — `backend/src/main.ts:90`: the whole Swagger block (`DocumentBuilder`, `SwaggerModule.createDocument`, `SwaggerModule.setup("api/docs", …)` at `:99`) sits inside `if (isDevelopment)`, where `isDevelopment = config.NODE_ENV === "development"` (`:41`). Outside development the route is never registered at all, so it 404s by construction rather than by a guard that could be misconfigured.
- [x] Relay credentials are never present in a client bundle or a client-readable response. — `ABLY_API_KEY` is read server-side only (`backend/src/modules/realtime/ably.service.ts:18`) and never returned; the client receives a scoped, expiring token request via `auth.createTokenRequest(...)` (`:54`). Grepping `frontend/` source for `NEXT_PUBLIC_ABLY` / `ABLY_API_KEY` returns nothing — the only match anywhere is inside `frontend/node_modules/ably/…/sample-app`, vendor sample code that is not part of our bundle.
- [x] Neither change affects local development. — Swagger remains mounted when `NODE_ENV === "development"`; the Ably path is unchanged in all environments.

## Todo

- [x] Gate the documentation route on environment — `main.ts:90`
- [x] Move credential issuance server-side — `ably.service.ts:18,54`
- [x] Grep the client bundle to confirm the credential is absent — no `NEXT_PUBLIC_ABLY`/`ABLY_API_KEY` in `frontend/` source; only a vendor sample inside `node_modules`
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Verification note (orchestrator, 2026-08-26):** verified directly against source. This ticket was restored from git history after a concurrent process deleted it; the restored copy came back in its pre-work state, so the evidence above was re-established from source rather than trusted from a prior report.

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
