# Handoff — UX-016 / UX-016b · Invite accept (PM-011 Slice 1+)
**Role:** Principal Product Designer · **Tied to:** PM-011, BUG-001, UX-001  
**Viewport:** Desktop 1280×800 primary; mobile stack UNTESTED but form must not blank  
**Constraints:** ADOPT multi-method auth later (PM-004); AVOID perm dump on accept; email-lock Google

---

## UX-016 — Cold invite accept (`/invitation/{token}`)

### Layout (desktop)
- **50/50 split** (match existing sign-in chrome): LEFT = accept system UI; RIGHT = marketing (optional).
- LEFT is mandatory: never render marketing alone.
- Within **2s of load**, LEFT must show either:
  - **Form root** (`data-testid="invite-accept-root"`), or
  - **Error root** (`data-testid="invite-accept-error"`).
- Until ready: **skeleton** in LEFT (title bar + 3 field lines + CTA pill) — no empty white.

### Form root content (valid pending token)
1. Eyebrow: “You’re invited”
2. Title: Join **{orgName}**
3. Meta: Role **{roleLabel}** · Invited as **{maskedEmail}**
4. Primary CTA: **Continue** (starts OTP to invited email) — or Google only if account email **equals** invite email
5. Secondary: Privacy / Terms (existing footer pattern)
6. Trust: “This invite expires {relativeDate}”

### Error root variants
| State | Title | Body | Primary CTA |
|-------|-------|------|-------------|
| Invalid/malformed | Invite link invalid | Ask your admin for a new invite | Go to sign in |
| Expired | Invite expired | Ask your admin to resend | Go to sign in |
| Revoked | Invite revoked | This invite is no longer valid | Go to sign in |
| Hydrate fail / offline | Can’t load invite | Check connection and retry | Retry |
| Slow >2s then fail | same as hydrate | — | Retry |

### Interaction states
| State | Behavior |
|-------|----------|
| Default | CTA enabled when ready |
| Loading hydrate | Skeleton; `aria-busy=true` on left region |
| Loading submit | CTA spinner; disable double-click |
| Validation | OTP inline errors; `aria-invalid` |
| Success | Brief success → navigate `callbackUrl` or `/build` if Build access |
| Permission | If org gate blocks Build: clear “You’re in {org} — Build access pending” |

### Accessibility AC
- Left region labelled `aria-label="Accept invitation"`
- Focus to title on paint; focus first error on fail
- Keyboard-only complete path
- Contrast AA on text/CTA; skeleton not only-color status

### QA AC (Designer sign-off)
- [ ] apex + www: form or error root ≤2s (×2 fresh profiles)
- [ ] No CLS blank-left
- [ ] Double-click Accept does not double-consume without message
- [ ] Slow 3G: skeleton then form/error — never indefinite white

---

## UX-016b — Already-active / provisioned Member hits invite link

### When
Server says membership **active** for this token/email (includes 409 lifecycle cases).

### Layout
Same chrome; LEFT **error/info root** (not blank, not raw API error).

### Content
1. Title: You’re already a member of **{orgName}**
2. Body: Signed up as **{maskedEmail}** · Role **{roleLabel}**
3. Primary: **Sign in** → `/signin` with `callbackUrl` to Build/org
4. Secondary: **Wrong account?** → sign out hint / use invited email
5. Do **not** show Accept CTA

### Owner-side companion (FR5)
When Owner invites an email that is already active:
- Dialog: “{email} is already a member.”
- Actions: **Copy sign-in link** · **View member** · Cancel
- Never surface opaque **409** alone

---

## Wireframe (text)

```
┌──────────────────────────┬──────────────────────────┐
│ You’re invited           │  [marketing / brand]     │
│ Join PXC-Design-A-…      │                          │
│ Role Member · a***@…     │                          │
│ [ Continue ]             │                          │
│ Privacy · Terms          │                          │
└──────────────────────────┴──────────────────────────┘
```

Already-active:
```
│ You’re already a member of PXC-Design-A-…           │
│ [ Sign in ]     Wrong account?                      │
```

---

## Out of scope here
SSO/passkeys (PM-004) · role matrix (PM-002) · Client portal guest (PM-001/006)
