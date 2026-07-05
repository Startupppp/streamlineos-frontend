# StreamlineOS PRD (v3 · Clean · Implementation-Grade)
## Authentication · Invitations · Onboarding → Correct Landing (Owner/Member/Platform)

**Owner (PM)**: StreamlineOS Platform  
**Owner (Eng)**: Identity / Platform  
**Status**: Implementation-ready  
**Last updated**: 2026-07-01  
**Scope**: Frontend `frontend/` + Backend `streamlineos-api` (NestJS)

## UI/UX source of truth

- **Source of truth**: [PRD-ui-ux-system.md](./PRD-ui-ux-system.md)
- **Canonical UI references**: `/signin` and `/signup`

---

## 0) Canonical implementation prompt (paste into Claude Code)

> Implement StreamlineOS Authentication, Invitations, and Onboarding end-to-end. Treat `CLAUDE.md` as constitution. Follow the strict workflow: for any page touched: AUDIT → PLAN → wait for confirmation → implement → run build+lint+typecheck → update `PAGES.md`. Backend owns all business logic + DB schema + migrations; frontend is UI + TanStack Query hooks only; frontend `app/api/**` is auth-bridge only. Strict TypeScript, no `any`, no `@ts-ignore`, no casting hacks, no non-null assertion abuse, no anonymous event handlers, no code comments; remove dead code.  
>
> UI/UX: Follow [PRD-ui-ux-system.md](./PRD-ui-ux-system.md) as the UI source of truth. `/signin` and `/signup` are the canonical reference for spacing density, card layout, hover/active/focus states and contrast. Fix inconsistent spacing (especially double-padding in Sheets), hover colors, icon hover states.  
>
> Functional goal: Make signup→verify→auto-login→org-setup→invite and invite→accept→auto-login→onboarding→dashboard flows correct and resilient. Standardize password policy and token flows. Replace brittle error string parsing with stable error codes. Make verification/reset/invitation/magic-link emails reliable via a queue with retries + DLQ + alerts. Add backend e2e coverage for all critical auth flows (success + failure + edge cases).  
>
> Deliverables: (1) backend endpoints + Zod/DTO validation + rate limits + audit events + queue-backed email, (2) frontend pages + hooks wired through existing `apiClient`, (3) middleware routing correctness, (4) build/lint/types green, (5) tests green, (6) `PAGES.md` updated for touched pages.

---

## 1) Product intent (why this exists)

Auth is the “front door” of StreamlineOS. It must feel polished, be tenant-safe, and never strand users in broken loops. This PRD rebuilds auth/onboarding as a **single coherent identity system** supporting:
- SMB self-serve signup,
- invitation-based org membership,
- secure password and token flows,
- correct role-based landing,
- onboarding gates,
- future enterprise requirements (SSO/SCIM ready, not shipped here).

---

## 2) What must be true after shipping (outcomes)

### 2.1 User outcomes
- A new customer can go from signup to dashboard in **< 3 minutes**.
- An invited user can accept invite and reach dashboard in **< 2 minutes**.
- Password reset never fails silently and never allows token replay.
- Users are never shown modules they don’t have (module gating) and never see onboarding flows they shouldn’t.

### 2.2 Engineering outcomes
- One password policy, one error model, one token model.
- No duplicated endpoints or “same flow in 2 places”.
- DB queries are indexed, bounded, and tenant-scoped.
- Emails are sent via queue with retries and observability.
- Critical flows have backend e2e tests.

---

## 3) Non-goals (explicitly excluded)

- Shipping SAML/OIDC enterprise SSO now (design for it only)
- Shipping SCIM provisioning now (design for it only)
- Shipping WebAuthn/passkeys now
- Rewriting the entire product UI (auth/onboarding pages only; wider UI work is a separate, page-by-page program)

---

## 4) Reference constraints from `CLAUDE.md` (must be followed)

- **Backend owns business logic + schema**; frontend is UI + hooks only.
- **AuthZ must be enforced in backend** for every read/write (middleware is bypassable).
- **Strict TS**; no `any`, no `@ts-ignore`, no casting hacks.
- **No comments in code**; delete dead code.
- **Work page-by-page and audit-first**.
- **UI tokens** come from landing + `/signin` + `/signup` (no invented colors/spacing).

---

## 5) Glossary

- **Org**: Organization (tenant/workspace). Always tenant-scoped.
- **Member**: User membership in an org, with role and permissions.
- **Platform owner**: Global super-admin (`/owner` landing).
- **Org owner**: Tenant owner; must complete org setup.
- **Onboarding**:
  - Org onboarding: org owner setup (`orgOnboardingCompletedAt`)
  - User onboarding: member onboarding (`userOnboardingCompletedAt`)
- **Auto-login token**: short-lived, single-use token that allows NextAuth credential sign-in without password.

---

## 6) Personas (who uses this)

- **Org Owner (SMB buyer)**: signs up, verifies email, completes org setup, invites team.
- **Invited Member (new)**: accepts invite, sets password, completes onboarding.
- **Invited Member (existing)**: signs in, accepts invite to join another org.
- **Platform Owner**: lands on `/owner`, never sees member onboarding.
- **Future Enterprise IT Admin**: requires SSO + SCIM later; we keep the model compatible.

---

## 7) UI/UX standards (must be consistent)

### 7.1 Canonical reference
UI source of truth: [PRD-ui-ux-system.md](./PRD-ui-ux-system.md).

Use `/signin` and `/signup` as the canonical reference for:
- card density and spacing,
- hover/active/focus contrast,
- icon hover behavior,
- inline validation styles and error text sizing.

### 7.2 Interaction rules
- No dialogs for primary auth flows.
- MFA is an **inline step** in the sign-in screen (not a modal).
- Success/failure states are rendered inline inside the same card layout.
- Buttons must have consistent hover/active states and focus-visible rings.

### 7.3 Sheet/Dialog rules (auth-adjacent screens)
- Small forms → Dialog, large/multi-section → Sheet.
- Avoid double-padding in Sheets (sheet padding + inner card padding).

---

## 8) Route map & landing rules (frontend)

### 8.1 Auth routes (public)
- `/signup`
- `/verify-email`
- `/signin`
- `/forgot-password`
- `/reset-password`
- `/setup-password`
- `/invitation/[token]`
- `/magic-link` (optional UI surface)

### 8.2 Authenticated routes (protected)
- `/post-signin` (server router)
- `/org-setup` (org owner only until complete)
- `/onboarding` (member onboarding)
- `/dashboard`
- `/owner`

### 8.3 Landing decision (canonical)
After any successful sign-in, the app must route:
1) to `/post-signin` (server decides platform owner vs others),
2) middleware then gates:
   - force-change password → `/reset-password`
   - org owner incomplete → `/org-setup`
   - member incomplete → `/onboarding`
   - otherwise → `/dashboard`

### 8.4 Redirect safety
Callback URLs are accepted only if:
- start with `/`
- not `//`
- do not contain `\\`

---

## 9) Canonical policies (stop inconsistencies)

### 9.1 Password policy (single policy everywhere)
Applies to: signup, reset-password, setup-password, invitation set-password, force-change-password.

- **length**: 12–128
- **complexity**: uppercase + lowercase + number + symbol
- Backend is source of truth; frontend mirrors.

