# UX patterns — ADOPT / ADAPT / AVOID

**Status:** SEED + **Linear deep UI-VERIFIED** (15) + **Jira deep UI-VERIFIED** (non-filter) + ClickUp deep + Filters walks  
**Sources:** CI `100-REASONS.md`, Linear/ClickUp/Jira FEATURES+BUILD-GAPS, Owner craft (UX-016…032), `COMPLETENESS-UX-THEMES.md`  
**Updated:** 2026-10-01

Legend: **Hypothesis** = not yet confirmed on a signed-in Direct page · **Build-proven** = observed on StreamlineOS Build · **Walk-confirmed** = CI page dump cited

---

## 1. Activation & invite

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Invite accept → workspace home with role-aware chrome | **ADOPT** | Linear/ClickUp-class: no blank/OTP roulette | Build BUG-001 BEHIND · Hypothesis on Directs |
| Invite grants product module access automatically | **ADOPT** | Avoid “invited but can’t open Build” | PM-002 · Hypothesis |
| OTP-only auth as sole path | **AVOID** as sole option | Fragile for cold invite; Directs offer password/SSO | CI-060 · Build-proven pain |
| Dual apex + www invite hosts | **AVOID** inconsistency | Cold-invite dual host ×2 still open on Tester | Tester open · Build-proven |

## 2. Role honesty

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Role label matches power (Viewer ≠ Member) | **ADOPT** | Linear Guest/Member clarity | CW-001/002 UX-022/023 · Build-proven |
| Projects list scoped to memberships | **ADOPT** | Empty-all while on a project = trust S1 | UX-022 · Build-proven |
| Permission-aware Create menu | **ADOPT** | Hide or disable with tooltip, don’t omit silently | UX-023 · Hypothesis |
| Empty state copy when truly zero memberships | **ADAPT** | Keep empty contract; never fake data | Themes #1 · Build-proven |

## 3. Empty / loading / deny

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Skeleton → empty ≤1s (not spinner forever) | **ADOPT** | Reports/approvals felt broken under slow load | Themes #5 · Build-proven |
| Distinct deny chrome (not empty illustration) | **ADOPT** | Account B isolation will validate | Completeness Next · Pending OTP |
| One primary CTA on empty | **ADOPT** | New-* + clear copy across More-tools | Themes #1 · Build-proven PARITY-seeking |
| Publish without confirm | **AVOID** | Client portal asymmetry | UX-031 · Build-proven |

## 4. Density & More-tools IA

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Progressive disclosure / tool search | **ADOPT** | 20+ tools drown freelancers & PMs | UX-010 · Build-proven risk |
| ViewSwitcher Board/List/Table/Timeline | **ADAPT** (keep strength) | Issues multi-view is a Build LEAD candidate | Themes #3 · Build-proven |
| Calendar exiting to suite `/calendar` | **ADAPT** | Document seam; don’t surprise | Themes #3 · Build-proven |
| Collab sprawl (Meetings/Chat/Wiki/Whiteboard) in Build Now | **AVOID** for Freeze | Category mismatch / Not Now | Council lock · Build-proven scope |

## 5. Delivery objects (cycle / epic / release / program)

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Active-cycle chrome (scope, progress, focus) | **ADOPT** from Linear | Issue↔cycle link exists; chrome shallow; Cycles route + no-cycles empty **Walk-confirmed** free | UX-024 · `linear/evidence/cycles.png` |
| Epic as first-class filter + panel | **ADOPT** | Issue↔epic VERIFIED; Epic-relation filter missing | UX-027 · Build + Hypothesis |
| Release membership on issues | **ADOPT** filter/membership honesty | Jira free team-managed: Affects versions in Filters More **yes**; Releases/Versions/Components surface **no** (routes→Details). UX-025 ≠ “match Releases module” | UX-025 · `jira/UX-NOTES.md` · filters-basic-more-options.png |
| Program↔project membership | **ADOPT** | Jira Plans directory **empty** (“No plans yet”) — shell only, not filled Plans; Build UX-028 = real membership | UX-028 · `jira/evidence/plans.png` |
| Milestone↔issue linking | **ADOPT** | Census BEHIND | Milestones · Build-proven |

## 6. Filters & views

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Shared FilterBar tokens (Status/Owner/Health) | **ADAPT** | Consolidate; keep chip UX | Themes #2 · Build-proven |
| Labels filter on issues | **ADOPT** | Missing vs Jira/ClickUp | UX-026 · Build-proven |
| Saved views / named filters | **ADOPT** | Linear Custom Views builder + ClickUp Save **Walk-confirmed** | FILTERS · `linear/evidence/custom-view-builder.png` |
| Display density controls | **ADAPT** | Keep; align with Directs | Themes #2 |

## 7. Templates & activation packs

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Template gallery / ICP Quick Starts | **ADOPT** from ClickUp/Asana | One custom template ≠ gallery | Reason #13 · Hypothesis |
| Apply template → seeded project | **ADAPT** | `PXC-From-Template-1` works; expand packs | Template-apply · Build-proven |
| Auto-create untitled Form with no cancel | **AVOID** | UX-032 safety | Forms · Build-proven |

