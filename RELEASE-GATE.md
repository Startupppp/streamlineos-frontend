# BUILD OS — Cos release gate

**Verdict:** 🟠 **PASS WITH CONDITIONS**  
**Stamped:** 2026-09-29 ~19:56 IST Asia/Calcutta  
**Cos accepted:** 2026-09-29 ~19:57 IST — **PASS WITH CONDITIONS** (Client CUT/deferred)  
**Checklist:** `/workspace/streamlineos-build/BUILD-OS-TODOS.md` · Bugs: `BUILD-OS-BUGS.md` · Summary: `TESTING-SUMMARY-2026-09-29.md`

## Green (this re-test)
1. Owner create → load → create issue on fresh `/build/45` (QRC2) — cycles P0 **FIXED VERIFIED**
2. Team Members Save on `/build/45` — Owner + Build Module Member still load — prior brick **NOT REPRO** on healthy project
3. Dual persona: Owner Build OK; Build Module Member opens `/build/45` + CC ALLOW
4. Responsive 375: `+ New` not blocked

## Conditions (known / deferred — not newly discovered)
1. **Client access** grant path - **CLOSED IN CODE 2026-09-30** (467e793ab + ba257ebb4). `POST /portal-access/invite-client` creates party + contact + ACTIVE membership in one call, so the dropdown cannot be empty by construction; Invite Client CTA on the page and in the grant dialog's empty state. The ACTIVE requirement on grant creation was deliberately not weakened. No workaround was invented. **Not browser-re-proved against production.**
2. **Invite Role picker** - **CLOSED IN CODE 2026-09-30** (a9fadf643 + 13aadb99d). The invite carries `moduleAccess: [{moduleKey, standing}]`; migration `1702_invitation_module_access` is **APPLIED TO PRODUCTION**. Two privilege-escalation holes found by review (unchecked resend, stale authority at acceptance) were closed in the same change. **Not browser-re-proved against production.**
3. **Onboarding Skip inconsistency** — addressed in code (ad78465ed, 2026-09-30): HR wizard now path-scoped; ORG_ADMIN/MEMBER policy unified; unit-tested. **Not yet browser-re-proved against production.** Cannot mark green until QA confirms on production.
4. **Project invite UX - workspace vs project** - **CLOSED IN CODE 2026-09-30** (3c575b709). The project Access page posts to `POST /build/{projectId}/members`; the workspace dialog no longer reads as a project invite. **Not browser-re-proved against production.**
5. **P2 UX watch:** Member CC Projects count 0 while `/build/45` opens; floating capture toolbar overlap at 375 — **BROWSER ONLY** (jsdom cannot see these); re-prove post-deploy

## Deployment reality
- Backend: Railway auto-deploys on every backend push — already live for any merged backend change.
- Frontend: Vercel deploys separately; merging to main does **not** guarantee a production frontend rollout.
- Migration 1702 (`1702_invitation_module_access`): **APPLIED TO PRODUCTION 2026-09-30**. Watermark `1803093645725`, 0 pending.
- CI: GitHub Actions billing lapsed — red workflow is not evidence of a defect.

## Historical fixtures
`/build/35` `/build/36` `/build/39` = prior FAIL repro only — do not use for happy-path

## First fixes for Cursor/Claude (remaining as of 2026-09-30)

Done (committed, unit-tested, **not** yet browser-re-proved):
- ~~Onboarding: HR wizard path-scoped, ORG_ADMIN/MEMBER policy unified~~ → ad78465ed
- ~~Session expiry: clear reason + return URL~~ → 51d58900e
- ~~Dead /register /auth/login routes~~ → 51d58900e

Still needed before full gate close:
1. Client: invite/create portal membership CTA + populate membership dropdown (in progress)
2. ~~Invite: offer Build Module Member at invite time~~ **DONE** (a9fadf643 + 13aadb99d, migration applied to production)
3. Project Access page "Add member" → project-scoped invite (in progress)
4. Browser re-prove of the four committed fixes against production once Vercel deploy is confirmed
5. Browser re-prove of P2 watch items (overlay, CC Projects count) after deploy

## 2026-09-30 gate update

| Item | Status |
| --- | --- |
| Onboarding cross-module gate (P0) | Committed ad78465ed · unit-tested · **not browser-re-proved** |
| Onboarding policy inconsistency (P0) | Committed ad78465ed · unit-tested · **not browser-re-proved** |
| Session opaque expiry (P1) | Committed 51d58900e · unit-tested · **not browser-re-proved** |
| Dead register/login routes (P1) | Committed 51d58900e · unit-tested · **not browser-re-proved** |
| Roles - invite cannot grant Build (P0) | FIXED - migration APPLIED to production; 272 tests |
| Client grant path (P0) | FIXED - 18+7 frontend, 55 backend tests pass |
| Project invite UX (P0) | FIXED - 11+5+18+13 frontend tests pass |
| Chrome overlay P2 / CC count P2 | Browser-only; cannot close from code |