### 9.2 Error model (stable codes)
Frontend must branch by error `code`, never by message strings.

Backend must return for errors:
- HTTP status (4xx/5xx)
- JSON: `{ code: string; message: string; details?: unknown }`

### 9.3 Token model (all token flows)
All tokens must be:
- random (≥128-bit entropy),
- stored hashed at rest,
- TTL’d,
- single-use where applicable,
- rate-limited on verification endpoints,
- audited on both success and failure.

---

## 10) End-to-end UX flows (source of truth)

### 10.1 Signup → verify → auto-login → org-setup
1) User opens `/signup`
2) `POST /auth/register`
3) User clicks verification email → `/verify-email?token=...&email=...`
4) `POST /auth/verify-email` → returns `autoLoginToken`
5) Frontend signs in via NextAuth credentials with `{ magicToken: autoLoginToken }`
6) Redirect to `/org-setup`

### 10.2 Invite (new user) → accept → auto-login → onboarding → dashboard
1) User opens `/invitation/<token>`
2) `GET /organization/invitations/validate?token=...`
3) User sets name + password; `POST /organization/invitations/accept`
4) Backend returns `autoLoginToken`
5) Frontend signs in with `{ magicToken: autoLoginToken }`
6) Middleware routes to `/onboarding` (if required), else `/dashboard`

### 10.3 Invite (existing user) → sign in → accept → dashboard
1) User opens invite URL
2) If not signed in: redirect to `/signin?callbackUrl=/invitation/<token>`
3) Accept invite (no password)
4) Land in `/dashboard` (or onboarding if required by policy)

### 10.4 Forgot password → reset
1) `/forgot-password` → `POST /auth/forgot-password` (anti-enumeration)
2) Email link → `/reset-password?token=...`
3) `POST /auth/reset-password` with `{ token, newPassword }`
4) Redirect `/signin`

### 10.5 Forced change password
1) Backend sets `forceChangePassword=true` on session enrichment
2) Middleware routes user to `/reset-password` (no token)
3) `POST /auth/force-change-password` (authed)
4) Session updated; route to `/dashboard`

---

## 11) Frontend PRD — page-by-page requirements

> Each page must have: **loading**, **error**, and **success** state; must match `/signin` density; must be accessible.

### 11.1 `/signup`
- **Form fields**: email, password, accept terms.
- **Validation**: inline, per-field; mirrors backend password policy.
- **Anti-enumeration UX**: always show “Check your email” style success.
- **Resend verification**: cooldown 60s, button disables with aria label.
- **OAuth**: Google/Microsoft buttons shown only if enabled by env.

Edge cases:
- offline
- backend unreachable (503)
- rate limited

Acceptance criteria:
- does not leak “account exists”
- consistent spacing + hover

### 11.2 `/verify-email`
- **Auto-verify on load** (token from query).
- States:
  - verifying
  - verified + auto-sign-in
  - failed (expired/invalid/used) + resend link (if email present)
- Never exposes raw stack/error details.

### 11.3 `/signin`
- **Credentials sign-in** with remember flag (preference only).
- **MFA inline step** on `AUTH_MFA_REQUIRED`.
- **Lockout UI** uses `details.retryAfterSeconds`.
- **Email not verified** → show resend CTA.
- **Magic link**: request sign-in link (secondary).

### 11.4 `/forgot-password`
- Always show generic “If an account exists…” success.
- Resend cooldown.

### 11.5 `/reset-password`
- Mode A: token reset (`?token=` present)
- Mode B: forced change (no token, requires session)
- Uses canonical password policy.

### 11.6 `/setup-password`
- Validates setup token and shows email/name.
- Sets password via canonical endpoint `{ token, newPassword }`.
- Forces sign-out on success (clears backend token cache + NextAuth).

### 11.7 `/invitation/[token]`
- Validates token and shows org + invited email + role.
- Branch:
  - existing user: “Sign in & join” / “Accept & join”
  - new user: set name + password + accept
- Must never create duplicate accounts.

### 11.8 `/post-signin`
- Server component router only:
  - platform owner → `/owner`
  - else → `/dashboard`

### 11.9 `/org-setup`
- Owner-only, required until complete.
- Must end by setting `orgOnboardingCompletedAt`.

### 11.10 `/onboarding`
- Member-only, required until complete.
- Must end by setting `userOnboardingCompletedAt`.

---

## 12) Backend PRD — endpoint contracts (with examples)

### 12.1 Standard error response
All non-2xx responses return:

```json
{ "code": "AUTH_INVALID_CREDENTIALS", "message": "Invalid email or password." }
```

Optional details are allowed only if safe:

```json
{ "code": "AUTH_ACCOUNT_LOCKED", "message": "Account locked. Try again later.", "details": { "retryAfterSeconds": 900 } }
```

### 12.2 Required endpoint catalog

#### `POST /auth/register`
Purpose: create user + seed org + enqueue verify email.

Request:

```json
{
  "email": "owner@acme.com",
  "password": "StrongPassw0rd!@#",
  "firstName": "Owner",
  "lastName": "User",
  "companyName": "Acme",
  "plan": "STARTER"
}
```

Response (anti-enumeration; same shape always):

```json
{ "success": true }
```

Headers:
- `Idempotency-Key` required for clients that may retry.

Rate limits:
- per-IP and per-email (strict)

Audit events:
- `auth.register_requested`
- `auth.register_created` (only when created)

#### `POST /auth/resend-verification`
Request:

```json
{ "email": "owner@acme.com" }
```

Response:

```json
{ "success": true }
```

Rate limits: strict.

#### `POST /auth/verify-email`
Request:

```json
{ "token": "..." }
```

Response:

```json
{ "autoLoginToken": "..." }
```

Errors:
- `AUTH_TOKEN_INVALID`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_ALREADY_VERIFIED`

Audit events:
- `auth.email_verified`

#### `POST /auth/login`
Request:

```json
{ "email": "owner@acme.com", "password": "StrongPassw0rd!@#", "totpCode": "123456" }
```

Response:

```json
{ "userId": "uuid", "orgId": "uuid-or-null", "forceChangePassword": false }
```

Errors:
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_EMAIL_NOT_VERIFIED`
- `AUTH_ACCOUNT_LOCKED` (details: retryAfterSeconds)
- `AUTH_MFA_REQUIRED`
- `AUTH_INVALID_MFA_CODE`
- `AUTH_SUBSCRIPTION_INACTIVE`

Audit events:
- `auth.login_success`
- `auth.login_failure`
- `auth.account_locked`

#### `POST /auth/forgot-password`
Request:

```json
{ "email": "user@acme.com" }
```

Response (always):

```json
{ "success": true }
```

Audit events:
- `auth.password_reset_requested`

#### `POST /auth/reset-password`
Request (canonical):

```json
{ "token": "...", "newPassword": "NewStrongPassw0rd!@#" }
```

Response:

```json
{ "success": true }
```