## 8. Insights & finance

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Named report Create/Run | **ADOPT** from Jira | Snapshot-only today | UX-030 · Build-proven |
| Org-level reports/dashboards | **ADOPT** | Project-only today | Reports craft · Build-proven |
| Org Budget route live | **ADOPT** | 404 today | Approvals-Budget · Build-proven |
| Approvals empty→usable | **ADAPT** | Census done; score vs Directs on walk | Pending CI |

## 9. Extensibility

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Automations that fire after create | **ADOPT** | Create verified; filled fire BEHIND | Automations · Build-proven |
| Webhooks that deliver | **ADOPT** | Shell vs live | Webhooks · Build-proven |
| Forms with cancel/draft control | **ADOPT** | Fix UX-032 | Forms · Build-proven |

## 10. Client / guest wedge

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Atomic grant → magic-link guest | **ADOPT** | False-success toast kills trust | PM-001 BUG-005/006 |
| Publish confirm (type or modal) | **ADOPT** | Match Unpublish weight | UX-031 |
| Request Client Access CTA for Member | **ADOPT** | BUG-004 | Freeze |
| Grant Access projects loader | **ADOPT** | BUG-006 | Freeze |

## 11. Free-tier packaging (Linear deep 2026-10-01)

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Business+ SLA / Asks as day-1 table-stakes | **AVOID** | Free walk: SLA Add rule disabled; Asks trial-only — not freelancer desperation | `linear/evidence/slas.png`, `asks.png` |
| Code Intelligence as day-1 AI | **AVOID** | Explicitly Business; Agent Enabled + Coding sessions Basic ≠ Code Intelligence | `linear/evidence/ai-agents.png` |
| Free structured intake / public Form | **ADOPT** (SHIP) | Asks Business+ → Build free Form Completeness Next | BG-19 · Top15 #46 |
| Free deadline/risk honesty (not full SLA suite) | **ADAPT** | Transparent limits; don’t clone Linear Business SLA | BG-20 · SHIP #99/#107 |
| Notification Inbox unread + list/detail | **ADOPT** | Linear Inbox free | `linear/evidence/inbox.png` |
| My-work tabs (Assigned/Created/Subscribed) | **ADOPT** | Beyond single assignee filter | `linear/evidence/my-issues.png` |
| Team Documents / Docs hub in Freeze | **AVOID** sprawl | Free Docs exist; SHIP linked project brief instead | `linear/evidence/team-documents.png` |
| Initiatives / Roadmap as day-1 strategy | **AVOID** / defer | Initiatives off; Roadmap/Insights Not found on free WS | `initiatives.png`, `not-found-insights-roadmap.png` |
| Triage ritual (Accept/Decline/Snooze) | **ADOPT** Completeness Next | Free WS Triage **redirected** to All issues — ritual still SHIP; surface not UI-verified here | `triage-redirect-all-issues.png` · UX-029 |

## 12. Free-tier packaging (Jira deep 2026-10-01)

| Pattern | Verdict | Notes | Evidence |
|---------|---------|-------|----------|
| Company-managed Releases/Components as free day-1 | **AVOID** | This walk: versions/components routes → Details; no Releases nav | `jira/` PAGE-INVENTORY |
| UX-025 = “match Jira Releases module” | **AVOID** claim | Completeness Next = release **membership + filter honesty**; Affects versions in More picker only | filters-basic-more-options.png · UX-025 |
| Filled Plans / capacity as VERIFIED | **AVOID** | Plans = “No plans yet” + Create — empty shell | `jira/evidence/plans.png` |
| Promote Reports that 404 | **AVOID** | Summary Reports CTA → 404 here | `jira/evidence/summary.png` |
| Backlog/Sprints dead-end nav | **AVOID** | Backlog 404; Sprints “Requires a backlog” | `features-settings.png` |
| Confluence Docs hub in Freeze | **AVOID** sprawl | Upsell empty; no payment opened — SHIP linked brief | `jira/evidence/docs.png` |
| Opinionated board + list + summary KPIs | **ADOPT** | Free Kanban + List + Summary UI-VERIFIED | board-kanban / list / summary.png |
| Automation recipes + audit + usage | **ADOPT** | Flows/Templates/Usage free | `jira/evidence/automation.png` |
| Dashboards Create + share metadata | **ADOPT** | Free dashboards directory | `jira/evidence/dashboards.png` |
| Marketplace 1000-app clone | **ADAPT** curated | Small catalog + free/paid labels | `jira/evidence/marketplace.png` |
| Forms as Jira free table-stakes | **AVOID** invent | Forms **not** in settings nav this walk; SHIP free public Form Completeness Next | FEATURES Forms § |

## Fold cadence

When CI drops a walk folder, add a short note under `competitor-deep/<product>/UX-NOTES.md` and flip matching rows Hypothesis → Walk-confirmed with dump path.
