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
- **Min length**: 12
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