Errors:
- `AUTH_TOKEN_INVALID`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_PASSWORD_WEAK`

Audit events:
- `auth.password_reset_completed`

#### `POST /auth/force-change-password` (authed)
Request:

```json
{ "password": "NewStrongPassw0rd!@#" }
```

Response:

```json
{ "success": true }
```

#### `POST /auth/magic-link`
Request:

```json
{ "email": "user@acme.com" }
```

Response (anti-enumeration):

```json
{ "success": true }
```

#### `POST /auth/magic-link/verify`
Request:

```json
{ "token": "..." }
```

Response:

```json
{ "userId": "uuid", "forceChangePassword": false }
```

#### `GET /auth/session-data/:userId` (internal-secret)
Response shape (must be stable; consumed by NextAuth):
- orgId, isOrgOwner, isPlatformAdmin
- permissions[], enabledModules[], plan
- orgOnboardingCompletedAt, userOnboardingCompletedAt
- mfaEnforced, totpEnabled
- hasDashboardAccess, isActive

#### Invitation endpoints
`GET /organization/invitations/validate?token=...`

Response:

```json
{ "email": "user@acme.com", "organizationName": "Acme", "role": "Member", "userExists": false }
```

`POST /organization/invitations/accept`
- existing user request: `{ "token": "..." }`
- new user request: `{ "token": "...", "firstName": "A", "lastName": "B", "password": "..." }`

Response (recommended):

```json
{ "autoLoginToken": "..." }
```

Errors:
- `INVITE_TOKEN_INVALID`
- `INVITE_TOKEN_EXPIRED`
- `INVITE_ALREADY_USED`
- `INVITE_EMAIL_MISMATCH`

Audit:
- `org.invite_accepted`

---

## 13) Data model (backend, high-level)

> Backend schema is source-of-truth. Tables listed here define the minimum needed to make flows correct and efficient.

### 13.1 Tables (minimum)
- `users`
- `organizations`
- `organization_memberships`
- `invitations`
- `email_verification_tokens`
- `password_reset_tokens`
- `magic_link_tokens`
- `audit_events`

### 13.2 Required columns (examples)
- `invitations`:
  - `org_id`, `email`, `role`, `token_hash`, `expires_at`, `accepted_at`, `accepted_by_user_id`
  - optional: `invited_by_user_id`, `sent_at`
- `*_tokens`:
  - `user_id`, `token_hash`, `expires_at`, `used_at`

### 13.3 Indexes
- `organization_memberships (org_id, user_id)` unique
- `invitations (org_id, email)` unique for active invites (partial index where accepted_at is null)
- `*_tokens (token_hash)` unique
- Always index `org_id` on tenant-scoped tables.

---

## 14) Email system (must actually work)

### 14.1 Queue requirements
- Queue all outgoing emails.
- Retries with exponential backoff.
- DLQ for permanent failures.
- Alerts on failure spikes.

### 14.2 Email template requirements
Each email must include:
- clear subject
- CTA button
- fallback URL text
- “If you didn’t request this, ignore”

Minimum templates:
- Verify email
- Password reset
- Magic link sign-in
- Organization invitation

---

## 15) Observability (trace→fatal, metrics, audit)

### 15.1 Logging levels
Backend supports `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

Every auth request logs:
- requestId/correlationId
- endpoint + action + outcome
- orgId/userId when known
- error code when failure
- latency

### 15.2 Metrics (minimum)
- login success/failure
- lockout count
- token verify failures
- email queue success/failure/DLQ
- p95 latency by endpoint

### 15.3 Audit events (tenant-scoped immutable)
Must record:
- register, verify-email, login success/failure, lockout
- forgot-password requested, reset completed
- invite sent/accepted/expired
- mfa enabled/disabled
- session revoked/sign out

---

## 16) Security requirements (must pass)

- Anti-enumeration on register/forgot/magic-link.
- Rate limit all credential/token endpoints.
- Tokens hashed at rest; TTL enforced; single-use.
- Tenant binding on invitations and token claims.
- Middleware is UX only; backend is authoritative.

---

## 17) Testing requirements

### 17.1 Backend e2e (required)
- signup → verify → auto-login works
- login: success/failure/lockout/mfa required/invalid mfa
- forgot-password anti-enumeration
- reset-password token single-use
- invitation validate + accept (new + existing)
- cross-tenant safety

### 17.2 Frontend smoke (required)
- auth pages render and show correct states
- middleware gates: org-setup / onboarding / reset-password / mfa required

---

## 18) Definition of Done

- All flows in §10 work for success + failure + edge cases.
- Password policy is consistent across all pages and endpoints.
- No brittle error string parsing remains.
- Emails are reliable (queue + retries + DLQ + alerts).
- UI matches `/signin` and `/signup` density and hover/contrast rules.
- Build + lint + typecheck pass.
- Critical backend e2e tests pass.

# StreamlineOS PRD (Implementation-Grade)
## Authentication · Invitations · Onboarding → Correct Dashboard Landing

**Document owner**: Product (PM)  
**Engineering owner**: Platform / Identity  
**Last updated**: 2026-07-01  
**Status**: Approved-for-implementation (v2 — rewritten for Claude-code execution)

---

## 0) Copy/paste implementation prompt (for Claude Code)

Use this as the **single prompt** to implement this PRD end-to-end.

> You are implementing StreamlineOS Auth + Onboarding. Follow `CLAUDE.md` as the constitution. Work **page-by-page**: when touching any page, do AUDIT → PLAN → wait → implement. Backend owns all business logic and DB schema; frontend is UI + TanStack Query hooks only; frontend `app/api/**` is auth-bridge only. Strict TypeScript, no `any`, no type casts, no `@ts-ignore`, no anonymous handlers, no comments, remove dead code. Do not invent design tokens: use `/signin` and `/signup` as the canonical UI density + interaction reference.  
>
> Goal: make auth flows correct, secure, consistent, and resilient. Replace brittle string-based error branching with typed error codes and consistent API contracts. Standardize password policy and token flows. Make emails (verify/reset/invite/magic-link) reliable with queues + retries + DLQ. Ensure middleware routing produces correct landings for platform owners, org owners, and members with onboarding gates. Implement backend e2e tests for all critical flows.  
>
> Deliverables: (1) backend endpoints + schema + migrations + Zod/DTO validation + rate limits + audit logs, (2) frontend pages wired to those endpoints via existing `apiClient` + hooks, (3) consistent UX states (loading/empty/error) and accessibility, (4) build/lint/typecheck green, (5) `PAGES.md` updated for touched pages.

---

## 1) What’s broken today (problem statement)

This PRD is designed to fix the current “auth is breaking + feels buggy” reality by eliminating root causes:

- **Inconsistent password rules**: different pages enforce different minimum/regex, causing silent failures and UX confusion.
- **Brittle error handling**: frontend branches on error strings (e.g. `"ACCOUNT_LOCKED:"`) instead of stable error codes.
- **Token and email flows**: verification/reset/invite flows are not uniformly single-use, TTL’d, and observable.
- **Tenant + onboarding routing**: users can land on wrong pages, get loops, or be blocked inconsistently.
- **UI inconsistency**: spacing/hover states/visual density differ across screens; Sheets often have double padding.

---

## 2) Goals, non-goals, and success metrics

### 2.1 Goals (must ship)
- **Correctness**: every auth/onboarding path ends in the right landing with no loops and no broken states.
- **Security**: no tenant leaks, no token replay, no user enumeration via auth endpoints.
- **Consistency**: one password policy + one API error model + consistent UX states.
- **Reliability**: emails and notifications are queued, retryable, observable, and safe under partial failure.
- **Performance**: fast TTFB on auth pages, low latency on login/session enrichment, bounded DB cost.
- **Accessibility**: WCAG-friendly auth flows (labels, focus, keyboard, contrast).

