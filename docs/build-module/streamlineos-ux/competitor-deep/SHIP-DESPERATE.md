# Design SHIP — desperate customer needs (become WOW once built)

**Bar:** Feature customers desperately need (F / PM / PjM). After ship → sellable reason. No fluff.  
**Sources:** Freeze/Completeness · FILTERS UI-VERIFIED · ClickUp deep · **Linear deep** · **Jira deep UI-VERIFIED** · Owner craft  
**Updated:** 2026-10-01  
**Target:** ≥100 SHIP rows (this file). HAVE stays in `WOW-HAVE.md`.

| # | SHIP (implement → sell) | ICP | Why desperate | Proof Directs already have / pain | Build ID |
|---|-------------------------|-----|---------------|-----------------------------------|----------|
| 1 | Labels/Tags on issues + FilterBar | All | Can’t slice work without tags | ClickUp Tags · Linear Labels UI-VERIFIED | UX-026 |
| 2 | Epic/parent relation filter (“in epic X”) | PM, PjM | Feature slice invisible | Linear Relations UI-VERIFIED | UX-027 |
| 3 | Is / Is not / Is set / Is not set operators | All | Can’t find unset fields | ClickUp operators UI-VERIFIED | FILTERS |
| 4 | AND/OR between filters | PM, PjM | Can’t express real queries | ClickUp/Linear/Jira UI-VERIFIED | FILTERS |
| 5 | Nested filter groups | PM, PjM | Power planning lenses | ClickUp nested · Linear Advanced | FILTERS |
| 6 | Named saved filters / Custom views | All | Reopen same lens daily | All three Directs UI-VERIFIED | FILTERS |
| 7 | Me / Me Mode / currentUser defaults | All | “My work” ritual | ClickUp Me Mode · Jira My open | FILTERS |
| 8 | Due presets (Overdue, this week…) | F, PM | Week planning without calendars | Linear Due presets | FILTERS |
| 9 | Dependency / blocked filter + link | PM, PjM | Blockers kill delivery | ClickUp Dependency · Linear Relations | FILTERS |
| 10 | Release membership + filter | PM, PjM | “What’s in the ship?” | Jira Affects versions in Filters More **UI-VERIFIED**; Releases/Versions **surface absent** on free team-managed — UX-025 = membership+filter honesty, **not** module parity | UX-025 |
| 11 | Cold invite accept never blank | All | Teammate never joins | BUG-001 Linear/ClickUp invite norms | PM-011 |
| 12 | Invite grants Build access automatically | All | Invited but locked out | BUG-002 / PM-002 | PM-002 |
| 13 | Client grant → guest magic-link that works | F, PjM | **THE wedge** — client trust | BUG-005/006 · Zoho/ClickUp guests | PM-001 |
| 14 | Publish portal confirm | F, PjM | Accidental client expose | UX-031 | UX-031 |
| 15 | Member Request Client Access CTA | PjM | Stuck without Owner | BUG-004 | CW-003 |
| 16 | Password + Google + SSO sign-in | All | OTP-only kills return | Linear/ClickUp/Jira auth chrome | CI-060 |
| 17 | Role label matches power (Viewer ≠ Member) | All | Trust / create confusion | CW-001/002 · Linear Guest/Member | UX-022/023 |
| 18 | Member Projects list shows memberships | All | Looks like data loss | UX-022 | UX-022 |
| 19 | Member can Create issue when labeled Member | PM, F | Can’t contribute | CW-002 · Direct members | UX-023 |
| 20 | Active-cycle chrome on Board/overview | PM | “This cycle” focus | Linear Cycles page + no-cycles empty **UI-VERIFIED** | UX-024 |
| 21 | Triage inbox Accept/Decline/Snooze | PM | Intake without drowning board | Linear Triage docs; free WS **redirect→All issues** (not UI-verified surface) | UX-029 |
| 22 | Triage rules auto-route | PM | Scale intake | Linear Triage rules | UX-029 |
| 23 | Milestone ↔ issue linking | PjM | Commitments float unbound | Milestones census BEHIND | MILESTONES |
| 24 | Program ↔ project membership | PjM | Hierarchy shell-only | Jira Plans directory **empty** (“No plans yet”) — don’t claim filled Plans; UX-028 = real membership | UX-028 |
| 25 | Portfolio depth beyond link | PjM | Multi-project rollup | Jira Plans shell / monday — filled Plans **not** UI-VERIFIED | Portfolio |
| 26 | Named report Create/Run | PM, PjM | Snapshot ≠ report; Jira Summary promotes Reports → **404** here | UX-030 · AVOID promote-then-404 | UX-030 |
| 27 | Org-level reports | PjM, PM | Leadership rollup | Reports craft | Reports |
| 28 | Org Budget that isn’t 404 | F, PjM | Cost visibility | Budget 404 | Budget |
| 29 | Template gallery / ICP Quick Starts | F, PjM | Day-1 bootstrap | ClickUp Template Center · Linear Issue Templates free **UI-VERIFIED** | Templates |
| 30 | Freelancer starter kits (onboarding, retainer, sprint…) | F | ClickUp gallery empty of WS templates in walk | ClickUp deep BUILD-GAPS #5 | Templates |
| 31 | Automations that actually fire | All | Shells don’t save time | ClickUp Automations UI-VERIFIED | Automations |
| 32 | One trigger→condition→action builder + run history | F, PM | ClickUp AI Fields split confuses | ClickUp deep #4 | Automations |
| 33 | Forms cancel / no untitled trap | All | Safety | UX-032 | UX-032 |
| 34 | Public intake form → project day one | F, PjM | Client requests nowhere | ClickUp Forms empty + BUILD-GAPS #7 | Forms |
| 35 | Webhooks that deliver | PM, PjM | Integrate toolchain | Webhooks census | Webhooks |
| 36 | More-tools search + Plan/Build/Quality groups | All | 20+ tools drown | UX-010 · ClickUp More sprawl | UX-010 |
| 37 | Opinionated default views (Today, Client pipeline, Board, Capacity) | F | ClickUp view chooser tax | ClickUp deep #12 | Views |
| 38 | Unified freelancer cockpit (client + next actions + time) | F | Hub-hopping across Inbox/Planner/Docs/Time | ClickUp deep #1 | Home |
| 39 | Task calendar without mandatory Google/Outlook OAuth | F, PM | Planner gated on calendar connect | ClickUp deep #2 | Calendar |
| 40 | Weekly capacity + billable vs non-billable | F, PjM | Profitability blindness | ClickUp Workload/Planner | Workload |
| 41 | Start/stop time on task → client weekly summary | F | Timesheet hub friction | ClickUp Timesheets UI-VERIFIED | Time |
| 42 | Free-plan core analytics (due, hours, margin) no Business gate | F | ClickUp dashboard templates Business-badged | ClickUp deep #8 | Reports |
| 43 | Goal ↔ milestone ↔ tasks progress from real work | PM, PjM | Goals empty island | ClickUp Goals UI-VERIFIED | Goals |
| 44 | Actionable client inbox (approvals, replies, overdue) | F, PjM | Inbox empty = invite spam | ClickUp Inbox · Linear Inbox unread/list-detail **UI-VERIFIED** | Inbox |
| 45 | Project brief linked to tasks/decisions (not separate Docs hub) | F, PM | Docs/Whiteboard sprawl | ClickUp Docs/WB · Linear Team Documents free **UI-VERIFIED** · AVOID Freeze hub | Brief |
| 46 | Issue relations blocked/blocking UI | PM | Dependency pain | Linear Relations | Relations |
| 47 | Cycle auto cadence + roll-forward | PM | Manual cycle busywork | Linear use-cycles | Cycles |
| 48 | Cycle progress/scope graph | PM | Are we on track? | Linear cycle-graph | Cycles |
| 49 | First-issue CTA above fold when 0 issues | F | Activation stall | UX-006 | Activation |
| 50 | Stay signed in / restore callback after OTP | All | Mid-task kickout | UX-001 | Auth |
| 51 | Grant Access projects loader never fails | F, PjM | Grant dead-end | BUG-006 | Client |
| 52 | Invite Client never silent-close | F | False success | UX-019 | Client |
| 53 | Dual invite host (apex+www) one behavior | All | Cold invite roulette | Tester open | Invite |
| 54 | Permission-aware Create menu | All | Hidden power | UX-023 Diff | Roles |
| 55 | Denied ≠ empty illustration | All | Trust S1 | Empty/Deny pattern | Trust |
| 56 | Skeleton→empty ≤1s | All | Feels broken | Themes #5 | Trust |
| 57 | Danger Zone type-to-confirm | All | Accidental destroy | Themes #7 | Trust |
| 58 | Build role presets (not 44 roles day-1) | PjM | Roles overwhelm | UX-011 | Roles |
| 59 | Org vs Build settings labeled | All | Dual tree confusion | UX-012 | IA |
| 60 | Entitlement states human (no silent 402) | All | Billing fear | UX-013 | Trust |
| 61 | Import from empty Issues | F | Migration | UX-014 | Activation |
| 62 | Utility rail never blocks CTA | All | Occlusion | UX-015 | Chrome |
| 63 | Already-active Member invite next step | All | Dead link | UX-016b | Invite |
| 64 | Workflow required fields / allowed roles | PjM, PM | Governance | Workflow census | Workflow |
| 65 | Approvals on milestone/release | PjM | Sign-off | Approvals | Approvals |
| 66 | Risks with owner + mitigation linked to issue | PjM | Risk theater | RISKS-DECISIONS | Risks |
| 67 | Decisions log with date/owner/link | PjM | “Who decided?” | RISKS-DECISIONS | Decisions |
| 68 | Workload unassigned gap visible | PjM | Capacity lies | Workload census | Workload |
| 69 | Sub-issues / parent breakdown | PM | Scope explode | Linear parent/sub | Hierarchy |
| 70 | Estimate points feed cycle scope | PM | Capacity guess | Linear Cycles | Cycles |
| 71 | Keyboard triage rituals (accept/decline) | PM | Speed | Linear Triage | Triage |
| 72 | Require priority before leaving Triage | PM | Quality gate | Linear Triage | Triage |
| 73 | Display: Set as default for workspace | PM, PjM | Team lens | Linear Display | Views |
| 74 | Board swimlanes / sub-grouping | PM, PjM | Dense planning | Linear Display | Board |
| 75 | Card property visibility toggles | All | Density control | Linear Display | Board |
| 76 | Labels filter + Labels create in one flow | All | Tag then find | Directs | Labels |
| 77 | Share saved view with role | PM, PjM | Team ritual | Jira share filter | Views |
| 78 | Default filter pack (My open, Reported by me…) | PM | Day start | Jira defaults UI-VERIFIED | Filters |
| 79 | JQL/Advanced behind Basic (PM power) | PM | Power without F day-1 | Jira Basic↔JQL | Filters |
| 80 | FixVersion / Affects version filter | PM, PjM | Ship set | Jira More filters | Release |
| 81 | Custom fields filter (after Labels) | PM, PjM | Process fields | ClickUp/Asana/Jira | Fields |
| 82 | Recurring issues / filter | F, PM | Retainers | ClickUp Recurring | Recurring |
| 83 | Time estimate + tracked on issue | F | Billing | ClickUp time fields | Time |
| 84 | Client-ready timesheet export | F | Get paid | ClickUp Timesheets | Time |
| 85 | Proposal → project one-click from template | F | Sales→delivery | Template kits | Templates |
| 86 | Retainer project template with recurring | F | Recurring revenue ops | Template kits | Templates |
| 87 | Client change-request form → CR queue | PjM | Scope creep | OPS Change | Change |
| 88 | Intake pending/accepted/declined tabs | PjM | Structured inbound | OPS Intake | Intake |
| 89 | Guest Shared-with-me only (no full tree) | F, PjM | Client overshare | ClickUp guest | Client |
| 90 | View-only vs editable guest types | F | Power honesty | ClickUp guest types | Client |
| 91 | Portal preview before publish | F, PjM | No surprise | CLIENT-PORTAL | Client |
| 92 | Per-ticket / per-milestone client visibility | F, PjM | Selective share | CLIENT-PORTAL | Client |
| 93 | Feedback from client → Triage | F, PM | External asks | Linear Asks **Business+** UI-VERIFIED — free Form/intake = advantage, not day-1 Business clone | Triage |
| 94 | Notification preferences that stick | All | Noise | Direct norms | Notify |
| 95 | @mention in issue comments that notifies | All | Collab baseline | Direct norms | Comments |
| 96 | Activity history that isn’t lost on refresh | All | Audit | Direct norms | Activity |
| 97 | Mobile-usable invite accept | All | Field join | UX-016 mobile | Invite |
| 98 | Offline-tolerant draft issue | F | Spotty net | Diff | Issues |
| 99 | SLA / due risk badge on overdue | PjM, F | Fire drills | Linear SLA **Business+** UI-VERIFIED — SHIP free risk badge, **AVOID** Business SLA day-1 | Due |
| 100 | One-click “copy filter link” affordance | All | Share ritual | URL exists — make obvious | Filters |
| 101 | Account B / org isolation that never leaks | All | Security desperation | Completeness | Isolation |
| 102 | Module Admin can reach needed settings | Admin | 80/80 still blocked settings:view | Tester | Admin |
| 103 | Passkey / SSO on login (match Directs) | All | Modern auth | Linear passkey · ClickUp SSO | Auth |
| 104 | Session expiry returns to same Build URL | All | Don’t orphan work | UX-001 | Auth |
| 105 | Cooldown between cycles (optional) | PM | Burnout / debt | Linear Cycles | Cycles |
| 106 | Capacity dial on upcoming cycle | PM | Overcommit | Linear capacity | Cycles |
| 107 | Free-forever core delivery without paywall traps on filters | F | Trust | ClickUp Business dashboards · Linear SLA/Asks/Code Intelligence **Business+** — don’t treat as day-1 | Pricing honesty |
| 108 | Map Form → Triage → Board in one guided path | F, PM | Intake→delivery | Forms+Triage | Activation |
| 109 | “What’s blocking me” saved view default | PM | Daily focus | Relations+Me | Views |
| 110 | Client portal magic-link expiry + rotate | F, PjM | Security | Guest norms | Client |

**Count:** 110 SHIP rows. After implement, each becomes a sellable reason. Prefer shipping **1–15 + 29–34 + 37–41** first for F/PM wow density.

**Linear deep packaging (2026-10-01):** SLAs / Asks / Code Intelligence = Business+ on free walk — Design SHIP free intake, free deadline honesty, free cycle chrome; **AVOID** Business+ as freelancer desperation. See `linear/UX-NOTES.md`.

**Jira deep packaging (2026-10-01):** Free team-managed walk — Plans empty shell; Releases/Versions/Components **absent** (routes→Details); Backlog 404; Sprints “Requires a backlog”; Forms not in settings nav; Reports CTA→404; Confluence Docs upsell empty; no payment opened. Design SHIP board/list/summary/automation loop + release **membership+filter** (UX-025) + program membership (UX-028) + free Form; **AVOID** company-managed depth / filled Plans / “match Releases module” as free/F day-1. See `jira/UX-NOTES.md`.
