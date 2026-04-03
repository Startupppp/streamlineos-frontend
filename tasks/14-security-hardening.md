# Task 14: Security Hardening

## Priority: HIGH | Effort: 3-4 days | Dependencies: Task 04 (RBAC) | Status: NOT STARTED

---

## PRD

### Problem Statement
The application handles sensitive financial and HR data but has security gaps:
1. **No MFA/2FA**: Only email+password authentication. No second factor
2. **No CSRF protection**: Forms rely on NextAuth's built-in CSRF but custom API routes may be vulnerable
3. **No input sanitization**: Zod validates structure but doesn't sanitize HTML/XSS in text fields
4. **No brute-force protection on password reset**: Relies on token length only
5. **No password history**: Users can reuse the same password after reset
6. **No session device management**: Users can't see/revoke active sessions
7. **No file upload virus scanning**: Magic byte validation exists but no content scanning
8. **No content security policy refinement**: CSP exists but may be too permissive
9. **No API key authentication**: No way for external integrations to authenticate
10. **Audit log gaps**: Not all sensitive operations are logged

### Goals
- Implement TOTP-based MFA (Google Authenticator, Authy)
- Add input sanitization for all text fields (XSS prevention)
- Implement brute-force protection on all auth endpoints
- Add session management (view/revoke active sessions)
- Add password history tracking (prevent last 5 password reuses)
- Enhance audit logging for all sensitive operations
- Implement API key authentication for integrations
- Add rate limiting on all auth-related endpoints

### Non-Goals
- Hardware security keys (WebAuthn/FIDO2) - future enhancement
- SOC 2 compliance audit - separate process
- Penetration testing - separate engagement
- Data encryption at rest (handled by Neon PostgreSQL)

### Success Criteria
- MFA can be enabled per user
- XSS payloads in text fields are sanitized
- Account locks after 10 failed MFA attempts
- Users can see and revoke their active sessions
- Password reuse of last 5 passwords is blocked
- All sensitive operations appear in audit log
- API keys can be generated for integrations

---

## Rules to Follow

1. **Defense in Depth**: Multiple layers of security, never rely on single control
2. **Principle of Least Privilege**: Default deny, grant minimum required
3. **Secure by Default**: Security features enabled by default, opt-out not opt-in
4. **No Security Through Obscurity**: Don't hide security logic, make it robust
5. **Log Everything Sensitive**: Auth attempts, permission changes, data exports, deletions
6. **Hash Everything Secret**: Passwords, tokens, API keys - bcrypt or argon2
7. **Time-Constant Comparisons**: For tokens, API keys - prevent timing attacks
8. **Rate Limit Auth**: All authentication endpoints must be rate limited

---

## Implementation Steps

### Step 1: Implement TOTP-Based MFA

**Install**: `pnpm add otpauth qrcode`

