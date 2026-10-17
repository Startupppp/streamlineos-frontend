# ICP + Jobs-to-be-done — StreamlineOS Build
**Lane:** PM · **Updated:** 2026-10-01 (IST)  
**Sources:** `provisional-roadmap-v0.md`, CI Cut v2, Completeness Scope v2, Freeze v1, CI gap register (pre signed-in walks)  
**Positioning frame:** Suite-native delivery OS — win on **client-ready projects inside one OS**, not feature count vs Linear.

---

## Direct map (shared with CI)

| Slot | Product | Primary ICP fit | Why in set |
| --- | --- | --- | --- |
| Direct P0 | **Linear** | Product Manager (+ IC delivery) | Cycles, triage, issue chrome gold standard |
| Direct P0 | **ClickUp** | Freelancer + PM | Kitchen-sink work OS; forms/automations/templates gallery |
| Direct P0 | **Jira Cloud** | Project Manager (+ enterprise PM) | Releases, hierarchy/Plans, reports, role norms |
| Direct P1 | **monday.com** | Project Manager / agency | Boards, portfolio, guest patterns |
| Direct P1 | **Asana** | Freelancer / PM | Work mgmt clarity; My Work patterns |
| Suite secondary | **Zoho Projects** (+ Zoho One) | All three via suite buyer | Client/guest + suite attach; Build’s suite peer |
| Suite secondary | Odoo | Suite buyer | Same “OS including projects” job |
| Avoid chasing | JSM / Opsgenie / Xray depth | Ops niche | Surfaces exist in Build More-tools; eng **Not Now** until wedge works |

---

## ICP 1 — Freelancer (F)

### Who
Solo or micro-team (1–5) delivering client projects: agencies of one, indie consultants, boutique studios. Often India/APAC SMB attach via suite pricing. Buys for **speed to first project + trusted client share**, not enterprise ITSM.

### Jobs-to-be-done
1. When I win a client project, I want to stand up a board + tasks in minutes so I look organised without suite sprawl.
2. When the client asks “what’s done?”, I want a **read-only portal** (not a second Asana seat or endless PDF status).
3. When I reuse past work, I want templates / quick-start packs so I don’t rebuild every time.
4. When I invoice time, I want budget vs billable hours without a separate timesheet product (suite wedge).

### Pains (evidence-backed)
- Activation friction: OTP-only auth, invite accept blank (**BUG-001**), Build access missing after invite (**BUG-002**) — peers assume password/SSO + invite→workspace.
- Client grant false-success / no guest entry (**BUG-005/006**) — wedge dead today.
- More-tools density feels like ClickUp sprawl before core trust is earned (Design UX-010 / Not Now).
- Template gallery thin vs ClickUp (single custom template path VERIFIED; gallery BEHIND).

### Success metrics (proposed)
- TTF first project + first issue
- % trials that publish Client portal with ≥1 grant
- Invite→Build access success (cold path)
- Session-expiry abandon rate

### Why Build vs suite sprawl
One org-priced OS: Home ↔ Build, client portal named inside delivery, billing/HR adjacency later — vs stitching ClickUp + separate client tool + Zoho fragment. **Do not** win by matching ClickUp’s 20+ tool mega-menu.

### Direct mapping
| Need | Primary Directs | Build posture today |
| --- | --- | --- |
| Fast board + issues | ClickUp, Asana, Linear | Create project→issue **PARITY** (Owner) |
| Client visibility | Zoho Clients, ClickUp guests, monday guests, JSM portal | Shell **PARITY-seeking**; grant→guest **BEHIND** |
| Templates | ClickUp gallery | Create+apply **PARITY**; gallery **BEHIND** |
| Forms intake | ClickUp Forms | Surface + auto-draft quirk (**UX-032**); live public link unproven |
| Budget/time | Zoho Projects | Project Budget empty craft; org Budget **404** |

---

## ICP 2 — Product Manager (PM)

### Who
Product managers / eng leads in SMB–midmarket product teams (≈5–100 in Build). Care about cycles, triage, roadmap honesty, release membership, and clean collaborator roles — Linear-class delivery without leaving the suite.

### Jobs-to-be-done
1. When planning a cycle, I want Active/Current cycle chrome so the board shows what we’re shipping **now** (Linear Cycles depth).
2. When triage fills up, I want rules / clear empty→usable rituals, not a decorative empty panel.
3. When shipping, I want release membership and ship tracking (Jira Releases class).
4. When inviting ICs, I want **Member means create**, or an honest Viewer label — not silent view-only.
5. When reporting up, I want named reports I can create/run, not snapshot-only Agile shells.

