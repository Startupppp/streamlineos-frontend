# UX notes — Org Settings, Round 2 (2026-10-15)

Bugs are in BUGS.md; this file covers usability, copy, and interaction notes. Org "ADitay CAhala", actor owner (user's own session). Test prefix QA1015R2. Items that overlap a bug cite ORG-B-xxx.

## Must change

1. **Raw zod messages on over-limit fields.** Legal name / Registration number (and similar) show strings like "Too big: expected string to have <=200 characters" after Save (ORG-B-010). Map to friendly inline copy (e.g. "Must be 200 characters or fewer") and put `maxlength` (or a counter) on the inputs so the limit is discoverable before submit.

2. **Duplicate code 409 is silent.** Cost-centre (and likely other hierarchy) create returns 409 with no toast and no inline "Code already in use" (ORG-B-013). Surface the conflict on the Code field (and a generic error toast for other failures) so the user is not left staring at an open dialog.

3. **Creates and archives take 10–25 s with only a spinner.** Org-hierarchy and access writes (locations, cost centres, archives, delegations) show a long spinner and sometimes a generic "Network error" while the server may still finish (ORG-B-014). Add optimistic or "still saving…" feedback, reconcile with a list refetch before erroring, and avoid looking like a hard network failure on slow dependency checks.

4. **No Send-test control for webhooks.** After create there is no way to fire a test delivery from the UI. Add a "Send test" action so operators can verify the URL without waiting for a real event.

5. **Industry list differs between onboarding and org settings.** Onboarding offers "Agency"; Organization → General Industry edit does not, and the saved value renders blank (ORG-B-003). Keep one shared industry enum everywhere and show the stored value even if it is legacy.

6. **No delete for permission groups.** Groups only expose Rename / Manage; leftover "QA1015 role" and "QA1015R2 group" cannot be removed from the UI (ORG-B-009). Provide Archive or Delete (with confirm) for custom groups.

## Good to have

1. **Timestamps in the org timezone.** Delegations and webhooks show UTC dates/times while Localization is Asia/Calcutta (ORG-B-016). Format org-facing timestamps with the org timezone (or label the zone).

2. **Inline validation for session-policy fields.** Validate max sessions (e.g. −5), bad domain, and bad IP inline in the form before Save, even when the policy is not persisted in this round (lockout risk).

3. **Confirm before PAT revoke and remove the row immediately.** Revoke already has a confirm path; after confirm, drop or mark the row without requiring a full page reload (ORG-B-015).
