# Phase 3 — Principal Product Designer Independent Pass
Product: StreamlineOS · Build module · Access 2026-09-30
Role observed: Org Owner (Account A) · Viewport: 1280×800 desktop
Evidence base: Surface Ledger `surface-ledger-draft.md`
Truth rule: only VERIFIED friction from Owner session; Member/guest paths marked UNTESTED.

---

## 1. Journey map (observed)

| Journey | Steps VERIFIED | Outcome |
|---------|----------------|---------|
| J1 Activate | Marketing → OTP sign-in → Org setup → Dashboard → Build → Create project → First issue | Success; high step count |
| J2 Daily delivery | Build → Project → Issues Board/Backlog/Cycles | Board works; Cycles empty OK |
| J3 Stakeholder share | Project → Client portal | Unpublished; guest UNTESTED |
| J4 Admin / trust | Settings roles, API tokens, billing, integrations | Surfaces exist; dense |
| J5 Collaborate | Invite Member via `/settings/users` | Invite sent VERIFIED; Member UX UNTESTED |

---

## 2. UX scorecard by journey (1–5)

Scoring: 1 poor · 3 adequate · 5 excellent. Evidence-tied.

### J1 Activation (Owner)
| Dimension | Score | Evidence |
|-----------|------:|----------|
| Discoverability | 3 | Build in suite switcher + dashboard “Set up Build”; empty CTAs clear |
| Clarity | 3 | Org setup fields clear; OTP flow has no password mental model |
| Efficiency | 2 | Many steps before first issue (OTP + org wizard + project wizard + issue) |
| Consistency | 3 | Black primary CTAs, empty states pattern holds |
| Accessibility | 2 | Heuristic risk: icon-heavy nav, ⌘K hint desktop-centric; a11y not audited |
| Trust | 2 | Session expiry mid-flow; OTP-only; trial banner + console 401/402 |
| Responsiveness | 2 | Desktop only VERIFIED; mobile UNTESTED |
| Delight | 3 | Empty-state illustration; ASK OS present but untested |

### J2 Daily delivery
| Dimension | Score | Evidence |
|-----------|------:|----------|
| Discoverability | 3 | Projects default; Board views present |
| Clarity | 4 | Status cards + Board columns match real-world delivery |
| Efficiency | 4 | Board + List/Table/Timeline/Workload = power-user density |
| Consistency | 3 | Module switcher Home OS/Build OS distinctive |
| Accessibility | 2 | Heuristic risk on dense toolbars |
| Trust | 3 | Synthetic CRUD persisted in session |
| Responsiveness | 2 | UNTESTED mobile |
| Delight | 3 | Feature-rich More tools (risk of overwhelm) |

### J3 Client portal
| Dimension | Score | Evidence |
|-----------|------:|----------|
| Discoverability | 2 | Buried in project sidebar; unpublished default |
| Clarity | UNTESTED guest | Owner sees unpublished empty |
| Efficiency | UNTESTED | — |
| Consistency | UNTESTED | — |
| Accessibility | UNTESTED | — |
| Trust | 2 | Unpublished + unknown guest auth = activation/trust risk |
| Responsiveness | UNTESTED | — |
| Delight | UNTESTED | — |

### J4 Admin / trust
| Dimension | Score | Evidence |
|-----------|------:|----------|
| Discoverability | 2 | 44 roles / 764 permissions — recognition overload |
| Clarity | 2 | Build settings vs global `/settings/*` split unclear |
| Efficiency | 2 | Large surface for day-1 Owner |
| Consistency | 3 | Settings IA familiar SaaS |
| Accessibility | 2 | Heuristic risk |
| Trust | 3 | Billing trial visible; API tokens empty (good default) |
| Responsiveness | UNTESTED | — |
| Delight | 2 | No guided “secure your org” path observed |

---

## 3. Heuristic analysis (Nielsen + a11y) — top findings

