# BUILD OS — Testing Summary (2026-09-29 ~19:56 IST Asia/Calcutta)

**Target:** https://www.streamlineos.in/build/command-center (PRODUCTION)  
**Org:** QA HRMS Org  
**Gate:** 🟠 **PASS WITH CONDITIONS** — **Cos accepted** 2026-09-29 ~19:57 IST

## Testing Summary
Re-tested after 2026-09-28 cycles FAIL. Owner created healthy project **45** (QRC2), loaded detail, created issue **QRC2-1** — no array-vs-object / Failed to load. Team Members Save adding Build Module Member did **not** brick Owner or Member on 45. Client access grant path remains a dead end (empty membership list, no invite CTA). Invite still cannot grant Build at invite time. No new release-blocker found beyond known deferred P0s.

## Issues (bugs only)
See `BUILD-OS-BUGS.md`. Hottest remaining:
- P0 Client grant / invite CTA — STILL BROKEN (Batch 8)
- P0 Invite missing Build Module Member — STILL (Batch 9)
- Open prior: onboarding Skip inconsistency

## UX / missing / suggestions (not stamped as crash bugs)
- Member Command Center Projects count 0 while project 45 opens (P2 watch)
- First Create Issue click lag / double-click needed once (Batch 6 note)
- 375: floating capture toolbar overlaps shortcut chips
- Client Access buried under More tools (discoverability)

## Next Steps
1. ~~Cos accept~~ ✅ PASS WITH CONDITIONS (Client deferred)
2. Cursor/Claude: Client portal membership invite + Invite Build role
3. QA: after those land, re-prove Client grant + invite Build role only (core journey already green on 45)

## Evidence index
`60` session · `61`–`63` create/load/issue · `64`–`67` Team Members · `68`–`69` Client · `70` invite roles · `71` Owner CC · `72`/`72b` 375

---

## 2026-09-30 Engineering

Two P0s and two P1s committed and unit-tested. Three P0s remain in flight.

### Committed (unit-tested; not yet browser-re-proved against production)

| Commit | Fix | Unit coverage |
| --- | --- | --- |
| ad78465ed | P0 Onboarding cross-module gate — `resolveWizardGate` now path-scoped; HR wizard only fires on `/hr/*` and `/employee-onboarding*` | `wizard-gate.test.ts` + `wizard-gate-admin-defer.test.ts` |
| ad78465ed | P0 Onboarding policy inconsistency — `mayDeferOwnOnboarding` now `isOrgOwner !== true`; ORG_ADMIN and MEMBER resolve identically | same suites above |
| 51d58900e | P1 Session opaque expiry — `endSession`/`requireSession`/`requirePermission`/expired-state button all route through `signInPathForMissingSession`; sign-in page shows the reason | 5 suites, 62 tests + signin-session-expired spec (4 tests) |
| 51d58900e | P1 Dead /register and /auth/login routes — both now redirect to `/signin` via `next.config.ts` | `next.config.redirects.test.ts` |

These fixes compile and have passing unit tests. None has been run in a browser against production. Re-prove required after confirmed Vercel deploy.

### In flight (other lanes, do not mark fixed)

| Item | State |
| --- | --- |
| P0 Roles - invite cannot grant Build | **FIXED** a9fadf643 + 13aadb99d. Migration `1702_invitation_module_access` **applied to production**; 272 backend invitation tests pass; not browser-re-proved |
| P0 Client grant path | Invite CTA + membership-creation path added to `features/portal-access`; 2 frontend tests + 1 backend tenant-isolation spec (arity break) still failing |
| P0 Project invite UX — workspace ≠ project | Project-level "Add member" on Access page calling `POST /build/{projectId}/members` added; workspace copy/toast corrected; 6 frontend tests still failing |

### What only a browser can settle

- **P2 Chrome overlay** (Feedbucket / ASK OS): "+ New" / primary CTAs clickable at 1280 and 375. jsdom cannot see layout overflow, real focus order, or paint — no test can close this.
- **P2 Command Center watch**: honest empty state already observed post-project; re-observe after deploy for empty-org regression. Not an open defect.
- 375px floating capture toolbar overlapping shortcut chips: layout-only, browser required.
- Member Command Center Projects count 0 while project 45 opens: P2 watch item, not a crash.
- **All four committed P0/P1 fixes**: must be re-proved in a browser against production once the Vercel deploy is confirmed.

### Deployment status

- Backend: Railway auto-deploys on push — any merged backend change is live.
- Frontend: Vercel deploys separately; a merge to main does not guarantee a production frontend rollout.
- Migration 1702 (`1702_invitation_module_access`): **applied to production 2026-09-30**. Watermark `1803093645725`, 0 pending. Applied ahead of the code deploy deliberately - an additive table nothing reads yet is safe, whereas a live call site against an unapplied migration is the deploy landmine.
- GitHub Actions CI: billing lapsed — red workflows are not evidence of defects.
