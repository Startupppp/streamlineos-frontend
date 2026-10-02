# Surface Ledger Draft — StreamlineOS Build (Designer `D-`)
Access date: 2026-09-30 · Role: new Org Owner (Account A) · Viewport: 1280×800 desktop

## Account A
- Org: `PXC-Design-A-20260930` (VERIFIED)
- Name: PXC Designer A
- Email: `[REDACTED-TEST-EMAIL]` (Guerrilla Mail / sharklasers)
- Auth: email OTP only — no password (VERIFIED)
- Landing: `/dashboard` → Build at `/build`

## CI five (interim)

| # | Question | Call | Label |
|---|----------|------|-------|
| 1 | Build ≡ Projects, builder, or nav alias? | **Build OS** is a module switcher (Home OS ↔ Build OS). Inside Build: Projects / Products / Portfolios / Programs / Teams — classic delivery hierarchy. **Leans H-PM**, not Retool-style H-Builder from nav alone. | VERIFIED nav; INFERRED category |
| 2 | Where do homepage kanban/cycles/epics live? | Empty org — no project yet. Kanban/cycles/epics **UNTESTED** until first project created. | UNTESTED |
| 3 | Custom apps/pages/domains/roles/API in Build? | Not in primary nav. **Build settings** + **… More tools** + **Browse all Build** unexplored. | UNTESTED |
| 4 | Client/guest + import paths? | Not observed on empty Projects list. | UNTESTED |
| 5 | Free vs paid gates on Build? | Yellow trial banner: “Your trial ends in **14 days** — upgrade…”. Console: 401 billing entitlements, 402 dashboard executive. Build reachable on trial. | VERIFIED banner; INFERRED entitlement probes |

## Surfaces

### D-001 · Marketing home
- Route: `https://www.streamlineos.in/`
- Purpose: convert / explain suite (HR, CRM, Build, …)
- Status: VERIFIED (fetch)
- Evidence: WebFetch marketing copy; Build listed among apps

### D-002 · Build entry (auth wall)
- Route: `/build` → redirects to sign-in when unauthed
- Purpose: gated module entry
- Status: VERIFIED
- States: session-expired query `?session=expired&callbackUrl=…`

### D-003 · Sign in / create account
- Route: `/signin?session=expired&callbackUrl=%2Fsettings` (observed)
- Purpose: auth via Google or email OTP
- Primary action: Continue (email) / Google
- Fields: email; **no password**
- Feedback: “Your session expired. Sign in again to continue.”
- Trust: Privacy + Terms footer links
- Dialogs: none observed
- Mobile: UNTESTED
- Status: VERIFIED
- Evidence: signup computerUse pass

### D-004 · Org setup wizard
- Route: `/org-setup`
- Steps: Welcome → Basics → Launch
- Basics: goals (Build checked), Industry, full name*, Company*, Team size*, Country, Mobile*
- Launch: teammate invite email + role (default Member)
- CTAs: Start setup, I’ll set up later, Back, Continue, Build my organization
- Status: VERIFIED (happy path completed)

### D-005 · Home OS dashboard
- Route: `/dashboard`
- Purpose: suite home; setup checklist includes “Set up Build”
- Nav: Home, Inbox, Mail, Calendar, Chat, HR For Me items
- Empty/zero: Active Projects 0, My Open Tasks 0
- Notices: HR not enabled (red); 14-day trial banner
- Floating: ASK OS, capture utilities
- Status: VERIFIED
- Evidence: `D-dashboard.webp`

### D-006 · Build OS — All Projects (default)
- Route: `/build`
- Purpose: browse/manage all org projects
- Primary action: + New Project / Create your first project
- Nav IA: MY WORK (Inbox, Assigned, Drafts) · BUILD (Overview, Projects✓, Products, Portfolios, Programs, Teams, + Create, … More tools) · footer Build settings, Browse all Build
- Chrome: Build OS switcher, org chip, ⌘K search, + Create, bell (1), avatar
- Empty state: illustration + “No projects yet” + CTA
- Toolbar: Search projects, Filters, Display, Grid/List toggles
- Status: VERIFIED empty
- Evidence: `/workspace/streamlineos-ux/D-build.webp`
- Console (session): 401 billing entitlements; 402 dashboard executive; 404 `/api/build/46`

### D-007… · Overview / Products / Portfolios / Programs / Teams / Inbox / Assigned / Drafts / Build settings / More tools / project detail / create flows
- Status: UNTESTED — next dispatch

## Journeys (partial)
1. Public → Sign-in OTP → Org setup → Dashboard → Build Projects (empty) — VERIFIED end-to-end for Account A Owner
2. Create project → board/list → issue — UNTESTED
3. Invite teammate / role change — UNTESTED (Launch step UI seen, not executed with second account)
4. Upgrade / billing — UNTESTED (banner only)

## Design system notes (early, VERIFIED visual)
- Light gray/white chrome; black primary buttons; purple active nav rail
- Dense B2B IA; empty state is clear with single primary CTA
- Trial urgency banner persistent
- Module switcher “Home OS” / “Build OS” is distinctive pattern

## Update 2026-09-30 (deep-map pass 1)

### Invite (VERIFIED)
- Path: `/settings/users` → Members & access → Invite User
- To: `[REDACTED-TEST-EMAIL]` · Role: Member
- UI: “Invitation sent! The user will receive an email with instructions to join.”

