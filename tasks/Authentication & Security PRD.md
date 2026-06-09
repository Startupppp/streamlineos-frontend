**PRODUCT REQUIREMENTS DOCUMENT**

**Authentication & Security**

**Project: StreamlineOS — Auth Module Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Final**

**Table of Contents**

1. **Overview & Objective**  
2. **Current Flow Analysis**  
3. **Proposed Enhanced Flow**  
4. **Feature Specifications**  
5. **Database Schema Changes**  
6. **API Endpoints**  
7. **UI/UX Wireframe Descriptions**  
8. **Roles & Permissions**  
9. **Edge Cases & Error Handling**  
10. **Technical Implementation Notes**  
11. **Success Metrics**  
12. **Timeline & Milestones**

---

**1\. Overview & Objective**

**1.1 Background**

**Enterprise CRMs contain highly sensitive financial, client, and employee data. The auth module is the primary gatekeeper for the StreamlineOS application.**

**1.2 Objective**

**Provide an impenetrable, yet frictionless login experience. Enforce Multi-Factor Authentication (MFA) and strict session timeouts to remain compliant with data security standards.**

**2\. Current Flow Analysis**

**2.1 Current Process**

**Currently relies on basic email/password authentication via default credentials ("Welcome@123") with a forced manual reset. No secondary authentication factors are required.**

**2.2 Gaps Identified**

* **Vulnerable to brute-force attacks and credential stuffing.**  
* **Sessions do not forcibly expire if left idle.**

**3\. Proposed Enhanced Flow**

**3.1 The MFA & Session Flow**

**Users provide their email and password. Upon successful validation, the system checks if the user has enrolled in MFA (via Authenticator App/TOTP). If yes, they are prompted for the 6-digit code. If no, and MFA is enforced globally by the org, they are forced to scan a QR code and set it up before accessing the dashboard. Sessions expire automatically after 2 hours of absolute inactivity.**

**4\. Feature Specifications**

**4.1 Time-based One-Time Password (TOTP) MFA**

**Integration with standard authenticator apps (Google Authenticator, Authy).**

**4.2 Brute Force Protection**

**Account locked for 15 minutes after 5 consecutive failed login attempts.**

**4.3 Concurrent Session Management**

**If a user logs in from a new browser/IP while an active session exists, the old session is automatically invalidated (or they must explicitly approve the new login).**

**5\. Database Schema Changes**

**5.1 Modified/New Tables**

**users (Modification)**

| Column | Type | Description |
| :---- | :---- | :---- |
| **mfaSecret** | **text** | **Encrypted TOTP secret** |
| **mfaEnabled** | **boolean** | **Is MFA setup complete?** |
| **failedLoginAttempts** | **int** | **Counter** |

**sessions**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **text (PK)** | **Unique session token** |
| **userId** | **text (FK)** | **Reference** |
| **ipAddress** | **text** | **Used for location auditing** |
| **expiresAt** | **timestamp** | **Session death time** |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **POST** | **/api/auth/login** | **Validates credentials, returns JWT or MFA challenge token** | **Public** |
| **POST** | **/api/auth/mfa/verify** | **Validates 6-digit code, issues full session** | **Public** |
| **POST** | **/api/auth/logout** | **Destroys current session token** | **Employee** |

**7\. UI/UX Wireframe Descriptions**

* **Login Screen: Split screen. Left side shows rotating StreamlineOS marketing/value propositions. Right side holds the white login card with clean, modern inputs.**  
* **MFA Setup Modal: Displays a scannable QR code alongside a manual string entry code. Below sits a 6-digit input field for the user to confirm successful binding.**

**8\. Roles & Permissions**

| Permission | Admin | Manager | Employee |
| :---- | :---- | :---- | :---- |
| **Force Password Reset** | **✓ (On others)** | **✘** | **✘** |
| **Enforce Global MFA** | **✓** | **✘** | **✘** |
| **Manage Own Password** | **✓** | **✓** | **✓** |

**9\. Edge Cases & Error Handling**

* **Lost Authenticator: If an employee loses their phone, an Admin must manually reset the mfaSecret via the Admin Dashboard to allow them to re-enroll on a new device.**

**10\. Technical Implementation Notes**

* **Utilize NextAuth.js (or newer framework auth blocks) with custom credential providers.**  
* **Bcrypt for password hashing.**  
* **otplib alongside qrcode for generating TOTP secrets and rendering QR codes on the frontend.**

**11\. Success Metrics**

* **0 unauthorized data access incidents.**  
* **MFA adoption reaches 100% within one week of deployment.**

**12\. Timeline & Milestones**

* **Phase 1: Core Login/Logout & Session DB (3 Days)**  
* **Phase 2: MFA setup and verification logic (4 Days)**  
* **Phase 3: Brute force lockouts & Email recovery (3 Days)**  
* **Estimated Total: 2 Weeks**

 


---

## Status: ✅ COMPLETE

## Checklist

### Core Auth
- [x] Email + password login via NextAuth v5 with custom credentials provider
- [x] Bcrypt password hashing
- [x] JWT session with `userId`, `orgId`, `branchId`, `role`, `sessionId`
- [x] Redis session cache (`user:session:{userId}`, TTL 300s) — avoids DB hit on every request
- [x] Forced password reset on first login (`mustChangePassword` flag)
- [x] `app/(auth)/signin/page.tsx` — split-screen UI with animated right panel
- [x] `app/(auth)/forgot-password/page.tsx` — password reset request
- [x] `app/(auth)/reset-password/page.tsx` — reset form with token validation