| ID | Heuristic | Finding | Severity |
|----|-----------|---------|----------|
| H-01 | Visibility of status | Session can expire without durable recovery path into same deep link; OTP resets flow | High |
| H-02 | Match real world | Issues/Backlog/Cycles/Releases language is strong H-PM match | Strength — preserve |
| H-03 | User control | Danger Zone present in project settings — good; destructive confirm UNTESTED | Med |
| H-04 | Consistency | Home OS vs Build OS switcher is distinctive; dual settings trees (Build vs global) confuse | Med |
| H-05 | Error prevention | Import dry-run VERIFIED — strong pattern to extend | Strength |
| H-06 | Recognition | “… More tools” catalogs 20+ items — recognition fails; search/groups needed | High |
| H-07 | Flexibility | Board/List/Table/Calendar/Timeline/Workload = excellent efficiency for experts | Strength |
| H-08 | Minimalist design | Trial banner + floating ASK OS + utility rail + dense chrome = visual competition | Med |
| H-09 | Recover from errors | Session-expired message VERIFIED on sign-in; deep-link return UNTESTED | Med |
| H-10 | Help | ASK OS present; contextual help in empty states OK | Low–Med |
| H-11 | Accessibility | Keyboard ⌘K advertised; focus/ARIA/contrast **heuristic risk** (not measured) | High (risk) |

---

## 4. Design-system gap inventory (observed)

| Area | Observed | Gap / consolidation |
|------|----------|---------------------|
| Color | Light gray/white, black primary, purple active rail, yellow trial | Need tokens for trial/warning vs error (red HR notice) |
| Typography | Clean SaaS; hierarchy OK on Projects empty | Document type scale; verify contrast |
| Spacing/density | High density in Build — good for PM ICP | Provide Comfortable/Compact density toggle |
| Buttons | Black primary (+ Create, New Project) consistent | Secondary/ghost variants inventory incomplete |
| Empty states | Illustration + title + body + one CTA — **strong pattern** | Make contract: all Build empties must match |
| Nav | Sidebar sections MY WORK / BUILD | Cap visible tools; rest behind progressive disclosure |
| Tables/filters | Search + Filters + Display on Projects | Standardize Filter chip pattern across Products/Portfolios |
| Modals/wizards | Project create multi-step | Document step indicator + skip patterns |
| Notifications | Bell badge “1”; trial banner | Unify system notification vs marketing trial |
| Charts | Overview command-center cards | Loading/skeleton UNTESTED |
| Responsive | Desktop only VERIFIED | Define breakpoints; mobile **out** until tested |

**Component contract proposals:**
1. `EmptyState` — illustration?, title, description, primaryAction, secondaryAction?
2. `TrialBanner` — daysRemaining, cta, dismissible?
3. `ModuleSwitcher` — current OS, org chip
4. `ViewSwitcher` — Board/List/Table/Calendar/Timeline/Workload
5. `MoreToolsDrawer` — grouped, searchable (replace flat … More)

---

## 5. Page-by-page improvement matrix (`UX-###`)

