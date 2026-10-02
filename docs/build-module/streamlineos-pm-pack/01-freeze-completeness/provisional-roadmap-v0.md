# StreamlineOS Build — Provisional PM Packet v0
**Date:** 2026-09-30 · **Scope Contract:** v1.2 · **Status:** PROVISIONAL (pre Phase 4 cross-review)

## Product frame

| Field | Call | Label |
| --- | --- | --- |
| Product | StreamlineOS **Build OS** — delivery / project management module inside multi-app business OS | VERIFIED |
| Category | **H-PM locked** (Issues/Backlog/Cycles/Epics/Releases/Portfolios/Programs + automation). Not Retool-style H-Builder | VERIFIED (Designer ledger) |
| ICP (working) | India/APAC SMB–midmarket teams (≈5–500) wanting suite + delivery in one OS | INFERRED (CI) |
| Jobs | Plan & track delivery; expose progress to clients; configure access; automate handoffs | VERIFIED/INFERRED |
| Problem | Activate into first useful project + trusted client share without suite-auth friction; parity with Linear/Jira/ClickUp on core PM while suite is the wedge | INFERRED |
| Business model | Org-priced Free/Starter/Pro/Enterprise; 14-day trial | VERIFIED (public + billing UI) |
| Lifecycle | Early growth / suite expansion — Build must activate or suite promise fails | INFERRED |
| Strategic goal (cycle) | **Trust + activation of Build** | ASSUMED (Scope) / reinforced by evidence |
| Constraints | Production URL; synthetic `PXC-` data; sandbox pay only; shared-box session discipline | REPORTED |
| Success measures (proposed) | TTF first project; TTF first issue; % trials that publish Client portal; invite→Build access success; session-expiry abandon rate; P0 reopen rate | PROPOSED — UNTESTED baselines |

## Product diagnosis

**Strengths:** Clear empty states + create-project wizard; rich PM IA (kanban + cycles/epics/releases); Client portal named (suite wedge); import dry-run; deep roles/API/webhook surfaces; suite Home↔Build switcher.
**Weaknesses:** OTP-only + easy session expiry; dense More-tools catalog; Client portal unpublished / guest path unproven this run; historical P0s on client grant + invite Build role + Member HR onboarding gate (need re-verify).
**Evidence gaps:** Member role + guest portal (Tester in flight); mobile; SSO/password; paid conversion; baseline analytics.
**Strategic risks:** Feature breadth without activation; Client portal dead-end kills differentiation; suite onboarding blocks Build Members; OTP trust gap vs Direct peers.
**Positioning:** Suite-native delivery OS — compete on **client-ready projects inside one OS**, not feature count vs Linear.

## Journey → funnel (proposed metrics)

| Journey | Act | Ret | Rev | Trust | Support |
| --- | --- | --- | --- | --- | --- |
| Signup OTP → org → Build | ★★★ | ★ | ★ | ★★★ | ★★ |
| Create project → first issue | ★★★ | ★★ | ★ | ★★ | ★ |
| Invite Member → Build access | ★★★ | ★★★ | ★ | ★★★ | ★★★ |
| Publish Client portal → guest view | ★★ | ★★★ | ★★★ | ★★★ | ★★ |
| Import CSV/JSON | ★★ | ★★ | ★ | ★★ | ★ |
| Upgrade trial | ★ | ★ | ★★★ | ★★ | ★ |

## Opportunity-solution tree (condensed)

**Outcome A — Activate Build within trial**
- Opp: Friction from empty org → first issue · Solutions: guided first-project checklist; template packs · Assume: templates lift TTF · Test: A/B template vs blank
- Opp: Session/OTP drop-off · Solutions: persistent session + optional password/SSO; clearer expiry return URL · Assume: peers win on stickiness · Test: expiry abandon analytics

**Outcome B — Trusted client collaboration (wedge)**
- Opp: Client portal unpublished / grant path broken (HISTORICAL P0) · Solutions: invite CTA on membership; magic-link guest; publish checklist · Assume: portal is differentiation vs pure PM · Test: guest happy + negative isolation

**Outcome C — Team access without suite traps**
- Opp: Invite lacks Build role; Member HR onboarding gate (HISTORICAL P0) · Solutions: Build Module Member at invite; Build-only onboarding skip · Assume: Members bounce · Test: Member accept → `/build` without HR

**Outcome D — Parity depth (Next, not Now drown)**
- Cycles/epics usage, automations, API tokens — table stakes after A–C green

## Competitor posture (from CI; pending CI v2)

| Class | Stance |
| --- | --- |
| Table stakes | Create project→issue; boards; invite; persistent auth; import |
| Direct-for-job | Linear, Jira, ClickUp (+ monday) |
| Direct-for-suite | Zoho One/Projects, Odoo |
| Differentiation | Client portal inside suite OS; Home↔Build; org pricing |
| Avoid | Retool/Appsmith breadth; copying Linear visual ID; unbounded More-tools sprawl |

## Prioritization `PM-###`