### Pains (evidence-backed)
- Active cycle chrome missing after issue↔cycle link (**UX-024** / CW-004) — membership PARITY-seeking, discoverability BEHIND Linear.
- Triage empty with no rules CTA (**UX-029**).
- Release membership depth BEHIND (**UX-025**).
- Labels + Epic-relation filters missing (**UX-026/027**).
- Build Module Member: Projects list / CC counts 0 while on project (**CW-001**); no Create issue (**CW-002**) — BEHIND Linear/ClickUp/Jira collaborator norms.
- Auth OTP-only (**CI-060** / PM-004 class) vs password+SSO Directs.

### Success metrics (proposed)
- % projects with ≥1 active cycle used in board filter
- Invite→Member create-issue success
- Named report create/run rate
- Cycle time from first issue → first release membership

### Why Build vs suite sprawl
Same suite OS as finance/HR later; compete on **activation + client wedge + cycle honesty**, not cloning Linear’s visual ID or Jira’s SM suite.

### Direct mapping
| Need | Primary Directs | Build posture today |
| --- | --- | --- |
| Cycles | Linear | Link VERIFIED; active chrome **BEHIND** |
| Triage | Linear | Empty informational **BEHIND** rituals |
| Releases | Jira | Widgets empty / membership **BEHIND** |
| Multi-view issues | ClickUp, Jira | Board/List/Table/Timeline/Workload **PARITY** — protect |
| Filters (labels/epic) | Jira, ClickUp | Priority/type/assignee/cycle/due **OK**; labels/epic-rel **BEHIND** |
| Reports | Jira | Overview filled; named Create/Run **BEHIND** (**UX-030**) |

---

## ICP 3 — Project Manager (PjM)

### Who
Delivery / project managers in agencies, IT services, and midmarket PMO-ish teams. Optimise portfolio/programme hierarchy, milestones, approvals, workload, client-visible change control — monday/Jira/Asana class, often suite-attached (Zoho).

### Jobs-to-be-done
1. When running multiple clients, I want Portfolio → Program → Project membership that is real, not nest-only shells.
2. When tracking commitments, I want milestones linked to issues (and client-visible where granted).
3. When governance matters, I want approvals (task/milestone/release) and workload honesty.
4. When the client is external, I want portal publish/grant that cannot lie (no false-success).
5. When leadership asks for rollup, I want org-level reports and (eventually) org budget — without bouncing to a second PM suite.

### Pains (evidence-backed)
- Program↔project membership missing (**UX-028**); Portfolio↔project VERIFIED — hierarchy craft uneven.
- Milestone create VERIFIED; issue-link control missing (Milestones census).
- Client portal publish has no confirm while unpublish does (**UX-031**) — trust asymmetry.
- Org Budget 404; project Budget empty craft (Approvals-Budget).
- Ops surfaces (QA/Incidents/Change/Intake) exist as empty craft — **do not** roadmap-chase JSM/Xray before Freeze/wedge.

### Success metrics (proposed)
- Portfolio/program with ≥1 linked project used in weekly ritual
- Milestone↔issue link rate
- Client portal publish + grant success (zero false-success)
- Approval request→decision cycle time

### Why Build vs suite sprawl
PMO features inside the same OS the finance buyer already evaluates — vs Jira + Confluence + separate client tool, or monday + Zoho fragment. Hierarchy is a **suite + Jira/ClickUp parity play**, not a Linear play.

### Direct mapping
| Need | Primary Directs | Build posture today |
| --- | --- | --- |
| Portfolio / program | Jira Plans, ClickUp, monday | Surfaces + portfolio link **PARITY-seeking**; program membership **BEHIND** |
| Milestones | ClickUp, Zoho, Asana | Create **OK**; issue-link **BEHIND** |
| Approvals | Jira/JSM-ish, monday | Project+org Approvals craft **PARITY-seeking**; filled cycle UNKNOWN |
| Workload | Jira, ClickUp, monday | Filled metrics **PARITY-seeking** |
| Client portal | Zoho, JSM, monday guests | Chrome VERIFIED; grant→guest **BEHIND** |
| Change / intake | JSM, ClickUp Forms | Empty craft VERIFIED; eng niche **Not Now** |

---

## Cross-ICP decision rules

1. **Freeze first** — activation + Build role + client grant unblock all three ICPs.
2. **Wedge** — client portal is the clearest UNIQUE vs Linear; protect it in reason framing.
3. **Completeness Next** — cycles chrome, filters, reports, hierarchy membership, role honesty — not More-tools sprawl.
4. **Not Now** — QA/Incidents/Change depth vs Xray/JSM; mega-menu expansion; H-Builder.