| ID | Screen | Friction | Sev | Evidence | Recommended change | System impact | A11y | Mobile | Success metric |
|----|--------|----------|-----|----------|-------------------|---------------|------|--------|----------------|
| UX-001 | OTP Sign-in | No password/SSO; session drops mid-task | High | Expiry mid-Portfolios; OTP-only | Add “Stay signed in” + SSO; restore `callbackUrl` after OTP | Auth | Focus order on OTP | Full-page mobile OTP | % sessions surviving 30m; time-to-reentry |
| UX-002 | Org setup | Long path before Build value | Med | Welcome→Basics→Launch | Default goal=Build; skippable Launch; deep-link to `/build` after create | Onboarding | Labels on * fields | Stack fields | Time to first project |
| UX-003 | Dashboard | Setup checklist 0%; HR error noise | Med | HR not enabled red notice | Prioritize “Set up Build” card; soft-hide unenabled modules | Home OS | Live region for errors | Collapse cards | Click-through to Build |
| UX-004 | All Projects empty | Strong empty state — **preserve** | — | VERIFIED | Keep; reuse as template | EmptyState | — | — | First project create rate |
| UX-005 | Project create wizard | Optional steps add friction | Med | Type skipped; many feature toggles | Smart defaults: Blank + Simple; progressive feature enable | Wizard | Step announcements | Stepper vertical | Wizard completion time |
| UX-006 | Project landing | Status cards good; next action weak when 0 issues | Med | Open issues 0 | Primary “Create issue” above fold when 0 | Project home | — | Stack cards | Time to first issue |
| UX-007 | Issues Board | Strength — multi-view | — | Board columns VERIFIED | Preserve; ensure keyboard DnD a11y | ViewSwitcher | Keyboard board | Horizontal scroll policy | Issues created/week |
| UX-008 | Cycles / Epics empty | OK empty; weak education | Low | “No cycles yet” | One-line “Cycles = timeboxes for planning” | EmptyState copy | — | — | Cycle create rate |
| UX-009 | Client portal | Unpublished; wedge unrealized | High | Unpublished, no grants | Guided publish checklist + magic-link guest preview | Portal | Guest a11y | Guest mobile | Portal publishes / week |
| UX-010 | More tools | 20+ flat items | High | Inventory VERIFIED | Group: Plan / Build / Quality / Connect; search | MoreToolsDrawer | Combobox | Bottom sheet | Tool find time |
| UX-011 | Roles settings | 44 roles / 764 perms day-1 | High | `/settings/roles` | Role presets for Build (Owner/Admin/Member/Client) + progressive advanced | Roles | Table a11y | — | Time to invite Member |
| UX-012 | Dual settings trees | Build settings vs `/settings/*` | Med | Both used for invite/API | IA: “Org settings” vs “Build settings” labels + cross-links | Nav IA | — | — | Settings task success |
| UX-013 | Trial / billing | Banner + 401/402 console noise | Med | Banner VERIFIED; console errors | Human-readable entitlement states; no silent 402 on dashboard widgets | Billing/entitlements | — | — | Support tickets on billing |
| UX-014 | Import/Export | Dry-run strength | — | CSV/JSON dry-run | Preserve; surface from empty Issues too | Import | — | — | Successful imports |
| UX-015 | ASK OS / utility rail | Competes with primary task | Low | Floating controls | Defer to corner; don’t obscure CTA | Chrome | Focus trap | Hide on mobile | Task completion w/o occlusion |

---

## 6. Competitor UX patterns (ADOPT / ADAPT / AVOID)
*Using CI dual-frame: Direct-for-job Linear/Jira/ClickUp; suite peers Zoho/Odoo. Visual identity never cloned.*

| Pattern | Solves | Trade-off | Rec |
|---------|--------|-----------|-----|
| Linear: minimal chrome, keyboard-first, tiny create | Activation speed + delight | Less suite density | **ADAPT** — keyboard create + quieter chrome; keep suite switcher |
| Linear customer asks / portal | Stakeholder share without full seats | Scope creep into support desk | **ADAPT** — Client portal guided publish; keep separate from JSM-like ITSM |
| Jira: schemes/workflows complexity | Power customization | Day-1 overwhelm (we already have 44 roles) | **AVOID** exposing full 764 perms day-1 |
| ClickUp: everything-on hierarchy | Feature breadth | Cognitive overload (mirrors our More tools) | **AVOID** flat mega-menus; **ADAPT** hierarchy with progressive disclosure |
| monday guest views | Lightweight external share | Can feel “toy” for eng teams | **ADAPT** guest view clarity + permission summary |
| Password/SSO persistent session | Trust / session reliability | OTP simplicity for consumer | **ADOPT** SSO + refresh tokens as table stakes |
| Import dry-run (ours) | Error prevention | Extra step | **PRESERVE** — ahead of many peers |

---

## 7. Three design levels (priority problems)

### A. Session + auth trust (UX-001)
1. **Minimum repair:** Persist `callbackUrl` through OTP; longer session; “session expiring” toast
2. **Coherent improvement:** Magic-link + optional password; device trust checkbox
3. **Differentiating bet:** Passkey/SSO + “resume exact board cell” deep links
Effort: M / L / XL · Trade-off: security vs friction

### B. Activation to first issue (UX-002,005,006)
1. **Minimum:** Post-org-setup deep-link `/build` + emphasize Create issue on empty project
2. **Coherent:** Opinionated “Quick project” (one screen) vs Advanced wizard
3. **Differentiating:** Template that seeds 1 cycle + 3 sample issues + portal draft
Effort: S / M / L

### C. More tools / roles overwhelm (UX-010,011)
1. **Minimum:** Group + pin favorites
2. **Coherent:** Searchable MoreToolsDrawer + Build role presets
3. **Differentiating:** “Role modes” (Delivery / Client / Admin) that hide irrelevant chrome
Effort: M / L / XL