### D-008 · Create project wizard (VERIFIED)
- Result: `PXC-Project-Alpha` key `PXA` at `/build/47`
- Steps: Basics → optional Project Type (skipped) → Blank Project template → default features on → Simple workflow → team PXC Designer A → Review & Create

### D-009 · Project landing `/build/47` (VERIFIED)
- Status cards: Open issues 0, Progress 0%, Overdue 0, Active cycle None, Health Not started
- Project sidebar: Issues, Backlog, Cycles, Releases, Updates, Files, **Client portal**
- Feature flags observed in create: kanban, epics, DevOps/CI, releases (exact labels from wizard)

### D-010 · Build Overview `/build/command-center` (VERIFIED)
- Populated: 1 project, 0 open issues/overdue; New CTA

### D-011 · Products `/build/managed-products` (VERIFIED empty)
- Empty + New product CTA

### BLOCKED
- Session expired mid-sidebar (at Portfolios). Remaining: Portfolios, Programs, Teams, Inbox, Assigned, Drafts, Build settings, More tools, Browse all Build, issue create, kanban columns, epic UI, import, domains/pages/API.

### CI five refresh
1. **H-PM preferred, strengthened** — project model = Issues/Backlog/Cycles/Releases/Client portal (classic delivery). Prior agent label “H-Builder” on these primitives was a mis-tag; treat as **H-PM VERIFIED**. H-Builder (custom apps builder) still **UNTESTED** pending settings/More tools.
2. Kanban/cycles/epics: **VERIFIED as project features**; Cycles in sidebar; kanban/epic UIs not opened yet.
3. Domains/pages/roles/API: **UNTESTED** (settings blocked by session).
4. Client portal: **VERIFIED named** in project sidebar; guest flows UNTESTED. Import UNTESTED.
5. Paid: trial banner only VERIFIED; upgrade not clicked.

## Update 2026-09-30 (deep-map pass 2 — Owner re-auth COMPLETE)

Role/email: Account A Owner · `[REDACTED-TEST-EMAIL]` · org `PXC-Design-A-20260930`

### Project interior `/build/47` (VERIFIED)
- Issue created: `PXC-Issue-1`
- Kanban: `/build/47/issues` Board = Todo / In progress / In review / Done; also List, Table, Calendar, Timeline, Workload
- Backlog: contains PXC-Issue-1
- Cycles: `/build/47/cycles` empty (“No cycles yet”)
- Epics: `/build/47/epics` empty but route exists
- Client portal: **unpublished**, no grants (publish/invite not touched)

### Settings / access / API (VERIFIED — CI item 3)
- `/build/settings/integrations`: Connections + Agent access; no repos; Add connection
- `/build/settings/access`: Roles, Members, Ownership; ownership = PXC Designer A
- `/settings/roles`: 44 roles, 0 custom, 1 assigned user, 764 permissions
- `/settings/organization`: email domains = “Any verified email”; **no dedicated Build domains/pages builder route**
- `/settings/api-tokens`: none; org/project webhooks none
- `/settings/billing`: Trial; invoices empty; upgrade not clicked
- `/build/47/settings`: General, Labels, Statuses, Custom Fields, Teams & Roster, Danger Zone

### More tools inventory (VERIFIED)
**Org-level Build:** Roadmap, Goals, Approvals, Templates, Client access, Members & access
**Project More tools:** Triage, Epics, Milestones, Workload, Meetings, Approvals, QA and tests, Incidents, Change requests, Intake, Chat, Wiki, Whiteboard, Agile reports, Budget, Risks, Decisions, Forms, Workflow, Modules, Automations, Webhooks

### Import (VERIFIED)
- Path: project Issues → Import / Export · CSV or JSON · dry-run supported

### CI five — CLOSED (Owner evidence)
| # | Answer | Label |
|---|--------|-------|
| 1 | **H-PM locked.** Delivery OS (Issues/Backlog/Cycles/Epics/Releases/Portfolios/Programs). No Retool-style custom app/page builder found. Workflow/Automations/Webhooks/Modules = automation depth inside PM, **not** H-Builder. | VERIFIED |
| 2 | Kanban at `/build/47/issues` Board; Cycles + Epics routes exist (empty). Marketing kanban lives **inside project Issues**, not homepage. | VERIFIED |
| 3 | Domains: org email-domain policy only. Pages: Wiki/Whiteboard/Forms exist as PM tools, not a page-builder. Roles: global 44 system roles + Build access. API: tokens + webhooks surfaces exist (empty). | VERIFIED |
| 4 | Client portal: named + unpublished empty. Client access in org More tools. Import: CSV/JSON dry-run. Guest flows = Tester. | VERIFIED named; guest UNTESTED |
| 5 | Trial plan in `/settings/billing`; 14-day banner; no pay clicked. | VERIFIED |

### UX friction notes (early, Owner)
- OTP-only + easy session expiry → trust/activation risk (matches CI Now theme 3)
- Empty states generally clear with primary CTA
- Dense More-tools catalog → discoverability/cognitive load risk
- Client portal unpublished by default → activation friction for guest wedge


## Completeness Wave Owner batch
See `SURFACE_LEDGER_COMPLETENESS_OWNER.md` (D-100…D-251).