### MFA (TOTP)
- [x] TOTP secret generation (`otplib`) — `lib/totp.ts`
- [x] QR code rendering for authenticator app setup
- [x] `POST /api/auth/mfa/setup` — enroll TOTP
- [x] `POST /api/auth/mfa/verify` — validate 6-digit code
- [x] `POST /api/auth/mfa/disable` — disable MFA (admin can reset for locked users)
- [x] MFA settings UI in `components/settings/mfa-settings.tsx`
- [x] Enforce org-wide mandatory MFA setting — `organizations.mfaEnforced`; middleware redirects to `/settings?tab=security&mfa=required`
- [x] MFA backup codes (8 single-use codes) — `mfa_backup_codes` table; generated on setup, returned to user once
- [x] MFA recovery via Admin reset flow — `POST /api/auth/mfa/reset`; button in `/settings/members`

### Brute Force & Rate Limiting
- [x] `lib/rate-limit.ts` — Upstash Ratelimit + in-memory fallback; async `checkRateLimit`
- [x] `failedLoginAttempts` counter on `users` table (was `loginAttempts`)
- [x] Account lockout after 5 failed attempts — `lockedUntil` set for 15 min; error thrown as `ACCOUNT_LOCKED:{seconds}`
- [x] Login endpoint returns lockout reason with remaining seconds to signin page
- [x] Email notification to user when account is locked — `sendAccountLockedEmail`

### Session Management
- [x] `user_sessions` table — tracks active sessions with `ipAddress`, `userAgent`, `deviceId`
- [x] Session list UI in `settings-security.tsx` — shows all active sessions
- [x] Revoke individual session via `DELETE /api/hr/sessions/[sessionId]`
- [x] Redis revocation blocklist `revoked:session:{id}` checked in `withAuth`
- [x] `invalidateUserSession(userId)` — exported from `lib/auth.ts`
- [x] Auto-expire session after 2 hours inactivity — `session:activity:{sessionId}` Redis key with 7200s TTL, refreshed on each API call
- [x] "Log out all other sessions" button — `DELETE /api/hr/sessions` + UI button in security settings
- [x] Login from new device sends email alert — `sendNewDeviceLoginEmail` via `lib/device-fingerprint.ts`

### Password Security
- [x] `password_history` table — stores last N hashed passwords
- [x] Password reuse prevention in `app/api/hr/change-password/route.ts`
- [x] Minimum password strength enforced — `lib/utils/password-validation.ts`; `PASSWORD_ZOD_SCHEMA` used in change-password route
- [x] `lib/utils/password-validation.ts` — `validatePasswordStrength` exposed to UI (strength meter on signin + invitation pages)
- [x] Password expiry policy — `organizations.passwordExpiryDays`; `users.passwordChangedAt`; configurable in org settings

### Google OAuth
- [x] Google OAuth provider configured in NextAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [x] Link/unlink Google account — `DELETE /api/auth/oauth/google` + `components/settings/connected-accounts.tsx`
- [x] "Continue with Google" button on signin page (shown when `NEXT_PUBLIC_GOOGLE_ENABLED=true`)

### Invitations
- [x] `invitations` table + `app/api/auth/invitation/route.ts`
- [x] `app/(auth)/invitation/[token]/page.tsx` — accept invitation flow
- [x] Invitation expiry (48h) enforced at accept-time — checked in `accept-invitation/route.ts`
- [x] Resend invitation email from `/settings/members` — `POST /api/organization/invitations/resend`

### Audit
- [x] `writeAuditLog` called on auth events (login, logout, password change, MFA toggle, MFA reset, security settings)
- [x] Audit log queryable at `/settings/audit-log`

### Status: ✅ COMPLETE
- [x] Brute-force lockout: 5 failures → `lockedUntil` set → error thrown with seconds remaining → email sent
- [x] MFA backup codes: verified against hashed values; marked `usedAt` on use
- [x] New device email alert on login
- [x] Sliding session inactivity (2h Redis TTL)
- [x] `pnpm tsc --noEmit` — zero new errors
- [x] `pnpm db:migrate` — migration 0027 applied successfully

---

## Implementation Plan

### Phase 1 — Brute Force Lockout (2 days)
1. Add `failedLoginAttempts INT DEFAULT 0` + `lockedUntil TIMESTAMP` to `users` migration
2. In credentials provider: on failure → increment counter; on 5th → set `lockedUntil = now + 15min`
3. On success → reset counter
4. Check `lockedUntil` before auth attempt; return descriptive error with seconds remaining

### Phase 2 — MFA Hardening (2 days)
1. Add `mfaEnforced BOOLEAN DEFAULT false` to `organizations` table
2. In middleware: if `org.mfaEnforced && !user.mfaEnabled` → redirect to `/settings?tab=security&setup=mfa`
3. Generate 8 backup codes on MFA setup — store hashed in `mfa_backup_codes` table
4. Use backup code at login: verify hash, mark used (`usedAt` timestamp)

### Phase 3 — Session & Password Hardening (2 days)
1. Sliding session TTL: on each `withAuth` call, reset Redis TTL to +2 hours
2. "Log out all sessions": call `invalidateUserSession(userId)` + delete all `user_sessions` rows
3. Password strength: `lib/utils/password-validation.ts` with zxcvbn-style scoring; block score < 3
4. Password expiry: cron job daily checks `passwordChangedAt + expiryDays`; sets `mustChangePassword = true`

### Phase 4 — Google OAuth (1 day)
1. Add Google provider in `lib/auth.ts`
2. On first Google login: auto-create user if org invitation exists; else reject
3. Settings → "Connected Accounts" section showing Google linked status