### 2.2 Non-goals (explicitly out of scope for this PRD)
- Enterprise SSO (SAML/OIDC) **implementation** (we design for it, but do not ship it now)
- SCIM provisioning **implementation**
- Passkeys/WebAuthn (future)
- Full cross-app UI redesign (this PRD only standardizes and fixes auth/onboarding pages; broader UI work is separate, page-by-page)

### 2.3 Success metrics (how we know this PRD worked)
- **Signup conversion**: % signups that reach `/org-setup` within 5 minutes.
- **Email verification completion**: % verified within 24 hours.
- **Invite acceptance**: % accepted within 7 days.
- **Onboarding completion**: % members complete onboarding within 48 hours.
- **Support tickets**: reduction in “can’t login / reset link broken / invite invalid” tickets.
- **Reliability**: email job success rate ≥ 99.5% (with retries), DLQ < 0.1% daily.

---

## 3) Canonical UI/UX standards (applies to all auth/onboarding pages)

**Non-negotiable UI reference**: `/signin` and `/signup` are the canonical baseline for:
- compact card density,
- spacing scale,
- hover/active/focus contrast,
- icon sizing and color transitions,
- error message placement and typography.

### 3.1 Layout rules
- **No unnecessary clicks**: no dialogs for primary auth flows. Use a single page with inline states.
- **Card density**: avoid “giant whitespace”; prefer compact spacing similar to `/signin`.
- **Sheets**: avoid stacking outer padding + inner card padding (“double padding”).
- **States**:
  - Loading: skeletons or progress card, never a lone spinner.
  - Error: friendly message + retry CTA.
  - Empty: not applicable for auth, but invitation and onboarding tasks must have meaningful empty states.

### 3.2 Accessibility rules
- Every input has an explicit label (`<Label htmlFor=...>`).
- Error messages use `role="alert"` and are associated via `aria-describedby`.
- Buttons must be reachable and visible via keyboard focus (`focus-visible`).
- Contrast must remain readable on hover (no same text/bg).

### 3.3 SEO rules (public-facing pages)
Auth pages are not “SEO targets” but must still:
- have correct `<title>` and meta description,
- not expose sensitive tokens in indexable ways (use `noindex` where appropriate),
- avoid leaking internal errors into page HTML.

---

## 4) Personas and user journeys

### 4.1 Personas
- **Org Owner (SMB buyer)**: signs up, creates org, configures modules, invites team.
- **Invited Member**: receives invite, joins org, completes onboarding, lands in dashboard.
- **Existing User invited to new org**: already has StreamlineOS account; must join new org without creating duplicates.
- **Platform Owner / Super Admin**: lands in `/owner`; never sees employee onboarding.
- **Future: IT Admin (Enterprise)**: will require SSO + SCIM later; model must be compatible now.

### 4.2 Money-path journeys (must be perfect)
1) **Signup → verify → org setup → invite**
2) **Invite (new user) → accept → auto-login → onboarding → dashboard**
3) **Invite (existing user) → sign in → accept → dashboard**
4) **Forgot password → reset → sign in**
5) **Account locked → recover later**

---

## 5) System architecture (as it must be)

### 5.1 Two-repo boundary
- **Backend (`streamlineos-api`)** owns all business logic + DB schema + migrations + email sending.
- **Frontend** owns UI + client state + TanStack Query hooks.
- Frontend `app/api/**` is allowed **only** for NextAuth/auth-bridge (already true in this repo).

### 5.2 Current repo reality to preserve (confirmed from codebase)
- NextAuth configured in `frontend/lib/auth.ts` (Credentials + Google).
- Frontend uses `frontend/lib/api-client.ts` for backend requests and caches `backendJwt`.
- Middleware enforces coarse routing + onboarding gates (`frontend/middleware.ts`).
- Invitation token page exists: `frontend/app/(auth)/invitation/[token]/page.tsx`.

---

## 6) Canonical contracts and invariants (eliminate drift)

### 6.1 Password policy (single source of truth)
**One policy for signup + reset-password + setup-password + invitation**:
- length: **12–128**
- must include: uppercase + lowercase + number + symbol

**Backend validates always**. Frontend mirrors for instant UX but is not authoritative.

### 6.2 Typed errors (no string parsing)
All auth-related endpoints must return:
- HTTP status
- `code` (stable machine-readable)
- `message` (user-safe)
- optional `details` (safe, never secrets)

**Rule**: UI branches on `code`, never on message strings.

### 6.3 Token invariants
All tokens (verification, reset, magic link, invite, setup-password) must be:
- generated with strong randomness,
- stored hashed at rest,
- TTL’d,
- single-use where appropriate,
- audited on use (success + failure),
- rate-limited on validation endpoints (prevents brute-force).

---

## 7) Page-by-page PRD (frontend)

> For each page: **UI spec**, **data spec**, **states**, **edge cases**, **acceptance criteria**.

### 7.1 `/(auth)/signup` — Owner signup

**Primary action**: Create account + send verification email (anti-enumeration).

#### UI
- Inputs: work email, password, accept terms.
- Secondary: “Continue with Google” (optional).
- After submit: success card “Check your email” with resend cooldown.

#### Edge cases
- Offline browser → show “No internet” error.
- Email already exists → show generic “Check your email” (do not reveal existence).
- Email provider outage → still return success, but record an internal alert + retry email job.

#### Acceptance criteria
- One password policy enforced (12–128 + complexity).
- No leak of “email already exists”.

---

### 7.2 `/(auth)/verify-email` — Verify + auto-login

**Primary action**: verify email token and sign user in automatically.

#### UI states
- Loading: “Verifying…”
- Success: “Verified. Signing you in…”
- Failure: “Link expired/invalid” + resend if email param present + retry verification

#### Edge cases
- Token already used (idempotent): show success if already verified OR show “already used” with safe route to sign-in (backend decides).
- User is disabled: show “Account deactivated” CTA to contact support.

#### Acceptance criteria
- Auto-login does not require password re-entry.
- No sensitive error messages.

---

### 7.3 `/(auth)/signin` — Sign in (password/OAuth/magic link/MFA)

**Primary action**: authenticate and redirect to the correct landing.

#### UI
- Email + password + remember checkbox.
- Optional providers: Google and Microsoft toggled by env.
- Optional magic link: request a sign-in link.
- MFA step: inline transition (not a separate page) when `AUTH_MFA_REQUIRED`.

#### Edge cases
- Lockout: show retry time from `details.retryAfterSeconds`.
- Email not verified: inline “Resend verification email”.
- Subscription inactive: redirect to subscription page.
- Backend down: show “service unavailable” + retry.

#### Acceptance criteria
- No parsing `ACCOUNT_LOCKED:` style strings.
- On success: redirect to `/post-signin` unless safe callbackUrl exists.

---

### 7.4 `/(auth)/forgot-password`

**Primary action**: request reset email without user enumeration.

#### UI
- Email input.
- Success always (generic).
- Resend cooldown.

#### Acceptance criteria
- Same response UX whether email exists or not.