**Database changes**:
```ts
// Add to users table or new table
export const userMfa = pgTable("user_mfa", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  secret: text("secret").notNull(), // encrypted TOTP secret
  isEnabled: boolean("is_enabled").default(false).notNull(),
  backupCodes: jsonb("backup_codes").$type<string[]>(), // hashed backup codes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Files**:
- `lib/mfa.ts` - TOTP generation, verification, backup codes
- `app/(dashboard)/settings/security/page.tsx` - MFA setup UI
- `components/auth/mfa-setup-dialog.tsx` - QR code display + verification
- `components/auth/mfa-verify-dialog.tsx` - MFA code input during login
- Update `lib/auth.ts` - Add MFA verification step in credentials callback

**Flow**:
1. User goes to Settings > Security > Enable MFA
2. Generate TOTP secret, show QR code
3. User scans with authenticator app, enters verification code
4. On success, enable MFA and show backup codes (one-time display)
5. On login: after password verification, prompt for MFA code
6. Allow backup code as fallback

### Step 2: Input Sanitization

**Install**: `pnpm add dompurify isomorphic-dompurify`

**File**: `lib/sanitize.ts` (NEW)
```ts
import DOMPurify from "isomorphic-dompurify";

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // strip all HTML by default
    ALLOWED_ATTR: [],
  });
}

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // remove angle brackets
    .trim();
}
```

**Apply to**:
- All tRPC mutation inputs that accept text (lead names, notes, descriptions)
- All form submissions
- Chat messages
- Support ticket content
- Email subjects/bodies

### Step 3: Password History Tracking

**Database**:
```ts
export const passwordHistory = pgTable("password_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Logic**:
- On password change: check last 5 entries in `password_history`
- If match found: reject with "Cannot reuse recent passwords"
- On success: insert new entry, prune entries older than 5

### Step 4: Session Management

**Database**:
```ts
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
});
```

**UI**: `app/(dashboard)/settings/security/page.tsx`
```
Active Sessions:
┌─────────────────────────────────────────────────┐
│ Chrome on Windows • 192.168.1.1 • Active now    │
│ [Current Session]                                │
├─────────────────────────────────────────────────┤
│ Firefox on MacOS • 10.0.0.5 • 2 hours ago       │
│ [Revoke]                                         │
├─────────────────────────────────────────────────┤
│ Mobile Safari • 172.16.0.1 • 3 days ago          │
│ [Revoke]                                         │
└─────────────────────────────────────────────────┘
│ [Revoke All Other Sessions]                      │
```

### Step 5: Enhanced Audit Logging

Ensure these operations are ALL logged in `audit_logs`:
```
auth.login_success
auth.login_failure
auth.logout
auth.password_change
auth.password_reset
auth.mfa_enable
auth.mfa_disable
auth.session_revoke
user.create
user.update
user.deactivate
user.role_change
lead.create
lead.delete
lead.export
deal.create
deal.stage_change
deal.delete
expense.approve
expense.reject
payroll.generate
payroll.approve
document.upload
document.delete
settings.update
member.invite
member.remove
api_key.create
api_key.revoke
```

### Step 6: API Key Authentication

**Database**:
```ts
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(), // bcrypt hash
  keyPrefix: text("key_prefix").notNull(), // first 8 chars for identification
  permissions: jsonb("permissions").$type<string[]>().notNull(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
});
```

**Flow**:
1. Admin generates API key in Settings > API Keys
2. Key displayed once (like GitHub tokens)
3. External services send key in `Authorization: Bearer vmc_xxxxx` header
4. Middleware validates key, loads org context and permissions

### Step 7: CSP Refinement

Update `next.config.ts` Content-Security-Policy:
- Tighten `script-src` to remove `'unsafe-inline'` where possible
- Add `nonce` for inline scripts
- Restrict `connect-src` to known API domains
- Add `frame-ancestors 'none'` (already have X-Frame-Options)

---

## Checklist

- [ ] Install `otpauth`, `qrcode`, `isomorphic-dompurify`
- [ ] Create `user_mfa` table migration
- [ ] Create `password_history` table migration
- [ ] Create `user_sessions` table migration
- [ ] Create `api_keys` table migration
- [ ] Implement TOTP generation and verification (`lib/mfa.ts`)
- [ ] Build MFA setup UI (Settings > Security)
- [ ] Add MFA verification step to login flow
- [ ] Generate and display backup codes
- [ ] Implement input sanitization utility (`lib/sanitize.ts`)
- [ ] Apply sanitization to all tRPC text inputs
- [ ] Implement password history check
- [ ] Build session management UI
- [ ] Add session tracking to JWT callback
- [ ] Implement session revocation
- [ ] Create API key generation and validation
- [ ] Build API keys management UI
- [ ] Log ALL sensitive operations to audit_logs
- [ ] Refine CSP headers
- [ ] Rate limit all auth endpoints (requires Task 06)
- [ ] Test: MFA enable/disable/login flow
- [ ] Test: XSS payload in lead name is sanitized
- [ ] Test: Password reuse is blocked
- [ ] Test: Session revocation invalidates token
- [ ] `pnpm build` passes

---

## Acceptance Criteria

1. MFA can be enabled and used to login
2. Backup codes work when authenticator is unavailable
3. `<script>alert('xss')</script>` in any text field is stripped
4. Password reuse of last 5 passwords is rejected
5. Active sessions visible in settings with revoke capability
6. API keys can be generated and used for authentication
7. All listed operations appear in audit log

---

## Testing Plan

1. **MFA**: Enable MFA, verify QR code scans, test correct/incorrect TOTP codes
2. **XSS**: Submit HTML payloads in lead name, note, chat message - verify stripped
3. **Password History**: Change password 5 times, try reusing first password - verify rejected
4. **Session Management**: Login from 2 browsers, revoke one, verify revoked session is invalid
5. **API Keys**: Generate key, make API call with key, verify access granted
6. **Brute Force**: Send 15 incorrect MFA codes, verify account temp-locked
7. **Audit Log**: Perform each sensitive operation, verify log entry created