### D. Client portal wedge (UX-009)
1. **Minimum:** Empty-state checklist to publish
2. **Coherent:** Guest preview + permission summary before invite
3. **Differentiating:** Portal tied to Releases (“share this release”) — unique vs pure PM
Effort: S / M / L

---

## 8. Interaction state matrix (contract)

For primary components (`Button`, `TextField`, `IssueCard`, `BoardColumn`, `EmptyState`, `InviteModal`):

| State | Behavior |
|-------|----------|
| Default | Clear label; contrast ≥ WCAG AA target |
| Hover | Subtle elevation/bg; cursor pointer |
| Focus | Visible 2px ring; never remove outline |
| Active | Pressed affordance |
| Disabled | Explain why via tooltip/`aria-describedby` |
| Loading | Replace label with spinner; keep width; `aria-busy` |
| Empty | EmptyState contract |
| Validation error | Inline under field; `aria-invalid`; focus first error |
| System error | Toast + recoverable CTA; log id optional |
| Success | Brief toast; don’t block |
| Partial success | List what worked / failed (import dry-run model) |
| Offline | Banner; queue or disable mutations |
| Permission denied | Plain language + request-access CTA |
| Destructive confirm | Modal: name object, irreversible consequence, type-to-confirm if high risk |

Viewport: Desktop primary; Tablet collapse sidebar; Mobile UNTESTED — recommend bottom nav for MY WORK only if pursued.

---

## 9. Content / copy recommendations

| Context | Current / gap | Proposed |
|---------|---------------|----------|
| Session expired | “Sign in again to continue.” | “Your session ended. Sign in to return to [Project name].” |
| Cycles empty | “No cycles yet” | “No cycles yet — cycles are timeboxes (like sprints) for planning work.” |
| Client portal unpublished | sparse | “Clients can’t see this project until you publish a portal.” + Publish |
| Roles | 44 roles dump | “Start with Member. Advanced roles are optional.” |
| Trial | “upgrade to keep full access” | Keep urgency; add what breaks on day 15 |
| Import | dry-run exists | “Test import (dry run)” as primary; “Import for real” secondary |

---

## 10. Accessibility findings

| Finding | WCAG map | Confidence |
|---------|----------|------------|
| Focus visibility / keyboard board DnD unknown | 2.1.1 Keyboard, 2.4.7 Focus Visible | heuristic risk |
| Icon-only controls in utility rail | 1.1.1 / 4.1.2 Name Role Value | heuristic risk |
| Trial banner + status colors | 1.4.1 Use of Color; 1.4.3 Contrast | heuristic risk |
| OTP input labeling | 1.3.1 / 3.3.2 Labels | UNTESTED |
| Live regions for toasts/errors | 4.1.3 Status Messages | heuristic risk |

---

## 11. Prioritized design backlog

**Quick wins:** UX-006 first-issue CTA; UX-008 cycles copy; UX-009 portal checklist; UX-014 surface import on empty Issues; UX-015 de-clutter rail
**Foundational system:** EmptyState/ViewSwitcher/MoreToolsDrawer contracts; dual-settings IA (UX-012); density tokens
**Journey redesigns:** UX-001 auth/session; UX-002/005 activation wizard; UX-010/011 roles+tools progressive disclosure
**Differentiating experiments:** Release-linked Client portal; Role modes; Quick project template with sample cycle

---

## 12. Experiment brief (uncertain bet)

**Hypothesis:** An opinionated “Quick project” (1 screen, seeds 3 issues + 1 cycle draft) increases day-1 activation (first issue <10 min) vs full wizard without hurting 7-day retention.
**Cohort:** New orgs, Build goal selected, week 1 trial
**Variants:** A = current wizard; B = Quick project default + “Advanced” link
**Primary metric:** Time-to-first-issue; secondary: project-created rate
**Guardrails:** 7-day return rate; support tickets; feature-discovery of Cycles (not collapse)
**Duration/sample:** caveat — need PM instrumentation; suggest ≥2 weeks or 200 orgs
**Decision rule:** Ship B if time-to-first-issue ↓ ≥30% and 7-day return not ↓ >5%

