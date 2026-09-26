# External Client Invitation

## Route decision

- **Current route:** `/accept-invitation`
- **Scope:** external invitation
- **Disposition:** **KEEP**
- **Decision:** Keep; use a single-use, short-lived token exchange and replace the URL immediately.
- **User job:** Accept my invitation securely and enter the client portal.
- **Evidence:** `frontend/app/(portal)/accept-invitation/page.tsx`

## Product contract

- **Purpose:** Exchange a single-use invitation for a bounded portal session.
- **Primary persona:** Invited client
- **Success metric:** Invitation acceptance rate; zero replay or token leakage incidents.
- **Core fields:** invitation token, failure reason, resulting portal session token.

## Above-the-fold text wireframe

```text
Product/organization identity                 Session/share state and accessible actions
Page title and one-line status                Primary action, when authorized
Compact tabs or filters backed by URL
Bounded content or focused form
Inline validation / freshness / submission state
```

Identity and authorization state come first. Public pages omit the internal application sidebar, internal identifiers, hidden counts, and any control the grant cannot use.

## Elements and interactions

- Identity/header: links only to destinations inside the same authorization boundary.
- Repeated content: title opens the durable detail when one exists; compact actions expose a visible button and equivalent keyboard path.
- Form fields: inline validation on blur and submit; preserve non-sensitive input after retryable failures.
- Dialog: destructive confirmation or focused form of at most five fields. Sheet: contextual multi-section work where the source must remain visible. Popover: compact reversible selection. Full page: durable collaboration, complex authoring, or an authorization-boundary transition.
- Public-token and invitation values are never displayed, copied, logged, placed in analytics payloads, or retained in browser history after exchange.
- Non-interactive: published timestamps, immutable audit facts, permission explanations, and calculated totals.

## URL state

Deep-linkable state: `token` is consumed once and removed through `router.replace`; `reason` may explain a prior session failure. Selection, drafts, session credentials, open menus, and unsaved input do not belong in the URL.

## Bulk, keyboard, and context actions

- No bulk actions unless the page exposes a repeated collection and the grant explicitly permits a real repeated operation.
- Keyboard: `Tab` follows visual order, `Enter` activates the focused primary action, `Esc` closes overlays, and `/` focuses search only when search exists.
- Context menus never reveal hidden entities or actions and never provide the only route to a command.

## States

- Loading: geometry-matched skeleton; never flash unauthorized data from another token or identity.
- Empty: distinguish no grant/no publication, valid empty collection, and filtered no results without leaking record existence.
- First run: one useful action for the authorized operator; external viewers get a clear contact path.
- Error: preserve stable error code and request ID; distinguish expired/revoked credentials, rate limiting, and retryable server failure.
- Permission denied/not found: use an indistinguishable public 404 where existence is sensitive; authenticated internal pages use the standard denied state.
- Offline: preserve last authorized read with freshness; keep local form drafts, but never queue access, publication, financial, or destructive mutations.

## Permissions

| Actor | View | Create/contribute | Edit | Delete/administer |
|---|---:|---:|---:|---:|
| Organization or Build admin | Yes, through internal route | Yes | Yes | Yes, with invariants |
| Build member | Only with possession of a valid unexpired invitation; no Build member permission | Only explicit capability | Only explicit capability | No by default |
| External portal identity | Active grant only | Bounded request/comment | Own contribution when allowed | No |
| Anonymous share holder | Published/token projection only | Token capability only | Token capability only | No |

Server guards, token/grant status, tenant scope, source ACL, expiry, and record lifecycle are authoritative on every request.

## Components

- Page/source: `frontend/app/(portal)/accept-invitation/page.tsx`.
- Reuse: `PageState`, `LoadingState`, `ErrorState`, `EmptyState`, accessible form controls, `ConfirmDialog`, focus management, and the shared public/portal shell where the boundary matches.
- New only when needed: capability-status banner, expired-link recovery, redacted request diagnostic, and abuse-safe submission receipt.

## API and data contract

- **Endpoints:** `POST /portal/auth/accept-invitation`.
- **Client evidence:** `frontend/hooks/api/portal/use-accept-invitation.ts`, `frontend/lib/portal-api-client.ts`.
- Read responses use `{ data, meta: { requestId, revision? } }`; bounded collections add `pageInfo: { nextCursor, hasMore }`.
- Writes use a shared Zod schema on client and server, a request ID, rate limiting for anonymous callers, and an idempotency key where retries could duplicate work.
- Cache keys include the opaque identity/grant scope, route resource, normalized filters, cursor, and publication revision. Never share authenticated and public caches.
- Revoke, expiry, publication, ACL, and source-record changes invalidate the exact projection immediately.

## Gaps

- **P0:** Token storage is client-managed; threat-model storage, replay protection, revocation, and redaction from logs/analytics.
- **P0:** Add authorization-boundary contract tests, token/grant lifecycle tests, schema parity, rate-limit behavior, and non-disclosure 404 tests.
- **P1:** Complete URL-backed filters where specified, keyboard/focus behavior, mobile layout, accessible alternatives, recovery, and observability without secret values.
- **P2:** Add realtime only for collaborative/high-change content and only with revisioned events plus gap recovery.

## Acceptance criteria

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
- [x] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
- [x] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
- [ ] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