---

### 7.5 `/(auth)/reset-password`

Two modes:
- **Token reset**: `?token=...`
- **Forced change**: user redirected here when `forceChangePassword=true`

#### UI
- Token reset: “Reset password” + confirm password + strength indicator.
- Forced change: “Set up your password” (same policy).

#### Edge cases
- Token invalid/expired/used → show invalid state with CTA to request new link.
- If forced-change mode but session missing → redirect to sign-in.

#### Acceptance criteria
- Token reset invalidation is single-use.
- Forced change cannot be bypassed.

---

### 7.6 `/(auth)/setup-password`

**Primary action**: accept a setup token for pre-provisioned users.

#### UI
- Validate token and show email + name.
- Set password with canonical policy.
- On success: force sign-out + redirect to `/signin`.

#### Edge cases
- Token expired → show “Ask admin for a new link”.

---

### 7.7 `/(auth)/invitation/[token]`

Two branches:
- **userExists=true**: Accept & Join (requires sign-in if not already)
- **userExists=false**: Collect name + password, then accept

#### UI
- Always show: org name, invited email, assigned role.

#### Edge cases
- Token used/expired → show friendly explanation + CTA to request a new invite.
- Invited email mismatch → backend must reject (don’t allow token reuse for different email).

#### Acceptance criteria
- Accept returns auto-login token for new-user branch.
- Existing-user branch cannot create duplicate accounts.

---

### 7.8 `/post-signin`

**Primary action**: server-side router only.

Rules:
- Platform owner → `/owner`
- Everyone else → `/dashboard`

---

### 7.9 `/org-setup` (owner org onboarding)

**Primary action**: complete org bootstrap; set `orgOnboardingCompletedAt`.

Rules:
- Org owners cannot access other protected routes until complete.
- Once complete, `/org-setup` redirects to `/dashboard`.

---

### 7.10 `/(authenticated)/onboarding` (member onboarding)

**Primary action**: complete onboarding; set `userOnboardingCompletedAt`.

Rules:
- Not shown to org owners or platform admins.
- Once complete, user is routed to `/dashboard`.

---

## 8) Middleware routing rules (frontend)

Middleware is UX-only; backend must still authorize.

### 8.1 Protected vs auth routes
- Unauthenticated + protected route → redirect to `/signin?callbackUrl=...`
- Authenticated + auth route → redirect to callbackUrl or `/dashboard`

### 8.2 Onboarding gates
- Authenticated + org owner + `orgOnboardingCompletedAt` missing → `/org-setup`
- Authenticated + member + `userOnboardingCompletedAt` missing → `/onboarding`
- Authenticated + `forceChangePassword=true` → `/reset-password` (unless already on it)
- Authenticated + `mfaEnforced=true` and `totpEnabled=false` → `/settings?tab=security&mfa=required`

Acceptance criteria:
- No loops.
- Safe redirects only.

---

## 9) Backend API PRD (NestJS)

> Backend is the source of truth. Validate inputs with Zod/DTOs, and return typed error codes.

### 9.1 Standard error response
Recommended shape (works well with frontend parsing):

```ts
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

HTTP errors return JSON:
- `{ code, message, details? }` (and optionally `{ success:false, error:{...} }` if you standardize)

### 9.2 Endpoints (must exist and be correct)

#### `POST /auth/register`
- **Purpose**: create owner user + seed org draft + send verification email
- **Anti-enumeration**: always return 200/201 with generic message
- **Idempotency**: accept `Idempotency-Key` header
- **Rate limit**: strict

Errors (internal only, but still typed):
- `AUTH_RATE_LIMITED`
- `AUTH_PASSWORD_WEAK`

#### `POST /auth/resend-verification`
- **Purpose**: resend verification (anti-enumeration)
- **Rate limit**: strict per email + per IP

#### `POST /auth/verify-email`
- **Purpose**: verify email token; return single-use `autoLoginToken`
- **Token**: single-use + TTL
- Errors: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_ALREADY_VERIFIED`

#### `POST /auth/login`
- **Purpose**: credential login (password + optional TOTP)
- **Lockout**: return `AUTH_ACCOUNT_LOCKED` with `details.retryAfterSeconds`
- **MFA**: return `AUTH_MFA_REQUIRED` when needed
- Errors: `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_NOT_VERIFIED`, `AUTH_SUBSCRIPTION_INACTIVE`

#### `POST /auth/magic-link`
- **Purpose**: send sign-in link
- Anti-enumeration: do not reveal account existence
- Rate limit: strict

#### `POST /auth/magic-link/verify`
- **Purpose**: verify token and return `{ userId, forceChangePassword }`
- Errors: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`

#### `POST /auth/forgot-password`
- **Purpose**: send reset email (anti-enumeration)

#### `POST /auth/reset-password`
- **Purpose**: reset using token OR setup-password using token
- Request must be canonical: `{ token, newPassword }`
- Errors: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_PASSWORD_WEAK`

#### `POST /auth/force-change-password` (authed)
- **Purpose**: authenticated password update for forced rotation

#### `GET /auth/session-data/:userId` (internal only)
- **Purpose**: enrich NextAuth session with orgId, permissions, modules, onboarding flags
- Must be internal-secret protected and tenant-safe.

#### Invitation endpoints
- `GET /organization/invitations/validate?token=...`
- `POST /organization/invitations/accept`
  - New user branch returns `autoLoginToken`
  - Existing user branch requires session or returns `autoLoginToken` if already authenticated server-side

---

## 10) Email + job queue PRD (required for “it works”)

### 10.1 Email events (minimum)
- Verify email
- Password reset
- Magic link sign-in
- Organization invitation

### 10.2 Reliability requirements
- All sends go through a queue (Redis-backed or existing infra).
- Retries with exponential backoff.
- Dead-letter queue (DLQ) for repeated failures.
- Alerting on failure rate spikes.

### 10.3 Email template requirements
- HTML + plain text variants
- Clear CTA button + fallback raw URL
- Security copy: “If you didn’t request this, ignore”

---

## 11) Observability requirements (covers trace/info/warn/error/fatal/etc)

### 11.1 Logging levels (backend)
Backend must support:
- `trace` (very verbose, disabled in prod by default)
- `debug`
- `info`
- `warn`
- `error`
- `fatal` (process-terminating / pager-worthy)

Every auth request logs:
- requestId/correlationId,
- orgId (if known), userId (if known),
- action + outcome + error code (if any),
- latency.

### 11.2 Metrics (minimum)
- login success/failure rate
- lockout count
- token validation failure rate
- email send success/failure + DLQ count
- p95 latency per endpoint

### 11.3 Audit logs (tenant-scoped immutable)
Record:
- register, verify_email, login_success, login_failure, account_locked
- password_reset_requested, password_reset_completed
- invite_sent, invite_accepted, invite_expired
- mfa_enabled/disabled, session_revoked

---

## 12) Security requirements (must pass)

- **No enumeration** on signup/forgot/magic link.
- **Rate limiting** on all credential/token endpoints.
- **Token hashing at rest**.
- **Tenant isolation**: invitations and tokens must bind to org/email/user.
- **Session safety**: secure cookies, proper SameSite, short-lived backend JWT (already 10m).
- **CVE awareness**: middleware is bypassable; backend is authoritative for authZ.