| ID | Item | Type | Impact | Reach | Conf | Effort | Why now | Deps | Not Now? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PM-001 | Fix Client portal grant/invite CTA | Defect | H | H | Med* | M | Wedge + HISTORICAL P0 | Tester guest re-verify | — |
| PM-002 | Invite offers Build Module Member | Defect | H | H | Med* | S | Activation of teammates | Roles matrix | — |
| PM-003 | Member accept → Build without forced HR onboarding | Defect | H | H | Med* | M | Trust + activation | Suite onboarding policy | — |
| PM-004 | Session persistence + expiry return UX | Trust | H | H | High | M | VERIFIED OTP/expiry pain | Auth | — |
| PM-005 | Activation path: blank → template → first issue checklist | Growth | H | H | Med | M | TTF activation | Templates inventory | — |
| PM-006 | Client portal publish + guest magic-link trust | Diff | H | M | Low | L | Wedge vs Linear asks / Jira portals | PM-001 | — |
| PM-007 | Instrumentation for journeys above | Discovery | H | H | High | S | No baselines | Analytics owner | — |
| PM-008 | Cycles/Epics empty-state → first cycle guide | Parity | M | M | Med | S | Feature exists unused | — | After PM-005 |
| PM-009 | API tokens / webhooks docs + first-token | Parity | M | L | Med | M | Surfaces empty | — | Later |
| PM-010 | Expand More-tools surface area | Distraction | L | — | — | — | Cognitive load | — | **Not Now** |

\*Confidence Med until Tester re-verifies historical P0s on `PXC-Design-A-20260930`.

## Now / Next / Later / Not Now

**Now (quality + wedge unlock)**  
PM-001, PM-002, PM-003, PM-004, PM-007 · Capacity reserved for defect re-verify + instrumentation.

**Next**  
PM-005, PM-006, PM-008 · Coherent Client portal + activation polish.

**Later**  
PM-009 · Advanced automation/API packaging; portfolio/program depth.

**Not Now**  
PM-010 feature sprawl; H-Builder/custom app studio; native mobile; copying competitor breadth; paid upsell experiments before activation trusts.

## PRDs (outline only — full PRD after Phase 4 + Tester)

Ship full PRDs for **PM-001, PM-002, PM-003, PM-004** first. Each must include: problem, JTBD, evidence, goals/non-goals, stories, states, permissions, analytics, a11y, security/privacy, rollout, risks, AC, DoD. Implementation slices small enough for independent Claude/eng verify.

## Release gates (apply per Now item)
1. **Code complete** — flagged  
2. **Test complete** — original + adjacent negatives + happy path (Tester)  
3. **Operationally ready** — docs/support, observability, rollback  
4. **Outcome validated** — metric moved vs baseline (PM-007)

## Cross-role review requests

| # | Ask | Owner | Blocking? |
| --- | --- | --- | --- |
| R1 | Re-verify HISTORICAL P0s PM-001/002/003 on current org | Tester | Yes for PRD finalize |
| R2 | Client portal guest UX ADOPT/ADAPT/AVOID vs Linear/Jira | Designer + CI | Yes for PM-006 |
| R3 | Confirm ICP + cycle outcome (activation vs monetisation) | Aditya | Soft — assumed activation/trust |
| R4 | CI v2 Direct weights post item 3 | Competitor Analyst | In flight |

## Explicit non-claims
No consensus until R1–R4 responses. Historical bugs ≠ current VERIFIED. Competitor breadth ≠ roadmap.


## Patch 2026-09-30 · CI v2 + BUG-001

**CI Cut v2 absorbed:** `/workspace/streamlineos-build-ci-cut-v2.md`
- Direct-for-job: Linear / Jira / ClickUp (High) · Direct-for-suite: Zoho/Odoo · H-Builder closed
- Auth/session **BEHIND** → strengthens PM-004
- Client portal guest UNKNOWN → PM-001/006 gated on Tester

| ID | Update | Label |
| --- | --- | --- |
| **PM-011** | **BUG-001** Invite accept blank (marketing only) — S1 activation/trust · blocks Member R1 | VERIFIED (Tester) |
| PM-002 | Blocked until PM-011 | BLOCKED |
| PM-001/003 | Blocked until Member session | BLOCKED by PM-011 |

**Revised Now order:** PM-011 → PM-004 → PM-002 → PM-003 → PM-001 → PM-007


## Patch · BUG-002
**BUG-002 VERIFIED:** Org Member active but `/build` denies `build:view`. Elevates **PM-002** to Now #2; couples with PM-011 DoD (accept→Build). Workaround: Owner grants Build Module Member via `/settings/roles`.
**Now order:** PM-011 → PM-002 → PM-004 → PM-003 → PM-001 → PM-007


## Patch · R1 COMPLETE (provisioned-Member)
| ID | Status | Note |
| --- | --- | --- |
| PM-001 | **FAILED / P0** | No Grant/Invite CTA on client-access — wedge dead |
| PM-002 | VERIFIED post-workaround; cold OPEN | BUG-002; AC = org shell not all projects |
| PM-003 | **VERIFIED** | No forced HR onboarding |
| PM-004 | **VERIFIED** | Session survived hard refresh |
| BUG-003 | Project 47 private | Intentional ≠ all projects; Owner must add Member; deny UX still raw codes → UX-017b |

**Now order:** PM-011 → PM-002 → **PM-001** → PM-004 polish → PM-007 · PM-003 can move to Done/monitor


## FREEZE v1
Now set frozen: PM-011 → PM-002 → PM-001. See `NOW-FREEZE-v1.md` + `CLAUDE-IMPLEMENT-NOW.md`.