---

## 13. Handoff specs (implementation-ready sketches)

### UX-006 — Project home zero-issues
- **Desktop:** Below status cards, full-width primary `Create issue`; secondary `Import issues`
- **States:** Default; loading create; permission-denied (Member without create)
- **AC:** Given 0 issues, CTA visible without scroll at 1280×800; Given ≥1 issue, CTA moves to header `+` only

### UX-009 — Client portal unpublished
- Checklist: (1) Publish portal (2) Choose visible views (3) Invite guest
- **AC:** Unpublished state never looks like “broken empty”; Publish is single primary

### UX-010 — MoreToolsDrawer
- Groups: Plan | Execute | Quality | Collaborate | Automate
- Search filters by name
- **AC:** All current tools reachable; default shows ≤8 pinned

### UX-001 — OTP callback restore
- **AC:** Given `callbackUrl=/build/47/issues`, after OTP user lands on Board not Dashboard

---

## 14. Cross-role review requests

| # | Decision | Needs |
|---|----------|-------|
| CR-1 | Adopt SSO/password vs OTP-only day-1? | PM + owner security posture |
| CR-2 | Is Client portal the cycle wedge vs deeper eng (Git integrations)? | PM + CI |
| CR-3 | Hide suite modules (HR) until enabled? | PM |
| CR-4 | Role presets vs full 44-role catalog day-1? | PM + Tester (authz) |
| CR-5 | Mobile Build in scope this cycle? | Owner — currently ASSUMED out |

---

## 15. Preserve (do not “fix”)
- Empty-state pattern with single primary CTA
- Multi-view Issues (Board→Workload)
- Import dry-run
- Build OS ↔ Home OS module switcher (distinctive suite expression)
- H-PM information architecture (Projects → Issues/Backlog/Cycles/Releases)

---

*Independent pass complete. Awaiting Tester Member/guest evidence and CI matrix for Phase 4 cross-role review.*

## Patch — BUG-001 / PM-011 (2026-09-30)

| ID | Screen | Friction | Sev | Evidence | Recommended change |
|----|--------|----------|-----|----------|-------------------|
| UX-016 | `/invitation/[token]` accept | Left accept form blank white; marketing pane only; blocks Member activation | **S1/High** | Tester BUG-001 VERIFIED on isolated profile (www+apex) | Minimum: render accept form + email/OTP or Google; show error if token invalid/expired. Coherent: accept → role confirm → land in Build. Differentiating: invite preview of org/project names + deep-link to `/build/47` |

Maps to J1 Activation trust; raises UX-001 sibling. ADOPT multi-method auth still stands; invite accept is table-stakes before SSO work.

## Patch — BUG-002 / PM-002 (2026-09-30)

| ID | Screen | Friction | Sev | Evidence | Recommended change |
|----|--------|----------|-----|----------|-------------------|
| UX-017 | Invite → first Build visit | Org Member active but `/build` denies `build:view` | **S1/High** | Tester provisioned-Member R1 VERIFIED | Default invite role for Build-goal orgs must include Build module access; accept success lands in `/build` with capability, not a permission dead-end. Minimum: Owner invite picker “Build access” checkbox default ON. |

Coupled with UX-016 DoD: cold invite→**Build** not merely org shell.

## Patch — PM-001 Owner CTA verify (2026-09-30)

| ID | Finding | Sev | Rec |
|----|---------|-----|-----|
| UX-018 | Owner has Invite Client / Grant Access CTAs; Member sees none | Med | Role-aware empty states: Member gets Request access / Contact admin, not CTA-less dead-end (BUG-004) |
| UX-019 | Invite Client closes with no toast / no grant row / no magic link | S1 | Success feedback + persist grant + copy link/email; never silent close |
| UX-020 | Grant Access: “Projects Error — Failed to load projects” | S1 | Error recovery + retry; block submit until projects load |
| UX-021 | Project portal unpublished; Manage grants only | Med | Publish checklist (UX-009) + Invite from Grants tab when published |

Guest path BLOCKED until UX-019/020 fixed.

## Patch — Completeness Member differential
- UX-022 (CW-001): membership-scoped Projects/CC counts
- UX-023 (CW-002): Member create-issue / honest Viewer labeling