---

## 13) Performance requirements

- Login p95 (backend) < 500ms under normal load.
- Session enrichment must be bounded (no N+1, select minimal fields).
- Token validation endpoints must be indexed on token hash.

---

## 14) Testing requirements (must ship with this PRD)

### Backend e2e (minimum)
- Signup → verify email → auto-login token works
- Login success/failure/lockout/MFA required
- Forgot password anti-enumeration
- Reset token single-use
- Invite validate/accept (new + existing)
- Cross-tenant safety checks

### Frontend smoke
- All auth pages render and handle loading/error/success
- Middleware gating routes correctly for owner/member/platform admin

---

## 15) Rollout / migration plan

- Introduce typed error codes while maintaining backward compatibility during rollout.
- Standardize request payload names (e.g. `newPassword`) and update all callers.
- Remove deprecated variants and dead code after verification.

---

## 16) Definition of Done (this PRD)

- Auth + invitation + onboarding flows are correct across all states.
- Emails are reliable (queued + retried + observable).
- UI matches `/signin` + `/signup` density and interaction patterns.
- Build + lint + types pass.
- Tests cover critical flows.

# StreamlineOS PRD — Authentication, Invitations, Onboarding → Dashboard Landing

**Status**: Draft (implementation-ready)  
**Applies to**: `frontend/` (Next.js App Router) + `streamlineos-api` (NestJS backend)  
**Audience**: Engineering, Product, Design, Security  
**Primary goal**: Replace brittle, inconsistent auth/onboarding with a single coherent, tenant-safe, enterprise-ready identity flow (SMB now; enterprise later).

---

## Summary

StreamlineOS is a **multi-tenant** platform where:
- A **User** can belong to **multiple Organizations (orgs/tenants)**.
- Every authenticated request is scoped by **orgId** and governed by **RBAC permissions** and **enabledModules**.
- Frontend (Next.js) is **UI + TanStack Query hooks only**. Business logic and schema live in the backend (NestJS).

This PRD defines the **end-to-end** flow from:
- sign up → verify email → org setup → invite team,
- invite acceptance (new and existing users),
- sign in (password + Google OAuth + optional magic link),
- forgot/reset password + forced password change,
- employee onboarding,
- deterministic landing routing to the right home (`/owner` vs `/dashboard`) with proper gating.

It also standardizes: **schemas**, **API contracts**, **error codes**, **token flows**, **email templates**, **security controls**, and **test plan**.

---

## Competitor baseline (what customers expect in 2026)

Competitors and identity brokers (WorkOS/PropelAuth/Auth0-style) have pushed a clear baseline for B2B SaaS identity:
- **Org-first identity model**: users belong to orgs, security and access policies are org-scoped.
- **Invitations + secure magic links**: accept invitation via short-lived token, optionally auto-login.
- **Org-level security policy**: MFA enforcement (optional/required-for-admins/required-for-all), session controls, audit logs.
- **Enterprise path**: SAML/OIDC SSO + SCIM provisioning are expected later; plan the model now so you don’t rewrite later.

**StreamlineOS differentiation (edge)** for SMB → enterprise:
- **Module-aware onboarding and UI**: the app UI shows only subscribed + enabled modules; onboarding tasks adapt to enabled modules.
- **Single “identity truth”**: consistent, typed API contracts, token single-use, standardized errors.
- **Frictionless first session**: verify email → auto-login → org-setup wizard → invite team → land in dashboard with correct product nav.

---

## Product principles (non-negotiable)

- **One flow, one mental model**: every user reaches a correct landing route in ≤2 steps after auth.
- **No duplicated logic**: no “same thing” implemented in 2 pages or 2 endpoints. If a new endpoint replaces old, delete old.
- **Tenant-safe by default**: every data read/write is tenant-scoped and re-authorized in backend services (middleware and client checks are UX only).
- **Strict TypeScript + runtime validation**: types match backend Zod contracts; no `any`; validate untrusted input.
- **Minimal clicks**: prefer inline states and a single screen over popups/dialogs for auth flows.

---

## In-scope

### Auth routes (frontend)
Existing route surface in repo (must remain, but can be redesigned/refactored):
- `/(auth)/signup`
- `/(auth)/verify-email`
- `/(auth)/signin`
- `/(auth)/magic-link`
- `/(auth)/forgot-password`
- `/(auth)/reset-password`
- `/(auth)/setup-password`
- `/(auth)/invitation/[token]`
- `/post-signin` (server-side role router; must stay)
- `/org-setup` (org owner setup)
- `/(authenticated)/onboarding` (employee onboarding)
- `/dashboard` (default authenticated landing)
- `/owner` (platform owner home)

### Backend responsibilities
Backend must own:
- password hashing policy and enforcement,
- account lockout / rate limiting,
- invitation issuance + acceptance,
- email verification,
- session enrichment (permissions, enabledModules, plan, onboarding flags),
- audit events for auth/security events.

---

## Not in scope (for this PRD)

These are planned, but **not required to ship this PRD**:
- SAML/OIDC enterprise SSO (design the model now; ship later)
- SCIM provisioning (design hooks now; ship later)
- Passkeys / WebAuthn (optional future enhancement)
- Organization selection UI for multi-org users (we keep existing `/organization` switching API; UI can come later)

---

## Key entities & state model

### User account states
The backend is the source of truth; frontend derives UX from session fields.

- **Email verification**
  - `emailVerifiedAt: timestamp | null`
  - No login allowed until verified (except invitation/setup flows that set password and verify implicitly).

- **Activation**
  - `isActive: boolean`
  - Inactive users are immediately signed out and routed to `/(auth)/account-deactivated` (existing route) with support guidance.

- **Password state**
  - `forceChangePassword: boolean`
  - Used when the backend sets a temporary password or policy requires rotation.

- **MFA policy**
  - Org policy `mfaEnforced: boolean` + user `totpEnabled: boolean`
  - If enforced and not enabled, user is redirected to Security settings (existing behavior) until configured.

### Tenant membership states
- A user may have multiple org memberships.
- The active org is determined by `session.orgId`.
- Authorization must be derived via backend `/me/access` or session enrichment; never from frontend-only state.

### Onboarding states
Two independent tracks:
- **Org onboarding** (org owner): `orgOnboardingCompletedAt`
- **User onboarding** (employee): `userOnboardingCompletedAt`

Middleware must route:
- org owner + orgOnboardingCompletedAt missing → `/org-setup`
- non-owner member + userOnboardingCompletedAt missing → `/onboarding`

---

## Standardized password rules (fix current inconsistencies)

**Current issue in repo**: different pages enforce different minimums (some 8, some 12). This creates breakage and UX confusion.

### Decision
Adopt **one** password policy across all flows:
- **Min length**: 8
- **Max length**: 128
- **Complexity**: must include uppercase + lowercase + number + symbol
- **Server is source of truth**: frontend mirrors the same regex for instant feedback, but backend validates again.

### Acceptance criteria
- `signup`, `reset-password`, `setup-password`, `invitation` all enforce the same rule.
- Backend rejects invalid passwords with a consistent error code/message.

---

## Standard API error model (mandatory)

All backend endpoints in this PRD return a consistent envelope:

