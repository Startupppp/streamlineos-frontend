# BUILD OS — bugs only (Cos package)

**Module:** Build OS · `https://www.streamlineos.in/build/command-center`  
**Env:** PRODUCTION  
**Stamped:** 2026-09-28 ~17:46 IST (Batch 5 FAIL) · **Re-test Batch 6:** 2026-09-29 ~19:41 IST Asia/Calcutta — create→load→issue **PASS** on `/build/45`; gate not FINAL yet  
**Release gate:** 🟠 **PASS WITH CONDITIONS** (stamped 2026-09-29 ~19:56 IST Asia/Calcutta) — core CRUD+Team Members green; Client CUT/deferred P0; invite Build role still FIX  
**Full evidence:** `BUILD-OS-FINAL-FAIL.md` · `RELEASE-GATE.md`

Checkbox format for Cursor/Claude:
```
- [ ] P0|P1|P2 — Area — Bug — URL — Steps — Expected — Actual
```

---

## P0 — release blockers

- [x] P0 — Project — `/build/{id}/cycles` contract — **FIXED VERIFIED Batch 6** (`{stamp}`) — Fresh Owner `/build/45` loads; issue QRC2-1 created. Prior fixtures **35 / 36 / 39** remain historical repro only. Evidence: `61`–`63`.

- [x] P0 — Project — Create → open → create issue journey — **PASS Batch 6** — Owner create QRC2 `/build/45` → load → Create Issue QRC2-1. Evidence: `61`–`63`.

- [x] P0 — Project — Team Members Save bricks project — **Owner NOT REPRO Batch 7** on healthy `/build/45` (added buildqauser → Save → Owner still loads; issues OK). Member open **PASS Batch 7b** (`2026-09-29 ~19:49 IST Asia/Calcutta`). Fixture `/build/35` = historical. Evidence: `64`–`66`. (2026-09-29 ~19:44 IST Asia/Calcutta)

- [x] P0 — Client — Grant path dead-end — `/build/settings/client-access` — Expected: invite/create portal membership — Actual was **STILL BROKEN Batch 8** (2026-09-29 ~19:53 IST Asia/Calcutta): empty Portal membership dropdown + **Membership is required** + **no invite CTA** on healthy project **45**. Evidence: `68`–`69`. — **FIXED COMMITTED 2026-09-30** (`467e793ab` backend, `ba257ebb4` frontend) — `POST /portal-access/invite-client` creates party + contact + ACTIVE membership in one call, so the dropdown cannot be empty by construction; Invite Client CTA on the page and inside the grant dialog's empty state; project picker replaces the raw numeric Project ID input. The ACTIVE-membership requirement on grant creation was deliberately **not** weakened. Unit-tested: 18 + 7 frontend, 55 backend. **Not yet browser-re-proved against production.**

- [x] P0 — Roles — Invite cannot grant Build — `/settings/users` Invite — Expected: Build Module Member at invite — Actual was **STILL Member | Org Admin only** (Batch 9 2026-09-29 ~19:56 IST Asia/Calcutta). Evidence: `70-invite-role-options.png`. — **FIXED COMMITTED 2026-09-30** (`a9fadf643` backend, `13aadb99d` frontend) — an invite carries `moduleAccess: [{moduleKey, standing}]`; standings are resolved to seeded module roles per org and applied as `role_assignments` at acceptance. Migration `1702_invitation_module_access` (journal idx 1157) **APPLIED TO PRODUCTION 2026-09-30**, watermark now `1803093645725`, 0 pending. Unit-tested: 24 behavioural tests, 272 across all 24 invitation suites. Roles-assign workaround no longer required, but still works. **Not yet browser-re-proved against production.**

  Two privilege-escalation holes were found by adversarial review during this work and closed in the same commit: **resend** re-validates every attached standing against the resender (re-issuing the token is the grant), and **acceptance** re-checks the inviter's standing as it is now, skipping with an audit entry when the inviter has been demoted or removed. A second independent review confirmed both closed.

- [x] P0 — Onboarding — Cross-module silent gate — **FIXED COMMITTED 2026-09-30** (ad78465ed) — `resolveWizardGate` now takes the destination path; the HR wizard gate only fires on `/hr/*` and `/employee-onboarding*`; Build and settings routes are no longer gated. Unit-tested: `wizard-gate.test.ts` + `wizard-gate-admin-defer.test.ts`. **Not yet browser-re-proved against production.**

- [x] P0 — Onboarding — Policy inconsistency — **FIXED COMMITTED 2026-09-30** (ad78465ed) — `mayDeferOwnOnboarding` now `isOrgOwner !== true`; ORG_ADMIN and MEMBER resolve through the same code path. **Not yet browser-re-proved against production.**

- [x] P0 — Project invite UX — Workspace ≠ project — Build settings → Members “Add member” — Expected: clear project invite OR unlock project — Actual was: toast **Member added to workspace**; `/build/35` still **not invited**. — **FIXED COMMITTED 2026-09-30** (`3c575b709`) — the project Access page now has its own control posting to `POST /build/{projectId}/members`, the endpoint that already existed and only project creation was calling. The workspace dialog now says what it does and a test pins that copy so it cannot drift back into claiming a project invite. Root cause was not the toast string: the control wrote `build_members`, which project access never reads. Unit-tested: 11 + 5 + 18 + 13. **Not yet browser-re-proved against production.**

---

## P1

- [x] P1 — Invite — Build role only via Roles admin — `/settings/roles` → Build Module Member assign works — Expected: same role available at invite time — **FIXED COMMITTED 2026-09-30** — same fix as the P0 Roles entry above; migration applied to production. **Not yet browser-re-proved against production.**

