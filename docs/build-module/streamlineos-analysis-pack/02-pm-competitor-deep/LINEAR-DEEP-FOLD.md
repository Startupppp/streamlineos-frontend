# Linear deep fold — PM lane
**Walk:** 2026-10-01 (IST) · signed-in `tarunchintakunta` / team `TAR`  
**Scope:** Free-only, read-only UI inspection; no create, enable, save, share, upgrade, or purchase.  
**CI source:** `/workspace/streamlineos-ci/competitor-deep/linear/FEATURES.md`, `BUILD-GAPS.md`, `PAGE-INVENTORY.md`, `ACCOUNT.md`, `WALK-NOTES.json`

## UI-VERIFIED surfaces folded

The deep walk verified these 15 non-filter surfaces; the existing filter walk remains the source for `F-01`–`F-07`:

| Surface | Linear deep evidence |
| --- | --- |
| Inbox | `BG-08` · `evidence/inbox.png` |
| My Issues | `BG-09` · `evidence/my-issues.png` |
| Projects | `BG-10` · `evidence/projects.png` |
| Workspace / team Custom Views | `BG-11` · `evidence/views.png`, `custom-view-builder.png` |
| Team overview | `BG-13` · `evidence/team-overview.png` |
| Team Documents | `BG-13` · `evidence/team-documents.png` |
| Cycles | `BG-12` · `evidence/cycles.png` |
| Agent | `BG-14` · `evidence/agent.png` |
| GitHub | `BG-15` · `evidence/github-settings.png` |
| Integrations catalogue | `BG-21` · `evidence/integrations-catalog.png` |
| Issue / project templates | `BG-16` · `evidence/issue-templates.png` |
| Initiatives | `BG-17` · `evidence/initiatives.png` |
| Asks | `BG-19` · `evidence/asks.png` |
| SLAs | `BG-20` · `evidence/slas.png` |
| AI & Agents / Code Intelligence | `BG-22` · `evidence/ai-agents.png` |

**Route outcomes (not claims that Linear universally lacks these):**

- **Triage → All issues:** `/team/TAR/triage` redirected to `/team/TAR/all`; no separate queue or controls were exposed. Evidence: `evidence/triage-redirect-all-issues.png`.
- **Roadmap not found:** team Roadmap rendered Not found; workspace `/roadmap` redirected to Projects. No roadmap artifact was visible.
- **Insights not found:** `/insights` rendered Not found; analytics integrations were visible, but no native Insights page was exposed. Evidence: `evidence/not-found-insights-roadmap.png`.

## Free-tier gates / caveats for Aditya

- **SLAs:** explicitly Business/Enterprise; Add rule was disabled (`BG-20`).
- **Asks:** explicitly Business/Enterprise; only Start free trial was offered (`BG-19`).
- **Initiatives:** feature exists in settings, but **Enable Initiatives** was off; updates/schedules were inactive (`BG-17`). This is not an enabled initiative record.
- **Code Intelligence:** explicitly Business-only; Coding sessions were marked Available on Basic (`BG-22`).
- No paid CTA was activated and no paid capability was tested. Triage, Roadmap, and Insights observations are workspace/route outcomes, not universal plan claims.

## Concrete SHIP implications for Build

These are Completeness Next / later implications only; **Freeze v1 remains PM-011 → PM-002 → PM-001**. They describe validation or target behaviour, not capabilities Build already has.

| New SHIP note | CI SHIP evidence | Build implication |
| --- | --- | --- |
| Cycle chrome and cadence | `CI #7`, `CI #41`; Linear `BG-12` | Make the current cycle legible on overview/board, then validate repeat/rollover cadence. Do not infer cycle creation parity from Linear’s empty Cycles page. |
| Usable Triage ritual | `CI #8`, `CI #42`; Linear triage route outcome | Keep the target as accept/decline/duplicate/snooze plus rules CTA. The redirect is not evidence that Linear has no triage semantics. |
| Strategic Initiatives / roadmap decision | `CI #67`; Linear `BG-17` and Roadmap route outcome | Decide whether Build supplies a coherent free strategy layer or explicitly defers it; do not call the disabled Linear feature parity. |
| Native Insights | `CI #70`; Linear `BG-18` | Treat native measure/slice/share as a later SHIP target; do not claim Build has it because Linear’s route was Not found. |
| Durable named views | `CI #31`, `#37`, `#38`; Linear `BG-11` | Move beyond URL chips only if Build evidence supports it: named personal/shared views, with sharing/favourite behaviour validated separately. |
| Structured external intake | `CI #87`; Linear `BG-19` | Keep Asks/Feedback → Triage/backlog as a free-tier opportunity, while preserving the no-guest-seat framing; do not claim it is shipped. |
| Light SLA clocks | `CI #96`; Linear `BG-20` | Consider configurable deadlines and breach notifications after the wedge, with transparent free limits; do not imply current Build SLA support. |
| Free automation / integration seam | `CI #19`, `#20`; Linear `BG-15`, `BG-21` | Validate a small, safe automation/integration set with triggers and audit trail; the catalogue alone is not Build parity. |