```ts
type ApiOk<T> = { success: true; data: T };
type ApiErr = { success: false; error: { code: string; message: string; details?: unknown } };
type ApiResponse<T> = ApiOk<T> | ApiErr;
```

Frontend must:
- Display `error.message` to user (safe, friendly, no stack traces)
- Use `error.code` for branching (e.g., MFA required, lockout)

**Never** rely on string prefix checks like `ACCOUNT_LOCKED:` in the UI. Those are brittle.

---

## Auth & onboarding UX flows (page-by-page)

### 1) Sign up (org owner) — `/(auth)/signup`

#### User story
As a new customer, I sign up with work email and password (or Google) and can reach my workspace setup without confusion.

#### UX requirements
- Single page, no modals/dialogs.
- Form fields: email, password, terms checkbox.
- Password strength indicator (reuse existing `PasswordStrengthIndicator`).
- Success state: “Check your email” with resend cooldown.
- Google OAuth option if enabled by env.

#### Backend flow
1. `POST /auth/register`
2. Backend sends verification email with link to:
   - `/(auth)/verify-email?token=...&email=...`

#### Contract — `POST /auth/register`
Request:
- `email: string`
- `password: string`
- `firstName: string`
- `lastName?: string`
- `companyName: string` (org name seed)
- `plan: "STARTER" | ...` (seed; actual billing may change later)

Response:
- `201` with `userId` (optional), always safe generic messaging (don’t leak if email exists).

Error codes:
- `AUTH_EMAIL_TAKEN`
- `AUTH_PASSWORD_WEAK`
- `AUTH_RATE_LIMITED`

#### Acceptance criteria
- Duplicate email does not leak whether the account exists (return generic “check your inbox”).
- Verification email always sent via background job.

---

### 2) Verify email + auto-login — `/(auth)/verify-email`

#### User story
After clicking the email verification link, I’m automatically signed in and taken to org setup.

#### UX requirements
- One page with 3 states:
  - loading (verifying)
  - success (“Signing you in…”)
  - failure (expired/used token + resend)

#### Backend flow
1. `POST /auth/verify-email` with `{ token }`
2. Response includes an **auto-login token** (single-use) that the frontend uses to sign in via NextAuth credentials with `magicToken`.
3. Redirect to `/org-setup`.

#### Contract — `POST /auth/verify-email`
Request: `{ token: string }`  
Response: `{ autoLoginToken: string }`

Error codes:
- `AUTH_TOKEN_INVALID`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_ALREADY_VERIFIED`

#### Acceptance criteria
- Verification token is **single-use** (backend enforces).
- Auto-login token is **single-use** and expires quickly (≤10 minutes).

---

### 3) Sign in (password + OAuth + optional magic link) — `/(auth)/signin`

#### User story
As a returning user, I can sign in with password or Google/Microsoft; if MFA is required, I complete it; then I land on the correct home.

#### UX requirements
- Default: email + password + remember checkbox (remember = session duration preference only; backend enforces).
- Inline error states, not popups.
- If MFA required, transition to an MFA step on the same page (existing UI is acceptable).
- Magic link as secondary path: “Email me a sign-in link”.

#### Backend flow
Credentials sign-in uses NextAuth → backend:
- `POST /auth/login` accepts `{ email, password, totpCode? }`

If MFA is required:
- Backend returns `requiresMfa: true` via error code (not string), and no session is created.

Landing after successful sign-in:
- Always redirect to `/post-signin` unless a safe callbackUrl is provided.
- `/post-signin` server-side checks role and routes:
  - platform owner → `/owner`
  - all others → `/dashboard`
- Middleware then routes to `/org-setup` or `/onboarding` if incomplete.

#### Contract — `POST /auth/login`
Request:
- `email: string`
- `password: string`
- `totpCode?: string`
- `device?: { userAgent?: string; ip?: string }` (optional, for audit)

Response on success:
- `{ userId: string; orgId: string | null; forceChangePassword: boolean; requiresMfa?: false }`

Response on MFA required (error):
- `code: "AUTH_MFA_REQUIRED"`

Response on lockout (error):
- `code: "AUTH_ACCOUNT_LOCKED"`
- `details: { retryAfterSeconds: number }`

Other error codes:
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_EMAIL_NOT_VERIFIED`
- `AUTH_SUBSCRIPTION_INACTIVE`
- `AUTH_RATE_LIMITED`

#### Acceptance criteria
- No UI string-parsing of backend errors.
- Lockout countdown is driven by `retryAfterSeconds`.
- Successful sign-in always results in a valid NextAuth session and a backendJwt in `/api/auth/session`.

---

### 4) Forgot password — `/(auth)/forgot-password`

#### User story
I can request a reset link without leaking whether the email exists.

#### UX requirements
- Form: email only.
- Success state always displayed (“If an account exists, you’ll receive an email”), with resend cooldown.

#### Backend contract — `POST /auth/forgot-password`
Request: `{ email: string }`  
Response: `{ success: true }` (always 200 even if user doesn’t exist)

Email link:
- `/(auth)/reset-password?token=...`

Error codes (rare; do not leak existence):
- `AUTH_RATE_LIMITED`

---

### 5) Reset password (token-based) + forced change password — `/(auth)/reset-password`

This route supports **two** legitimate modes:
- **Token reset**: user came from email with `?token=...`
- **Forced change**: authenticated user is redirected here when `forceChangePassword = true`

#### UX requirements
- Token reset mode: show “Reset password” form
- Forced change mode: show “Set up your password” form (but it’s still the same password policy)
- After success:
  - token reset: redirect to `/signin`
  - forced change: update session (`forceChangePassword=false`) and redirect to `/dashboard`

#### Backend contracts
Token reset:
- `POST /auth/reset-password`
  - Request: `{ token: string; newPassword: string }`
  - Response: `{ success: true }`
  - Error codes: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_PASSWORD_WEAK`

Forced change:
- `POST /auth/force-change-password`
  - Request: `{ password: string }`
  - Response: `{ success: true }`
  - Must require authentication (Bearer backendJwt).

#### Acceptance criteria
- Token reset invalidation is single-use.
- Forced change cannot be bypassed; middleware enforces until cleared.

---

### 6) Setup password link (admin-provisioned / HR-provisioned accounts) — `/(auth)/setup-password`

#### Problem this solves
Some users are created by an admin/HR process and must set password before first sign-in.

#### UX requirements
- Validate token up front and display who it is for (email + name).
- Set password once, then route to `/signin`.

#### Backend contracts
Token validate:
- `GET /organization/setup-token/validate?token=...`
  - Response: `{ email: string; name: string }`
  - Errors: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`

Set password:
- Reuse the **same** endpoint as reset password:
  - `POST /auth/reset-password` with `{ token, newPassword }`

#### Acceptance criteria
- This flow must not “kind of work” with mismatched parameter names (`password` vs `newPassword`). Contract is one.

---

### 7) Invitation acceptance — `/(auth)/invitation/[token]`

Invitations are tenant membership primitives and must be normalized and secure.

#### User stories
- As an invited new user, I can set my name + password and join the org in one flow.
- As an invited existing user, I can sign in (if needed) and join the org without creating another account.