- [x] P1 — Project — Build Module Member not auto-added to new project — **mitigated on `/build/45`**: Team Members Save works (Batch 7/7b). Still no auto-add after create — product FIX optional. Historical brick on 35 only.

- [x] P1 — Session — Opaque expiry → `/signin` — **FIXED COMMITTED 2026-09-30** (51d58900e) — `endSession`, `requireSession`/`requirePermission` call sites, and the expired page-state button all route through `signInPathForMissingSession`; sign-in page now reads and displays the expiry reason. Unit-tested: 5 suites, 62 tests + signin-session-expired spec (4 tests). **Not yet browser-re-proved against production.**

- [x] P1 — Auth — Dead register/login routes — **FIXED COMMITTED 2026-09-30** (51d58900e) — `/register` and `/auth/login` added to `redirects()` in `next.config.ts`. Unit-tested: `next.config.redirects.test.ts`. **Not yet browser-re-proved against production.**

---

## P2 / watch

- [ ] P2 — Command Center — Open risks / Releases — Empty org historically showed **Validation failed** (`13`); post-project Owner+Member show honest empty (`41`/`42`) — Watch for empty-org regression only.

- [ ] P2 — Chrome — Feedbucket / ASK OS overlays — Ensure + New / primary CTAs clickable at 1280 and 375.

---

## Not bugs (verified / product CUT — do not “fix” as defects)

| Item | Note |
| --- | --- |
| Programs → `/signin` on fresh Owner | **NOT REPRO** — loads “No programs yet” |
| Build Module Member org read | KEEP — CC / Projects list / Inbox / My Work ALLOW; settings Invite DENY |
| Grant path `/settings/roles` → Build Module Member | KEEP workaround until invite offers the role |
| Products / Portfolios / Programs week-1 | Product **CUT** (noise), not a crash |
| Fixtures 35 / 36 / 39 | Repro only — do not use for happy-path until cycles fixed |

---

## Re-test order after cycles fix

1. Owner create project → load → create issue  
2. Project settings → Team Members → Save → Member + Owner still load  
3. Client access grant with invite CTA  
4. Invite offers Build Module Member (or document Roles grant as required step)

---

## Batch 6 status (2026-09-29 ~19:41 IST Asia/Calcutta)

- Create→load→issue on fresh `/build/45` (QRC2): **PASS**
- Team Members Save on `/build/45`: **PENDING**
- Client access invite CTA: **PENDING**
- Cos FINAL: do **not** stamp PASS until remaining re-test order completes

## Batch 7b status (2026-09-29 ~19:49 IST Asia/Calcutta)

- Team Members Save on `/build/45`: Owner **PASS** + Member **PASS**
- Client access invite CTA: **NEXT**

## Batch 8 status (2026-09-29 ~19:53 IST Asia/Calcutta)

- Client access invite CTA: **STILL BROKEN** (empty membership, no invite CTA)

## Batch 9 / Cos FINAL recommendation (2026-09-29 ~19:56 IST Asia/Calcutta)

**Stamp: PASS WITH CONDITIONS**

| Item | Status |
| --- | --- |
| Create→load→issue (cycles) | PASS `/build/45` |
| Team Members Save Owner+Member | PASS `/build/45` |
| Client invite CTA | STILL BROKEN — CUT/deferred known P0 |
| Invite offers Build Module Member | STILL NO — FIX (Roles workaround KEEP) |
| Dual persona Owner + Build Module Member | PASS (prior + Batch 7b/9) |
| New release-blocker this pass | NONE |

Do not invent Client workarounds.

## 2026-09-30 engineering batch

| Item | Status |
| --- | --- |
| P0 Onboarding cross-module gate | **FIXED** — committed ad78465ed, unit-tested, not browser-re-proved |
| P0 Onboarding policy inconsistency | **FIXED** — committed ad78465ed, unit-tested, not browser-re-proved |
| P1 Session opaque expiry | **FIXED** — committed 51d58900e, unit-tested, not browser-re-proved |
| P1 Dead register/login routes | **FIXED** — committed 51d58900e, unit-tested, not browser-re-proved |
| P0 Roles - invite cannot grant Build | **FIXED** - a9fadf643 + 13aadb99d; migration 1702 **APPLIED TO PRODUCTION**; 272 backend tests; not browser-re-proved |
| P0 Client grant path | **FIXED** - 467e793ab + ba257ebb4; invite-client creates an ACTIVE membership; not browser-re-proved |
| P0 Project invite UX - workspace vs project | **FIXED** - 3c575b709; project Access page posts to /build/{projectId}/members; not browser-re-proved |
| P2 Chrome overlay (Feedbucket/ASK OS) | **BROWSER ONLY** — jsdom cannot see layout overflow; re-prove against production after deploy |
| P2 Member CC Projects count 0 / 375 toolbar overlap | **WATCH** — not a crash; re-observe after deploy |

Frontend deploy: **merging ≠ deploying**; Vercel rollout is a separate step.  
Backend deploy: Railway ships on every push to the backend repo.  
Migration 1702 (`1702_invitation_module_access`): **APPLIED TO PRODUCTION 2026-09-30**. Ledger 1051 rows / 1030 entries, watermark `1803093645725`, **0 pending**. RLS enabled with a `tenant_isolation` policy and grants to `streamline_app`, both asserted by the migration's own post-check.  
CI: GitHub Actions billing lapsed — a red workflow is not evidence of a defect.

