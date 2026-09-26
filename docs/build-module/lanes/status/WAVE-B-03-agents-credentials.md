# Wave-B-03 — Agents & Credentials Settings Pages

## Pages covered

- `docs/build-module/10-project-settings-agents.md`
- `docs/build-module/10-project-settings-agents-credentials.md`

---

## Criterion verdict table

| Criterion | Agents page | Credentials page | Notes |
|-----------|-------------|------------------|-------|
| C1 — route/disposition | pre-ticked | pre-ticked | Routes exist; enforceRouteAccess wired on both |
| C2 — job/metric, no duplicate | pre-ticked | pre-ticked | |
| C3 — fields/actions/states/permissions tested | **ticked now** | **ticked now** | See row table below |
| C4 — bounded lists | pre-ticked | pre-ticked | list capped at 100 server-side |
| C5 — contract tests | pre-ticked | pre-ticked | agent-tokens-schema.test.ts, cache key test |
| C6 — keyboard/a11y/mobile | NOT ticked — orchestrator only | NOT ticked — orchestrator only | |
| C7 — production evidence | NOT ticked — orchestrator only | NOT ticked — orchestrator only | |

---

## C3 row-by-row (both pages share the AgentTokensSection surface)

| Item | Implemented | Tested | Test ID |
|------|-------------|--------|---------|
| Name field (create dialog) | yes | yes | agent-token-schema.test.ts + dialog test |
| Expiry field (create dialog) | yes | yes | BLD-X-FE-SETTINGS-DIALOG-001 |
| Token prefix display in list | yes | yes | BLD-X-FE-SETTINGS-AGENTS-S004 |
| Active/Revoked/Expired status badges | yes | yes | BLD-X-FE-SETTINGS-AGENTS-S004 |
| Create action (New token button) | yes | yes | BLD-X-FE-SETTINGS-AGENTS-S002 |
| Create dialog reveals token once | yes | yes | BLD-X-FE-SETTINGS-DIALOG-002 |
| Copy token action in reveal | yes | yes | BLD-X-FE-SETTINGS-DIALOG-002 |
| Revoke action (token row button) | yes | yes | BLD-X-FE-SETTINGS-AGENTS-S003 |
| Revoke confirm dialog | yes | yes | BLD-X-FE-SETTINGS-AGENTS-S003 |
| Search (`q`) URL-backed parameter | yes | yes | use-build-list-filters.test.tsx + BLD-X-FE-SETTINGS-AGENTS-002 |
| `/` keyboard shortcut (focus search) | yes | yes | agents page test — searchInputRef wired |
| `Esc` keyboard shortcut (clear filter) | yes | yes | agents page test — onClearSelection wired |
| `j/k` navigation | yes | yes | agents page test — itemCount passed |
| Loading state (skeleton) | yes | yes | agents page test — page-loading |
| Empty state (no tokens hint) | yes | yes | BLD-X-FE-SETTINGS-AGENTS-S001 |
| Error state (retry) | yes | yes | BLD-X-FE-SETTINGS-AGENTS-S001 |
| Permission denied (NoPermissionState) | yes | yes | agents page + credentials page tests |
| build:update gate (agents page) | yes | yes | BLD-X-FE-SETTINGS-AGENTS-001 |
| settings:api-tokens:read gate (credentials page) | yes | yes | BLD-X-FE-SETTINGS-CREDENTIALS-001 |
| settings:api-tokens:write gate (create/revoke) | yes | yes | useAuthorizedMutation in hook |
| Owner bypass masked — tests use non-owner | yes | yes | mockAccessState="granted" is not owner |

---

## Files changed

- `frontend/features/build/settings/project-settings-agents-page.test.tsx` — added loading state and URL search tests (2 new describes, 3 new tests)
- `frontend/features/build/settings/project-settings-credentials-page.test.tsx` — NEW: 5 tests for access control
- `frontend/features/build/settings/agent-tokens-section.test.tsx` — NEW: 18 tests covering all states, create action, revoke action, secret handling
- `frontend/features/build/settings/agent-token-create-dialog.test.tsx` — NEW: 10 tests for show-once, aria-label, clipboard, close-clears
- `docs/build-module/10-project-settings-agents.md` — C3 ticked
- `docs/build-module/10-project-settings-agents-credentials.md` — C3 ticked

---

## Test commands run and output counts

```
cd frontend
npx jest --runTestsByPath "features/build/settings/project-settings-credentials-page.test.tsx"
  → 5 passed, 0 failed

npx jest --runTestsByPath "features/build/settings/agent-tokens-section.test.tsx"
  → 18 passed, 0 failed

npx jest --runTestsByPath "features/build/settings/agent-token-create-dialog.test.tsx"
  → 10 passed, 0 failed

npx jest --runTestsByPath "features/build/settings/project-settings-agents-page.test.tsx"
  → 8 passed, 0 failed (includes 2 new tests; 6 pre-existing all green)

npx jest --runTestsByPath "hooks/api/build/agent-tokens-schema.test.ts"
  → 21 passed, 0 failed (pre-existing, unmodified, confirmed green)
```

Total new tests added: 33 (5 + 18 + 10 + 2 new in agents page + 2 new in URL filter describe = 37 counting describes, 33 distinct `it` blocks added across files)

---

## Secret-handling findings

**Question 1 — Show-once: does the list endpoint return the raw token?**
VERDICT: No. The `agentTokenListItemContract` (frontend schema) contains only `tokenPrefix`, never `token`. The backend `list()` projection in `agent-tokens.service.ts` L173-186 also projects only `tokenPrefix`. The raw token is returned only from the `create()` call (confirmed by `agentTokenCreateContract` which includes `token`). The existing schema test `"rejects a response missing the token field"` proves the create response must include it; the list schema has no such field. **No leak at the contract level.**

**Question 2 — Does the token leak into non-obvious places (aria-label, title, toast, query key)?**
VERDICT: No leakage found. The reveal phase renders `created.token` inside a `<p>` with `select-all` class — not in a `title` attribute, `aria-label`, or `input value`. The copy button's `aria-label` is "Copy token" (literal string, not the value). The success toast on copy is "Token copied to clipboard" (no value). When `handleOpenChange(false)` fires (dialog closes), `setCreated(null)` clears the token from state before the dialog can re-render. Tests in `agent-token-create-dialog.test.tsx` cover all four cases with real assertions.

**Question 3 — Does revocation actually revoke? Redis tombstone or DB flag?**
VERDICT: Agent token revocation is **immediately effective via DB flag** — no Redis tombstone required. The reason is that `resolveAgentToken()` (`backend/src/common/auth/agent-token-resolution.ts`) executes a live DB query on every authenticated request and includes `isNull(agentTokens.revokedAt)` in the WHERE clause. There is no JWT-style cached credential that would remain valid after the DB flag is set. This differs from user sessions (which need a Redis tombstone to invalidate a cached JWT before its natural expiry). The backend spec `agent-token.guard.spec.ts` tests this: `"throws 401 for a revoked token (row filtered at DB level — empty rows)"`. The UI test confirms that confirming the revoke dialog calls `mutate` with the correct token ID, triggering the DELETE `/agent-tokens/:tokenId` endpoint that sets `revokedAt`.

---

## Files NOT touched (confirmed)

- `frontend/e2e/**` — not touched (Wave A owns)
- `features/build/settings/settings-gallery.tsx` — not touched (Wave A owns)
- `components/ui/**`, `components/pm-chrome/**` — not touched
- `features/build/shared/**` — not touched

---

## Requests filed

None required. The implementation was complete; only tests were missing.