#### UX requirements
- Page first validates token and shows: org name, invited email, assigned role.
- Two branches:
  - **Existing user**: CTA “Sign in & join” (if not logged in) else “Accept & join”
  - **New user**: form for first/last name + password + confirm password, then accept

#### Backend contracts
Validate invitation:
- `GET /organization/invitations/validate?token=...`
  - Response:
    - `{ email: string; organizationName: string; role: string; userExists: boolean }`
  - Error codes: `INVITE_TOKEN_INVALID`, `INVITE_TOKEN_EXPIRED`, `INVITE_ALREADY_USED`

Accept invitation:
- `POST /organization/invitations/accept`
  - Request (existing user): `{ token: string }`
  - Request (new user): `{ token: string; firstName: string; lastName?: string; password: string }`
  - Response (recommended):
    - `{ autoLoginToken: string }` for both cases (single-use)

Frontend behavior on success:
- Call NextAuth credential sign-in with `{ magicToken: autoLoginToken }` (no password exchange).
- Redirect to `/post-signin` (middleware will route to `/onboarding` if required).

#### Invitation email
From: `noreply@streamlineos.app`  
CTA URL: `/(auth)/invitation/<token>`  
TTL: 7 days (SMB-friendly), single-use.

#### Acceptance criteria
- Invitation acceptance always results in a valid session (auto-login token).
- Existing user path does not ask for password again (just sign-in if not already).
- Backend records audit events: invite_sent, invite_accepted, member_added.

---

### 8) Org setup (owner) — `/org-setup`

This is the “workspace bootstrap” for the org owner. It must be:
- linear,
- low-click,
- persistent,
- safely idempotent.

#### UX requirements
- Multi-step wizard with progress, but each step should be skippable where appropriate.
- The wizard ends by setting `orgOnboardingCompletedAt`.
- Team invites step uses invitation pipeline (email invites, role selection, module assignment if supported).

#### Backend contracts (existing patterns)
The PRD expects org setup to be backed by backend endpoints (already present in repo for workspace onboarding).

#### Acceptance criteria
- Owners who haven’t completed org setup cannot access other protected routes.
- Once completed, owners are redirected away from `/org-setup` to `/dashboard`.

---

### 9) Employee onboarding — `/(authenticated)/onboarding`

#### User story
As a new employee (not an owner/platform admin), I complete onboarding once and then never see it again.

#### UX requirements
- Wizard steps with proper validation and uploads where required.
- Completion sets `userOnboardingCompletedAt` on backend and is reflected in session.

#### Acceptance criteria
- Owners/platform admins never see this flow (middleware routes them away).
- Once done, middleware routes user to `/dashboard`.

---

## Session enrichment + frontend auth architecture (must match repo)

### NextAuth source of truth (frontend)
Frontend already uses NextAuth (`frontend/lib/auth.ts`) with:
- Providers: Credentials + Google
- Session strategy: JWT
- Backend enrichment via `GET /auth/session-data/:userId` (internal secret)
- Session includes: `permissions`, `enabledModules`, `plan`, `orgId`, onboarding flags, MFA flags

### Required improvements (to implement in this PRD)
- **Replace brittle string errors** with structured error codes.
- **Deduplicate token refresh**: frontend `api-client` already caches backendJwt for ~9 min; keep it.
- **Consistent login outcomes**: every successful auth step produces a session and backendJwt.

---

## RBAC + module gating rules (auth-adjacent)

### Module gating
Session exposes `enabledModules: string[]`.
Rules:
- Sidebar/nav must show only enabled modules.
- Backend must still enforce module access (deny-by-default).

### RBAC (permissions)
Session exposes `permissions: string[]`.
Rules:
- Middleware can do optimistic route gating (UX only).
- Backend guards are mandatory for all protected endpoints.

---

## Security requirements (OWASP-focused)

### Rate limiting & lockout
Backend must rate limit:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/forgot-password`
- `POST /auth/magic-link`
- invitation validation/accept endpoints (token brute force)

Lockout policy:
- after N failed attempts, lock for a time window and return `AUTH_ACCOUNT_LOCKED` + `retryAfterSeconds`.

### Token handling
All tokens (`verify-email`, `reset-password`, `magic-link`, `invitation`, `setup-password`) must be:
- random (≥128 bits entropy),
- stored hashed in DB (never plaintext),
- single-use where applicable,
- have explicit TTL,
- audited on use.

### Redirect safety
Only allow callback redirects that are:
- relative paths starting with `/`,
- not starting with `//`,
- no backslashes.

### Audit events (minimum)
Tenant-scoped audit log entries for:
- login success/failure + lockout
- email verification
- password reset request + completion
- invitation sent/accepted/expired
- MFA enabled/disabled
- org switch
- session revoke/sign out

---

## Backend schema (high-level; backend is source of truth)

### Tables (minimum)
- `users`
- `organizations`
- `organization_memberships` (user ↔ org with role)
- `invitations` (orgId, email, role, tokenHash, expiresAt, acceptedAt, acceptedByUserId)
- `email_verification_tokens` (userId, tokenHash, expiresAt, usedAt)
- `password_reset_tokens` (userId, tokenHash, expiresAt, usedAt)
- `magic_link_tokens` (userId, tokenHash, expiresAt, usedAt, purpose)
- `audit_events` (orgId, actorUserId, action, metadata, createdAt)

### Indexes (minimum)
- `invitations(org_id, email)` unique for active invitations (partial index where acceptedAt is null)
- `*_tokens(token_hash)` unique
- `organization_memberships(org_id, user_id)` unique

---

## Implementation instructions (for an execution agent)

When implementing this PRD:
- **Inspect before change**: reuse existing components/hooks/utilities.
- **Strict TS**: no `any`, no `@ts-ignore`, no casting hacks.
- **No comments in code**: remove existing stray comments where you touch files.
- **Frontend boundary**: do not add frontend business APIs; auth-bridge only.
- **One contract**: if you standardize `POST /auth/reset-password` to `{ newPassword }`, update *all* callers and delete old variants.
- **Page-by-page**: for each page you touch, do AUDIT → PLAN → execute → build+lint+types → update `PAGES.md`.

Deliverables (this PRD requires):
- Standardized backend auth/invite endpoints + Zod validation
- Updated frontend pages to match one contract set
- Emails working (queue-backed) for verification, reset, invitation, magic link
- E2E tests for critical flows

---

## Test plan (minimum)

### Backend e2e
- Sign up → verify email → auto-login token → session-data available
- Login:
  - invalid credentials
  - lockout and retryAfterSeconds
  - MFA required
  - inactive user rejected
- Forgot password:
  - always returns ok
  - token reset works once; reuse fails
- Invitation:
  - validate ok/expired/used
  - accept new user returns autoLoginToken
  - accept existing user requires auth or returns autoLoginToken safely
  - cross-tenant safety: token cannot join wrong org

### Frontend smoke
- All auth pages render and submit successfully
- Middleware routing:
  - org owner incomplete → `/org-setup`
  - employee incomplete → `/onboarding`
  - completed → `/dashboard`

---

## Definition of Done

- Auth flows are **coherent**, **consistent**, and **typed** end-to-end.
- Emails: verification, reset, invitation, magic link **work** (queued, reliable).
- No duplicated endpoints or duplicate UI flows.
- Build + lint + types are green.
- Critical auth endpoints have e2e coverage.

